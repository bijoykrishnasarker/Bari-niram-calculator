// src/server.ts
import "dotenv/config";

// src/app.ts
import { createHash, randomUUID } from "crypto";

// ../../packages/shared/src/calculator.ts
import { z } from "zod";
var ConstructionTypeSchema = z.enum([
  "economy",
  "standard",
  "premium"
]);
var LocationSchema = z.enum(["dhaka", "chattogram", "other"]);
var CalculatorInputSchema = z.object({
  floorAreaSqFt: z.coerce.number().finite().min(100, "Floor area must be at least 100 sq ft").max(1e5, "Floor area is above the supported range"),
  floors: z.coerce.number().int().min(1, "At least one floor is required").max(100, "Floor count is above the supported range"),
  constructionType: ConstructionTypeSchema,
  location: LocationSchema
});
var CALCULATOR_RULES = {
  version: "homexbd-workbook-v1",
  currency: "BDT",
  baseRatePerSqFt: {
    economy: 3e3,
    standard: 3500,
    premium: 4500
  },
  locationMultiplier: {
    dhaka: 1.1,
    chattogram: 1.05,
    other: 1
  },
  costSplit: {
    structure: 0.5,
    finishing: 0.3,
    electrical: 0.1,
    plumbing: 0.1
  },
  estimateRangePerSqFt: {
    minimum: 3e3,
    maximum: 4500
  },
  potentialSavingsRate: 0.1,
  highBudgetThresholdBdt: 3e6
};
var money = (value) => Math.round(value);
function calculateHouseCost(rawInput) {
  const input = CalculatorInputSchema.parse(rawInput);
  const baseRatePerSqFt = CALCULATOR_RULES.baseRatePerSqFt[input.constructionType];
  const locationMultiplier = CALCULATOR_RULES.locationMultiplier[input.location];
  const effectiveRatePerSqFt = money(baseRatePerSqFt * locationMultiplier);
  const totalBuiltUpAreaSqFt = money(input.floorAreaSqFt * input.floors);
  const totalCost = money(totalBuiltUpAreaSqFt * effectiveRatePerSqFt);
  return {
    ruleVersion: CALCULATOR_RULES.version,
    currency: CALCULATOR_RULES.currency,
    totalBuiltUpAreaSqFt,
    baseRatePerSqFt,
    locationMultiplier,
    effectiveRatePerSqFt,
    totalCost,
    breakdown: {
      structure: money(totalCost * CALCULATOR_RULES.costSplit.structure),
      finishing: money(totalCost * CALCULATOR_RULES.costSplit.finishing),
      electrical: money(totalCost * CALCULATOR_RULES.costSplit.electrical),
      plumbing: money(totalCost * CALCULATOR_RULES.costSplit.plumbing)
    },
    estimatedMinimumCost: money(
      totalBuiltUpAreaSqFt * CALCULATOR_RULES.estimateRangePerSqFt.minimum
    ),
    estimatedMaximumCost: money(
      totalBuiltUpAreaSqFt * CALCULATOR_RULES.estimateRangePerSqFt.maximum
    ),
    potentialSavings: money(totalCost * CALCULATOR_RULES.potentialSavingsRate),
    budgetStatus: totalCost > CALCULATOR_RULES.highBudgetThresholdBdt ? "high" : "affordable"
  };
}

// ../../packages/shared/src/contracts.ts
import { z as z2 } from "zod";
var PREMIUM_PRICE_BDT = 99;
var PaymentSubmissionSchema = z2.object({
  amountBdt: z2.literal(PREMIUM_PRICE_BDT),
  senderLast4: z2.string().regex(
    /^\d{4}$/,
    "Enter exactly the last four digits of the sender number"
  )
});
var ProjectNameSchema = z2.string().trim().min(1).max(80);
var DeviceIdSchema = z2.string().min(32, "Device installation ID is too short").max(128, "Device installation ID is too long").regex(
  /^[A-Za-z0-9._:-]+$/,
  "Device installation ID contains invalid characters"
);
var PaymentStatusSchema = z2.enum(["pending", "approved", "rejected"]);

// src/app.ts
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { z as z3 } from "zod";

// src/cache.ts
var TtlCache = class {
  values = /* @__PURE__ */ new Map();
  async getOrLoad(key, ttlMs, loader) {
    const cached = this.values.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const value = await loader();
    this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }
  clear(key) {
    if (key) {
      this.values.delete(key);
      return;
    }
    this.values.clear();
  }
};

