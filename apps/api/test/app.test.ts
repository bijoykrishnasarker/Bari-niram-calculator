import type {
  CalculatorInput,
  CalculatorResult,
  Entitlement,
  GuideSection,
  PaymentRequest,
} from '@homexbd/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { hashDeviceId } from '../src/security';
import type {
  AdminPaymentRequest,
  AuthService,
  DataStore,
  DeviceBinding,
  SavedProject,
} from '../src/types';

const pepper = 'test-pepper-that-is-longer-than-thirty-two-characters';
const deviceId = 'fbb398dd-ff7c-4b19-b1ee-38d9711261e8';

class FakeAuth implements AuthService {
  async verifyAccessToken(token: string) {
    if (token !== 'good-token') {
      throw new Error('bad token');
    }
    return {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
    };
  }
}

class FakeStore implements DataStore {
  binding: DeviceBinding | null = null;
  entitlement: Entitlement = {
    plan: 'free',
    lifetime: false,
    premiumSince: null,
  };
  latestPayment: PaymentRequest | null = null;

  async getDeviceBinding() {
    return this.binding;
  }

  async bindDevice(_userId: string, deviceHash: string) {
    this.binding ??= { deviceHash, active: true };
    return this.binding;
  }

  async resetDevice() {
    this.binding = null;
  }

  async getEntitlement() {
    return this.entitlement;
  }

  async createPaymentRequest(
    _userId: string,
    amountBdt: number,
    senderLast4: string,
  ) {
    this.latestPayment = {
      id: '22222222-2222-4222-8222-222222222222',
      amountBdt,
      senderLast4,
      status: 'pending',
      submittedAt: new Date(0).toISOString(),
      reviewedAt: null,
      reviewNote: null,
    };
    return this.latestPayment;
  }

  async getLatestPaymentRequest() {
    return this.latestPayment;
  }

  async getGuideSections(): Promise<GuideSection[]> {
    return [];
  }

  async saveProject(
    _userId: string,
    name: string,
    input: CalculatorInput,
    result: CalculatorResult,
  ): Promise<SavedProject> {
    return {
      id: '33333333-3333-4333-8333-333333333333',
      name,
      input,
      result,
      ruleVersion: result.ruleVersion,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
  }

  async listProjects(): Promise<SavedProject[]> {
    return [];
  }

  async deleteProject(): Promise<void> {}

  async isAdmin(): Promise<boolean> {
    return false;
  }

  async listPendingPayments(): Promise<AdminPaymentRequest[]> {
    return [];
  }

  async approvePayment(): Promise<PaymentRequest> {
    throw new Error('not used');
  }

  async rejectPayment(): Promise<PaymentRequest> {
    throw new Error('not used');
  }
}

describe('HomeXBD API', () => {
  let store: FakeStore;

  beforeEach(() => {
    store = new FakeStore();
  });

  function app() {
    return createApp({
      auth: new FakeAuth(),
      store,
      config: {
        allowedOrigins: ['http://localhost:8081'],
        bKashAccountNumber: '01712345678',
        deviceHashPepper: pepper,
        environment: 'test',
      },
    });
  }

  it('returns health check on root and /health', async () => {
    const rootRes = await request(app()).get('/').expect(200);
    expect(rootRes.body).toMatchObject({ status: 'ok', name: 'HomeXBD API' });

    const healthRes = await request(app()).get('/health').expect(200);
    expect(healthRes.body).toEqual({ status: 'ok' });
  });

  it('returns cacheable public configuration without secrets', async () => {
    const response = await request(app()).get('/v1/config').expect(200);

    expect(response.headers['cache-control']).toContain('public');
    expect(response.headers.etag).toBeTruthy();
    expect(response.body.premium).toEqual(
      expect.objectContaining({ amountBdt: 99, configured: true }),
    );
    expect(JSON.stringify(response.body)).not.toContain(pepper);
  });

  it('calculates the workbook example on the API', async () => {
    const response = await request(app())
      .post('/v1/calculator/estimate')
      .send({
        floorAreaSqFt: 100,
        floors: 2,
        constructionType: 'standard',
        location: 'dhaka',
      })
      .expect(200);

    expect(response.body.result.totalCost).toBe(770_000);
    expect(response.body.result.effectiveRatePerSqFt).toBe(3_850);
  });

  it('requires authentication for payment submission', async () => {
    await request(app())
      .post('/v1/payments')
      .set('x-device-id', deviceId)
      .send({ amountBdt: 99, senderLast4: '1234' })
      .expect(401);
  });

  it('binds one device and accepts a valid manual payment claim', async () => {
    await request(app())
      .post('/v1/devices/bind')
      .set('authorization', 'Bearer good-token')
      .set('x-device-id', deviceId)
      .send({ label: 'Test phone' })
      .expect(200);

    const response = await request(app())
      .post('/v1/payments')
      .set('authorization', 'Bearer good-token')
      .set('x-device-id', deviceId)
      .send({ amountBdt: 99, senderLast4: '0123' })
      .expect(202);

    expect(response.body.payment).toEqual(
      expect.objectContaining({
        amountBdt: 99,
        senderLast4: '0123',
        status: 'pending',
      }),
    );
  });

  it('rejects a different device after binding', async () => {
    store.binding = {
      active: true,
      deviceHash: hashDeviceId(deviceId, pepper),
    };

    const response = await request(app())
      .post('/v1/payments')
      .set('authorization', 'Bearer good-token')
      .set('x-device-id', '319d4d54-8a56-45ba-a2a6-51a5cddce46f')
      .send({ amountBdt: 99, senderLast4: '1234' })
      .expect(403);

    expect(response.body.error.code).toBe('DEVICE_MISMATCH');
  });

  it('rejects any amount other than 99 BDT', async () => {
    store.binding = {
      active: true,
      deviceHash: hashDeviceId(deviceId, pepper),
    };

    const response = await request(app())
      .post('/v1/payments')
      .set('authorization', 'Bearer good-token')
      .set('x-device-id', deviceId)
      .send({ amountBdt: 100, senderLast4: '1234' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
