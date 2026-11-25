import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  CALCULATOR_RULES,
  CalculatorInputSchema,
  DeviceIdSchema,
  PaymentSubmissionSchema,
  PREMIUM_PRICE_BDT,
  ProjectNameSchema,
  calculateHouseCost,
} from '@homexbd/shared';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { z } from 'zod';

import { TtlCache } from './cache.js';
import { loadEnvironment, parseCorsOrigins } from './env.js';
import { ApiError, errorHandler } from './errors.js';
import { deviceHashesMatch, hashDeviceId } from './security.js';
import { SupabaseAuthService, SupabaseDataStore } from './supabase.js';
import type { ApiDependencies, AuthUser } from './types.js';

const DeviceLabelSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
});

const ProjectCreateSchema = z.object({
  name: ProjectNameSchema,
  input: CalculatorInputSchema,
});

const ReviewSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

const UuidSchema = z.string().uuid();

function getBearerToken(request: Request): string {
  const authorization = request.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in is required.');
  }
  return match[1];
}

function requireUser(request: Request): AuthUser {
  if (!request.authUser) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in is required.');
  }
  return request.authUser;
}

function getDeviceId(request: Request): string {
  const parsed = DeviceIdSchema.safeParse(request.get('x-device-id'));
  if (!parsed.success) {
    throw new ApiError(
      400,
      'DEVICE_ID_REQUIRED',
      'A valid installation device ID is required.',
    );
  }
  return parsed.data;
}

function sendCacheableJson(
  request: Request,
  response: Response,
  payload: unknown,
  cacheControl: string,
): void {
  const body = JSON.stringify(payload);
  const etag = `"${createHash('sha256').update(body).digest('base64url')}"`;
  response.set('Cache-Control', cacheControl);
  response.set('ETag', etag);

  if (request.get('if-none-match') === etag) {
    response.status(304).end();
    return;
  }

  response.type('application/json').send(body);
}