// src/errors.ts
import { ZodError } from "zod";
var ApiError = class extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }
  status;
  code;
  details;
};
var errorHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request contains invalid data.",
        details: error.issues,
        requestId: request.id
      }
    });
    return;
  }
  if (error instanceof ApiError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: request.id
      }
    });
    return;
  }
  request.log?.error({ err: error }, "Unhandled API error");
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId: request.id
    }
  });
};

// src/security.ts
import { createHmac, timingSafeEqual } from "crypto";
function hashDeviceId(deviceId, pepper) {
  return createHmac("sha256", pepper).update(deviceId).digest("hex");
}
function deviceHashesMatch(left, right) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

// src/app.ts
var DeviceLabelSchema = z3.object({
  label: z3.string().trim().min(1).max(80).optional()
});
var ProjectCreateSchema = z3.object({
  name: ProjectNameSchema,
  input: CalculatorInputSchema
});
var ReviewSchema = z3.object({
  note: z3.string().trim().max(500).optional()
});
var UuidSchema = z3.string().uuid();
function getBearerToken(request) {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new ApiError(401, "AUTH_REQUIRED", "Sign in is required.");
  }
  return match[1];
}
function requireUser(request) {
  if (!request.authUser) {
    throw new ApiError(401, "AUTH_REQUIRED", "Sign in is required.");
  }
  return request.authUser;
}
function getDeviceId(request) {
  const parsed = DeviceIdSchema.safeParse(request.get("x-device-id"));
  if (!parsed.success) {
    throw new ApiError(
      400,
      "DEVICE_ID_REQUIRED",
      "A valid installation device ID is required."
    );
  }
  return parsed.data;
}
function sendCacheableJson(request, response, payload, cacheControl) {
  const body = JSON.stringify(payload);
  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  response.set("Cache-Control", cacheControl);
  response.set("ETag", etag);
  if (request.get("if-none-match") === etag) {
    response.status(304).end();
    return;
  }
  response.type("application/json").send(body);
}
function createApp(dependencies) {
  const { auth, store, config } = dependencies;
  const app2 = express();
  const guideCache = new TtlCache();
  app2.disable("x-powered-by");
  app2.set("trust proxy", 1);
  app2.use(
    pinoHttp({
      logger: pino({
        level: config.environment === "test" ? "silent" : "info"
      }),
      genReqId: (request, response) => {
        const requestId = request.headers["x-request-id"]?.toString() ?? randomUUID();
        response.setHeader("x-request-id", requestId);
        return requestId;
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.x-device-id",
          "req.body.senderLast4",
          "req.body.sender_last4"
        ],
        censor: "[Redacted]"
      }
    })
  );
  app2.use(helmet());
  app2.use(
    cors({
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "authorization",
        "content-type",
        "if-none-match",
        "x-device-id",
        "x-request-id"
      ],
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(
          new ApiError(403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed.")
        );
      }
    })
  );
  app2.use(express.json({ limit: "16kb", strict: true }));
  const publicLimiter = rateLimit({
    windowMs: 6e4,
    limit: config.environment === "test" ? 1e4 : 120,
    standardHeaders: "draft-8",
    legacyHeaders: false
  });
  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 6e4,
    limit: config.environment === "test" ? 1e4 : 20,
    standardHeaders: "draft-8",
    legacyHeaders: false
  });
  const requireAuth = async (request, _response, next) => {
    try {
      request.authUser = await auth.verifyAccessToken(getBearerToken(request));
      next();
    } catch (error) {
      next(error);
    }
  };
  const noStore = (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  };
  const requireBoundDevice = async (request, _response, next) => {
    try {
      const user = requireUser(request);
      const suppliedHash = hashDeviceId(
        getDeviceId(request),
        config.deviceHashPepper
      );
      const binding = await store.getDeviceBinding(user.id);
      if (!binding?.active) {
        throw new ApiError(
          428,
          "DEVICE_NOT_BOUND",
          "Bind this installation before using premium features."
        );
      }
      if (!deviceHashesMatch(binding.deviceHash, suppliedHash)) {
        throw new ApiError(
          403,
          "DEVICE_MISMATCH",
          "This account is already bound to another device."
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
  const requirePremium = async (request, _response, next) => {
    try {
      const entitlement = await store.getEntitlement(requireUser(request).id);
      if (entitlement.plan !== "premium" || !entitlement.lifetime) {
        throw new ApiError(
          403,
          "PREMIUM_REQUIRED",
          "A verified lifetime premium entitlement is required."
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
  const requireAdmin = async (request, _response, next) => {
    try {
      const user = requireUser(request);
      if (!await store.isAdmin(user.id)) {
        throw new ApiError(
          403,
          "ADMIN_REQUIRED",
          "Administrator access is required."
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
  app2.get("/health", (_request, response) => {
    response.set("Cache-Control", "no-store");
    response.json({ status: "ok" });
  });
  app2.get("/v1/config", publicLimiter, (request, response) => {
    const validNumber = /^(?:\+?8801\d{9}|01\d{9})$/.test(
      config.bKashAccountNumber
    );
    sendCacheableJson(
      request,
      response,
      {
        calculatorRules: CALCULATOR_RULES,
        premium: {
          amountBdt: PREMIUM_PRICE_BDT,
          lifetime: true,
          paymentMethod: "bkash_manual",
          accountNumber: validNumber ? config.bKashAccountNumber : null,
          configured: validNumber
        }
      },
      "public, max-age=3600, stale-while-revalidate=86400"
    );
  });
  app2.post("/v1/calculator/estimate", publicLimiter, (request, response) => {
    const input = CalculatorInputSchema.parse(request.body);
    response.set("Cache-Control", "no-store");
    response.json({ input, result: calculateHouseCost(input) });
  });
  app2.get("/v1/guides/free", publicLimiter, async (request, response) => {
    const sections = await guideCache.getOrLoad(
      "free",
      5 * 6e4,
      () => store.getGuideSections(false)
    );
    sendCacheableJson(
      request,
      response,
      { sections },
      "public, max-age=300, stale-while-revalidate=3600"
    );
  });
  app2.post(
    "/v1/devices/bind",
    sensitiveLimiter,
    requireAuth,
    noStore,
    async (request, response) => {
      const user = requireUser(request);
      const deviceHash = hashDeviceId(
        getDeviceId(request),
        config.deviceHashPepper
      );
      const { label } = DeviceLabelSchema.parse(request.body ?? {});
      const binding = await store.bindDevice(
        user.id,
        deviceHash,
        label ?? null
      );
      if (!binding.active || !deviceHashesMatch(binding.deviceHash, deviceHash)) {
        throw new ApiError(
          409,
          "ACCOUNT_BOUND_TO_ANOTHER_DEVICE",
          "This account is already bound to another device. Ask support for a reset."
        );
      }
      response.status(200).json({ bound: true });
    }
  );
  app2.get("/v1/me", requireAuth, noStore, async (request, response) => {
    const user = requireUser(request);
    const [entitlement, binding, latestPayment] = await Promise.all([
      store.getEntitlement(user.id),
      store.getDeviceBinding(user.id),
      store.getLatestPaymentRequest(user.id)
    ]);
    response.json({
      user,
      entitlement,
      deviceBound: Boolean(binding?.active),
      latestPayment
    });
  });
  app2.get(
    "/v1/guides/premium",
    requireAuth,
    noStore,
    requireBoundDevice,
    requirePremium,
    async (_request, response) => {
      const sections = await guideCache.getOrLoad(
        "all",
        5 * 6e4,
        () => store.getGuideSections(true)
      );
      response.json({ sections });
    }
  );
  app2.post(
    "/v1/payments",
    sensitiveLimiter,
    requireAuth,
    noStore,
    requireBoundDevice,
    async (request, response) => {
      const user = requireUser(request);
      const entitlement = await store.getEntitlement(user.id);
      if (entitlement.plan === "premium" && entitlement.lifetime) {
        throw new ApiError(
          409,
          "ALREADY_PREMIUM",
          "This account already has lifetime premium access."
        );
      }
      const submission = PaymentSubmissionSchema.parse(request.body);
      const payment = await store.createPaymentRequest(
        user.id,
        submission.amountBdt,
        submission.senderLast4
      );
      response.status(202).json({ payment });
    }
  );
  app2.get(
    "/v1/payments/latest",
    requireAuth,
    noStore,
    requireBoundDevice,
    async (request, response) => {
      const payment = await store.getLatestPaymentRequest(
        requireUser(request).id
      );
      response.json({ payment });
    }
  );
  app2.get(
    "/v1/projects",
    requireAuth,
    noStore,
    requireBoundDevice,
    requirePremium,
    async (request, response) => {
      const projects = await store.listProjects(requireUser(request).id);
      response.json({ projects });
    }
  );
  app2.post(
    "/v1/projects",
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
        result
      );
      response.status(201).json({ project });
    }
  );
  app2.delete(
    "/v1/projects/:projectId",
    requireAuth,
    noStore,
    requireBoundDevice,
    requirePremium,
    async (request, response) => {
      const projectId = UuidSchema.parse(request.params.projectId);
      await store.deleteProject(requireUser(request).id, projectId);
      response.status(204).end();
    }
  );
  app2.get(
    "/v1/admin/payments",
    requireAuth,
    noStore,
    requireBoundDevice,
    requireAdmin,
    async (_request, response) => {
      response.json({ payments: await store.listPendingPayments() });
    }
  );
  app2.post(
    "/v1/admin/payments/:paymentId/approve",
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
        review.note ?? null
      );
      response.json({ payment });
    }
  );
  app2.post(
    "/v1/admin/payments/:paymentId/reject",
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
        review.note ?? null
      );
      response.json({ payment });
    }
  );
  app2.post(
    "/v1/admin/users/:userId/device/reset",
    sensitiveLimiter,
    requireAuth,
    noStore,
    requireBoundDevice,
    requireAdmin,
    async (request, response) => {
      const userId = UuidSchema.parse(request.params.userId);
      await store.resetDevice(userId, requireUser(request).id);
      response.status(204).end();
    }
  );
  app2.use((_request, _response, next) => {
    next(
      new ApiError(404, "NOT_FOUND", "The requested endpoint does not exist.")
    );
  });
  app2.use(errorHandler);
  return app2;
}

// src/env.ts
import { z as z4 } from "zod";
var EnvSchema = z4.object({
  NODE_ENV: z4.enum(["development", "test", "production"]).default("development"),
  PORT: z4.coerce.number().int().min(1).max(65535).default(4e3),
  CORS_ORIGINS: z4.string().default(""),
  SUPABASE_URL: z4.url(),
  SUPABASE_PUBLISHABLE_KEY: z4.string().min(20),
  SUPABASE_SECRET_KEY: z4.string().min(20),
  DEVICE_HASH_PEPPER: z4.string().min(32),
  BKASH_ACCOUNT_NUMBER: z4.string().trim().default("")
});
function loadEnvironment(source = process.env) {
  return EnvSchema.parse(source);
}
function parseCorsOrigins(value) {
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
}

// src/supabase.ts
import { createClient } from "@supabase/supabase-js";
function throwDatabaseError(error, fallback) {
  if (error.code === "23505") {
    throw new ApiError(409, "CONFLICT", fallback);
  }
  throw new ApiError(500, "DATABASE_ERROR", fallback, {
    code: error.code
  });
}
function mapPayment(row) {
  return {
    id: String(row.id),
    amountBdt: Number(row.amount_bdt),
    senderLast4: String(row.sender_last4),
    status: row.status,
    submittedAt: String(row.submitted_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewNote: row.review_note ? String(row.review_note) : null
  };
}
function mapGuide(row) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    titleBn: String(row.title_bn),
    bodyBn: Array.isArray(row.body_bn) ? row.body_bn.map((item) => String(item)) : [],
    sortOrder: Number(row.sort_order),
    accessTier: row.access_tier === "premium" ? "premium" : "free"
  };
}
function mapProject(row) {
  return {
    id: String(row.id),
    name: String(row.name),
    input: row.input,
    result: row.result,
    ruleVersion: String(row.rule_version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
var SupabaseAuthService = class {
  client;
  constructor(url, publishableKey) {
    this.client = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    });
  }
  async verifyAccessToken(accessToken) {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new ApiError(
        401,
        "INVALID_TOKEN",
        "The access token is invalid or expired."
      );
    }
    return {
      id: data.user.id,
      email: data.user.email ?? null
    };
  }
};
var SupabaseDataStore = class {
  client;
  constructor(url, secretKey) {
    this.client = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    });
  }
  async getDeviceBinding(userId) {
    const { data, error } = await this.client.from("device_bindings").select("device_hash, active").eq("user_id", userId).maybeSingle();
    if (error) {
      throwDatabaseError(error, "Could not read the device binding.");
    }
    if (!data) {
      return null;
    }
    return {
      deviceHash: String(data.device_hash),
      active: Boolean(data.active)
    };
  }
  async bindDevice(userId, deviceHash, label) {
    const existing = await this.getDeviceBinding(userId);
    if (existing?.active) {
      return existing;
    }
    if (existing) {
      const { data: data2, error: error2 } = await this.client.from("device_bindings").update({
        device_hash: deviceHash,
        device_label: label,
        active: true,
        bound_at: (/* @__PURE__ */ new Date()).toISOString(),
        reset_at: null,
        reset_by: null
      }).eq("user_id", userId).eq("active", false).select("device_hash, active").single();
      if (error2) {
        throwDatabaseError(
          error2,
          "This device is already attached to another account."
        );
      }
      return {
        deviceHash: String(data2.device_hash),
        active: Boolean(data2.active)
      };
    }
    const { data, error } = await this.client.from("device_bindings").insert({
      user_id: userId,
      device_hash: deviceHash,
      device_label: label
    }).select("device_hash, active").single();
    if (error) {
      if (error.code === "23505") {
        const racedBinding = await this.getDeviceBinding(userId);
        if (racedBinding) {
          return racedBinding;
        }
      }
      throwDatabaseError(
        error,
        "This device is already attached to another account."
      );
    }
    return {
      deviceHash: String(data.device_hash),
      active: Boolean(data.active)
    };
  }
  async resetDevice(userId, reviewerId) {
    const { data, error } = await this.client.from("device_bindings").update({
      active: false,
      reset_at: (/* @__PURE__ */ new Date()).toISOString(),
      reset_by: reviewerId
    }).eq("user_id", userId).eq("active", true).select("user_id").maybeSingle();
    if (error) {
      throwDatabaseError(error, "Could not reset the device binding.");
    }
    if (!data) {
      throw new ApiError(
        404,
        "DEVICE_NOT_FOUND",
        "No active device binding was found."
      );
    }
  }
  async getEntitlement(userId) {
    const { data, error } = await this.client.from("entitlements").select("plan, lifetime, premium_since").eq("user_id", userId).maybeSingle();
    if (error) {
      throwDatabaseError(error, "Could not read the entitlement.");
    }
    if (!data) {
      return { plan: "free", lifetime: false, premiumSince: null };
    }
    return {
      plan: data.plan === "premium" ? "premium" : "free",
      lifetime: Boolean(data.lifetime),
      premiumSince: data.premium_since ? String(data.premium_since) : null
    };
  }
  async createPaymentRequest(userId, amountBdt, senderLast4) {
    const { data, error } = await this.client.from("payment_requests").insert({
      user_id: userId,
      amount_bdt: amountBdt,
      sender_last4: senderLast4,
      status: "pending"
    }).select(
      "id, amount_bdt, sender_last4, status, submitted_at, reviewed_at, review_note"
    ).single();
    if (error) {
      throwDatabaseError(
        error,
        "A pending payment request already exists for this account."
      );
    }
    return mapPayment(data);
  }
  async getLatestPaymentRequest(userId) {
    const { data, error } = await this.client.from("payment_requests").select(
      "id, amount_bdt, sender_last4, status, submitted_at, reviewed_at, review_note"
    ).eq("user_id", userId).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
    if (error) {
      throwDatabaseError(error, "Could not read the latest payment request.");
    }
    return data ? mapPayment(data) : null;
  }
  async getGuideSections(includePremium) {
    let query = this.client.from("guide_sections").select("id, slug, title_bn, body_bn, sort_order, access_tier").order("sort_order", { ascending: true });
    if (!includePremium) {
      query = query.eq("access_tier", "free");
    }
    const { data, error } = await query;
    if (error) {
      throwDatabaseError(error, "Could not read the guide.");
    }
    return (data ?? []).map((row) => mapGuide(row));
  }
  async saveProject(userId, name, input, result) {
    const { data, error } = await this.client.from("projects").insert({
      user_id: userId,
      name,
      input,
      result,
      rule_version: result.ruleVersion
    }).select("id, name, input, result, rule_version, created_at, updated_at").single();
    if (error) {
      throwDatabaseError(error, "Could not save the project.");
    }
    return mapProject(data);
  }
  async listProjects(userId) {
    const { data, error } = await this.client.from("projects").select("id, name, input, result, rule_version, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    if (error) {
      throwDatabaseError(error, "Could not list saved projects.");
    }
    return (data ?? []).map((row) => mapProject(row));
  }
  async deleteProject(userId, projectId) {
    const { data, error } = await this.client.from("projects").delete().eq("id", projectId).eq("user_id", userId).select("id").maybeSingle();
    if (error) {
      throwDatabaseError(error, "Could not delete the project.");
    }
    if (!data) {
      throw new ApiError(
        404,
        "PROJECT_NOT_FOUND",
        "The project was not found."
      );
    }
  }
  async isAdmin(userId) {
    const { data, error } = await this.client.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    if (error) {
      throwDatabaseError(error, "Could not verify administrator access.");
    }
    return Boolean(data);
  }
  async listPendingPayments() {
    const { data, error } = await this.client.from("payment_requests").select(
      "id, user_id, amount_bdt, sender_last4, status, submitted_at, reviewed_at, review_note"
    ).eq("status", "pending").order("submitted_at", { ascending: true }).limit(200);
    if (error) {
      throwDatabaseError(error, "Could not read the payment review queue.");
    }
    const rows = data ?? [];
    const userIds = [...new Set(rows.map((row) => String(row.user_id)))];
    const emails = /* @__PURE__ */ new Map();
    if (userIds.length > 0) {
      const { data: profileRows, error: profileError } = await this.client.from("profiles").select("user_id, email").in("user_id", userIds);
      if (profileError) {
        throwDatabaseError(
          profileError,
          "Could not read payment account emails."
        );
      }
      for (const profile of profileRows ?? []) {
        emails.set(String(profile.user_id), String(profile.email));
      }
    }
    return rows.map((row) => ({
      ...mapPayment(row),
      userId: String(row.user_id),
      email: emails.get(String(row.user_id)) ?? null
    }));
  }
  async approvePayment(paymentId, reviewerId, note) {
    const { data, error } = await this.client.rpc("approve_payment_request", {
      p_payment_id: paymentId,
      p_reviewer_id: reviewerId,
      p_review_note: note
    });
    if (error) {
      if (error.code === "P0002") {
        throw new ApiError(
          404,
          "PAYMENT_NOT_PENDING",
          "The pending payment request was not found."
        );
      }
      throwDatabaseError(error, "Could not approve the payment request.");
    }
    return mapPayment(data);
  }
  async rejectPayment(paymentId, reviewerId, note) {
    const { data, error } = await this.client.from("payment_requests").update({
      status: "rejected",
      reviewed_at: (/* @__PURE__ */ new Date()).toISOString(),
      reviewed_by: reviewerId,
      review_note: note
    }).eq("id", paymentId).eq("status", "pending").select(
      "id, amount_bdt, sender_last4, status, submitted_at, reviewed_at, review_note"
    ).maybeSingle();
    if (error) {
      throwDatabaseError(error, "Could not reject the payment request.");
    }
    if (!data) {
      throw new ApiError(
        404,
        "PAYMENT_NOT_PENDING",
        "The pending payment request was not found."
      );
    }
    return mapPayment(data);
  }
};

// src/server.ts
var environment = loadEnvironment();
var app = createApp({
  auth: new SupabaseAuthService(
    environment.SUPABASE_URL,
    environment.SUPABASE_PUBLISHABLE_KEY
  ),
  store: new SupabaseDataStore(
    environment.SUPABASE_URL,
    environment.SUPABASE_SECRET_KEY
  ),
  config: {
    allowedOrigins: parseCorsOrigins(environment.CORS_ORIGINS),
    bKashAccountNumber: environment.BKASH_ACCOUNT_NUMBER,
    deviceHashPepper: environment.DEVICE_HASH_PEPPER,
    environment: environment.NODE_ENV
  }
});
if (!process.env.VERCEL) {
  const server = app.listen(environment.PORT, () => {
    console.info(`HomeXBD API listening on port ${environment.PORT}`);
  });
  const shutdown = (signal) => {
    console.info(`${signal} received; closing the HTTP server.`);
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
var server_default = app;
export {
  server_default as default
};
//# sourceMappingURL=server.js.map