export function createApp(dependencies: ApiDependencies) {
  const { auth, store, config } = dependencies;
  const app = express();
  const guideCache = new TtlCache<
    Awaited<ReturnType<typeof store.getGuideSections>>
  >();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    pinoHttp({
      logger: pino({
        level: config.environment === 'test' ? 'silent' : 'info',
      }),
      genReqId: (request, response) => {
        const requestId =
          request.headers['x-request-id']?.toString() ?? randomUUID();
        response.setHeader('x-request-id', requestId);
        return requestId;
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.x-device-id',
          'req.body.senderLast4',
          'req.body.sender_last4',
        ],
        censor: '[Redacted]',
      },
    }),
  );
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'authorization',
        'content-type',
        'if-none-match',
        'x-device-id',
        'x-request-id',
      ],
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(
          new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.'),
        );
      },
    }),
  );
  app.use(express.json({ limit: '16kb', strict: true }));

  const publicLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.environment === 'test' ? 10_000 : 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: config.environment === 'test' ? 10_000 : 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  const requireAuth: RequestHandler = async (request, _response, next) => {
    try {
      request.authUser = await auth.verifyAccessToken(getBearerToken(request));
      next();
    } catch (error) {
      next(error);
    }
  };

  const noStore: RequestHandler = (_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  };

  const requireBoundDevice: RequestHandler = async (
    request,
    _response,
    next,
  ) => {
    try {
      const user = requireUser(request);
      const suppliedHash = hashDeviceId(
        getDeviceId(request),
        config.deviceHashPepper,
      );
      const binding = await store.getDeviceBinding(user.id);

      if (!binding?.active) {
        throw new ApiError(
          428,
          'DEVICE_NOT_BOUND',
          'Bind this installation before using premium features.',
        );
      }

      if (!deviceHashesMatch(binding.deviceHash, suppliedHash)) {
        throw new ApiError(
          403,
          'DEVICE_MISMATCH',
          'This account is already bound to another device.',
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };

  const requirePremium: RequestHandler = async (request, _response, next) => {
    try {
      const entitlement = await store.getEntitlement(requireUser(request).id);
      if (entitlement.plan !== 'premium' || !entitlement.lifetime) {
        throw new ApiError(
          403,
          'PREMIUM_REQUIRED',
          'A verified lifetime premium entitlement is required.',
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };

  const requireAdmin: RequestHandler = async (request, _response, next) => {
    try {
      const user = requireUser(request);
      if (!(await store.isAdmin(user.id))) {
        throw new ApiError(
          403,
          'ADMIN_REQUIRED',
          'Administrator access is required.',
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };

  function resolvePreviewHtml(): string | null {
    const candidates = [
      path.resolve(process.cwd(), 'preview.html'),
      path.resolve(process.cwd(), '..', '..', 'preview.html'),
      path.resolve(process.cwd(), '..', 'preview.html'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  app.get('/', (request, response) => {
    response.set('Cache-Control', 'no-store');
    const accept = request.headers.accept || '';
    if (accept.includes('text/html') && !accept.includes('application/json')) {
      const htmlFile = resolvePreviewHtml();
      if (htmlFile) {
        const content = fs.readFileSync(htmlFile, 'utf8');
        response.type('html').send(content);
        return;
      }
    }
    response.json({
      name: 'HomeXBD API',
      status: 'ok',
      version: '0.1.0',
    });
  });

  app.get(['/app', '/preview', '/admin'], (_request, response) => {
    response.set('Cache-Control', 'no-store');
    const htmlFile = resolvePreviewHtml();
    if (htmlFile) {
      const content = fs.readFileSync(htmlFile, 'utf8');
      response.type('html').send(content);
      return;
    }
    response.redirect('/');
  });

  app.get('/health', (_request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json({ status: 'ok' });
  });

  app.get('/v1/config', publicLimiter, (request, response) => {
    const validNumber = /^(?:\+?8801\d{9}|01\d{9})$/.test(
      config.bKashAccountNumber,
    );
    sendCacheableJson(
      request,
      response,
      {
        calculatorRules: CALCULATOR_RULES,
        premium: {
          amountBdt: PREMIUM_PRICE_BDT,
          lifetime: true,
          paymentMethod: 'bkash_manual',
          accountNumber: validNumber ? config.bKashAccountNumber : null,
          configured: validNumber,
        },
      },
      'public, max-age=3600, stale-while-revalidate=86400',
    );
  });

  app.post('/v1/calculator/estimate', publicLimiter, (request, response) => {
    const input = CalculatorInputSchema.parse(request.body);
    response.set('Cache-Control', 'no-store');
    response.json({ input, result: calculateHouseCost(input) });
  });

  app.get('/v1/guides/free', publicLimiter, async (request, response) => {
    const sections = await guideCache.getOrLoad('free', 5 * 60_000, () =>
      store.getGuideSections(false),
    );
    sendCacheableJson(
      request,
      response,
      { sections },
      'public, max-age=300, stale-while-revalidate=3600',
    );
  });

  app.post(
    '/v1/devices/bind',
    sensitiveLimiter,
    requireAuth,
    noStore,
    async (request, response) => {
      const user = requireUser(request);
      const deviceHash = hashDeviceId(
        getDeviceId(request),
        config.deviceHashPepper,
      );
      const { label } = DeviceLabelSchema.parse(request.body ?? {});
      const binding = await store.bindDevice(
        user.id,
        deviceHash,
        label ?? null,
      );

      if (
        !binding.active ||
        !deviceHashesMatch(binding.deviceHash, deviceHash)
      ) {
        throw new ApiError(
          409,
          'ACCOUNT_BOUND_TO_ANOTHER_DEVICE',
          'This account is already bound to another device. Ask support for a reset.',
        );
      }

      response.status(200).json({ bound: true });
    },
  );

  app.get('/v1/me', requireAuth, noStore, async (request, response) => {
    const user = requireUser(request);
    const [entitlement, binding, latestPayment] = await Promise.all([
      store.getEntitlement(user.id),
      store.getDeviceBinding(user.id),
      store.getLatestPaymentRequest(user.id),
    ]);
    response.json({
      user,
      entitlement,
      deviceBound: Boolean(binding?.active),
      latestPayment,
    });
  });

  app.get(
    '/v1/guides/premium',
    requireAuth,
    noStore,
    requireBoundDevice,
    requirePremium,
    async (_request, response) => {
      const sections = await guideCache.getOrLoad('all', 5 * 60_000, () =>
        store.getGuideSections(true),
      );
      response.json({ sections });
    },
  );

  app.post(
    '/v1/payments',
    sensitiveLimiter,
    requireAuth,
    noStore,
    requireBoundDevice,
    async (request, response) => {
      const user = requireUser(request);
      const entitlement = await store.getEntitlement(user.id);
      if (entitlement.plan === 'premium' && entitlement.lifetime) {
        throw new ApiError(
          409,
          'ALREADY_PREMIUM',
          'This account already has lifetime premium access.',
        );
      }

      const submission = PaymentSubmissionSchema.parse(request.body);
      const payment = await store.createPaymentRequest(
        user.id,
        submission.amountBdt,
        submission.senderLast4,
      );
      response.status(202).json({ payment });
    },
  );

  app.get(
    '/v1/payments/latest',
    requireAuth,
    noStore,
    requireBoundDevice,
    async (request, response) => {
      const payment = await store.getLatestPaymentRequest(
        requireUser(request).id,
      );
      response.json({ payment });
    },
  );

  app.get(
    '/v1/projects',
    requireAuth,
    noStore,
    requireBoundDevice,
    requirePremium,
    async (request, response) => {
      const projects = await store.listProjects(requireUser(request).id);
      response.json({ projects });
    },
  );

  app.post(
    '/v1/projects',
    requireAuth,
    noStore,
    requireBoundDevice,
    requirePremium,
    async (request, response) => {
      const user = requireUser(request);
      const input = ProjectCreateSchema.parse(request.body);
      const result = calculateHouseCost(input.input);
      const project = await store.saveProject(
        user.id,
        input.name,
        input.input,
        result,
      );
      response.status(201).json({ project });
    },
  );

  app.delete(
    '/v1/projects/:projectId',
    requireAuth,
    noStore,
    requireBoundDevice,
    requirePremium,
    async (request, response) => {
      const projectId = UuidSchema.parse(request.params.projectId);
      await store.deleteProject(requireUser(request).id, projectId);
      response.status(204).end();
    },
  );

  app.get(
    '/v1/admin/payments',
    requireAuth,
    noStore,
    requireBoundDevice,
    requireAdmin,
    async (_request, response) => {
      response.json({ payments: await store.listPendingPayments() });
    },
  );

  app.post(
    '/v1/admin/payments/:paymentId/approve',
    sensitiveLimiter,
    requireAuth,
    noStore,
    requireBoundDevice,
    requireAdmin,
    async (request, response) => {
      const paymentId = UuidSchema.parse(request.params.paymentId);
      const review = ReviewSchema.parse(request.body ?? {});
      const payment = await store.approvePayment(
        paymentId,
        requireUser(request).id,
        review.note ?? null,
      );
      response.json({ payment });
    },
  );

  app.post(
    '/v1/admin/payments/:paymentId/reject',
    sensitiveLimiter,
    requireAuth,
    noStore,
    requireBoundDevice,
    requireAdmin,
    async (request, response) => {
      const paymentId = UuidSchema.parse(request.params.paymentId);
      const review = ReviewSchema.parse(request.body ?? {});
      const payment = await store.rejectPayment(
        paymentId,
        requireUser(request).id,
        review.note ?? null,
      );
      response.json({ payment });
    },
  );

  app.post(
    '/v1/admin/users/:userId/device/reset',
    sensitiveLimiter,
    requireAuth,
    noStore,
    requireBoundDevice,
    requireAdmin,
    async (request, response) => {
      const userId = UuidSchema.parse(request.params.userId);
      await store.resetDevice(userId, requireUser(request).id);
      response.status(204).end();
    },
  );

  app.use((_request, _response, next) => {
    next(
      new ApiError(404, 'NOT_FOUND', 'The requested endpoint does not exist.'),
    );
  });
  app.use(errorHandler);

  return app;
}

export function asyncMiddleware(
  handler: (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => Promise<void>,
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

let defaultAppInstance: express.Express | null = null;
let initError: Error | null = null;

export function getOrInitDefaultApp(): express.Express {
  if (defaultAppInstance) return defaultAppInstance;
  if (initError) throw initError;

  try {
    const environment = loadEnvironment();
    defaultAppInstance = createApp({
      auth: new SupabaseAuthService(
        environment.SUPABASE_URL,
        environment.SUPABASE_PUBLISHABLE_KEY,
      ),
      store: new SupabaseDataStore(
        environment.SUPABASE_URL,
        environment.SUPABASE_SECRET_KEY,
      ),
      config: {
        allowedOrigins: parseCorsOrigins(environment.CORS_ORIGINS),
        bKashAccountNumber: environment.BKASH_ACCOUNT_NUMBER,
        deviceHashPepper: environment.DEVICE_HASH_PEPPER,
        environment: environment.NODE_ENV,
      },
    });
    return defaultAppInstance;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    throw initError;
  }
}

const defaultHandler: RequestHandler = (req, res, next) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    req.url = req.url.slice(4) || '/';
  }
  try {
    const app = getOrInitDefaultApp();
    return app(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: 'SERVER_CONFIGURATION_ERROR',
      message,
      hint: 'Please ensure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, and DEVICE_HASH_PEPPER are set in Vercel Environment Variables and redeployed.',
    });
  }
};

export default defaultHandler;
