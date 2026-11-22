import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CalculatorInput,
  CalculatorResult,
  Entitlement,
  GuideSection,
  PaymentRequest,
  PaymentStatus,
} from '@homexbd/shared';

import { ApiError } from './errors';
import type {
  AdminPaymentRequest,
  AuthService,
  AuthUser,
  DataStore,
  DeviceBinding,
  SavedProject,
} from './types';

type DatabaseError = {
  code?: string;
  message?: string;
  details?: string;
};

function throwDatabaseError(error: DatabaseError, fallback: string): never {
  if (error.code === '23505') {
    throw new ApiError(409, 'CONFLICT', fallback);
  }

  throw new ApiError(500, 'DATABASE_ERROR', fallback, {
    code: error.code,
  });
}

function mapPayment(row: Record<string, unknown>): PaymentRequest {
  return {
    id: String(row.id),
    amountBdt: Number(row.amount_bdt),
    senderLast4: String(row.sender_last4),
    status: row.status as PaymentStatus,
    submittedAt: String(row.submitted_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewNote: row.review_note ? String(row.review_note) : null,
  };
}

function mapGuide(row: Record<string, unknown>): GuideSection {
  return {
    id: String(row.id),
    slug: String(row.slug),
    titleBn: String(row.title_bn),
    bodyBn: Array.isArray(row.body_bn)
      ? row.body_bn.map((item) => String(item))
      : [],
    sortOrder: Number(row.sort_order),
    accessTier: row.access_tier === 'premium' ? 'premium' : 'free',
  };
}

function mapProject(row: Record<string, unknown>): SavedProject {
  return {
    id: String(row.id),
    name: String(row.name),
    input: row.input as CalculatorInput,
    result: row.result as CalculatorResult,
    ruleVersion: String(row.rule_version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class SupabaseAuthService implements AuthService {
  private readonly client: SupabaseClient;

  constructor(url: string, publishableKey: string) {
    this.client = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  async verifyAccessToken(accessToken: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new ApiError(
        401,
        'INVALID_TOKEN',
        'The access token is invalid or expired.',
      );
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  }
}

export class SupabaseDataStore implements DataStore {
  private readonly client: SupabaseClient;

  constructor(url: string, secretKey: string) {
    this.client = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  async getDeviceBinding(userId: string): Promise<DeviceBinding | null> {
    const { data, error } = await this.client
      .from('device_bindings')
      .select('device_hash, active')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throwDatabaseError(error, 'Could not read the device binding.');
    }

    if (!data) {
      return null;
    }

    return {
      deviceHash: String(data.device_hash),
      active: Boolean(data.active),
    };
  }

  async bindDevice(
    userId: string,
    deviceHash: string,
    label: string | null,
  ): Promise<DeviceBinding> {
    const existing = await this.getDeviceBinding(userId);
    if (existing?.active) {
      return existing;
    }

    if (existing) {
      const { data, error } = await this.client
        .from('device_bindings')
        .update({
          device_hash: deviceHash,
          device_label: label,
          active: true,
          bound_at: new Date().toISOString(),
          reset_at: null,
          reset_by: null,
        })
        .eq('user_id', userId)
        .eq('active', false)
        .select('device_hash, active')
        .single();

      if (error) {
        throwDatabaseError(
          error,
          'This device is already attached to another account.',
        );
      }

      return {
        deviceHash: String(data.device_hash),
        active: Boolean(data.active),
      };
    }

    const { data, error } = await this.client
      .from('device_bindings')
      .insert({
        user_id: userId,
        device_hash: deviceHash,
        device_label: label,
      })
      .select('device_hash, active')
      .single();

    if (error) {
      if (error.code === '23505') {
        const racedBinding = await this.getDeviceBinding(userId);
        if (racedBinding) {
          return racedBinding;
        }
      }

      throwDatabaseError(
        error,
        'This device is already attached to another account.',
      );
    }

    return {
      deviceHash: String(data.device_hash),
      active: Boolean(data.active),
    };
  }

  async resetDevice(userId: string, reviewerId: string): Promise<void> {
    const { data, error } = await this.client
      .from('device_bindings')
      .update({
        active: false,
        reset_at: new Date().toISOString(),
        reset_by: reviewerId,
      })
      .eq('user_id', userId)
      .eq('active', true)
      .select('user_id')
      .maybeSingle();

    if (error) {
      throwDatabaseError(error, 'Could not reset the device binding.');
    }

    if (!data) {
      throw new ApiError(
        404,
        'DEVICE_NOT_FOUND',
        'No active device binding was found.',
      );
    }
  }

  async getEntitlement(userId: string): Promise<Entitlement> {
    const { data, error } = await this.client
      .from('entitlements')
      .select('plan, lifetime, premium_since')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throwDatabaseError(error, 'Could not read the entitlement.');
    }

    if (!data) {
      return { plan: 'free', lifetime: false, premiumSince: null };
    }

    return {
      plan: data.plan === 'premium' ? 'premium' : 'free',
      lifetime: Boolean(data.lifetime),
      premiumSince: data.premium_since ? String(data.premium_since) : null,
    };
  }

  async createPaymentRequest(
    userId: string,
    amountBdt: number,
    senderLast4: string,
  ): Promise<PaymentRequest> {
    const { data, error } = await this.client
      .from('payment_requests')
      .insert({
        user_id: userId,
        amount_bdt: amountBdt,
        sender_last4: senderLast4,
        status: 'pending',
      })
      .select(
        'id, amount_bdt, sender_last4, status, submitted_at, reviewed_at, review_note',
      )
      .single();

    if (error) {
      throwDatabaseError(
        error,
        'A pending payment request already exists for this account.',
      );
    }

    return mapPayment(data);
  }

  async getLatestPaymentRequest(
    userId: string,
  ): Promise<PaymentRequest | null> {
    const { data, error } = await this.client
      .from('payment_requests')
      .select(
        'id, amount_bdt, sender_last4, status, submitted_at, reviewed_at, review_note',
      )
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throwDatabaseError(error, 'Could not read the latest payment request.');
    }

    return data ? mapPayment(data) : null;
  }

  async getGuideSections(includePremium: boolean): Promise<GuideSection[]> {
    let query = this.client
      .from('guide_sections')
      .select('id, slug, title_bn, body_bn, sort_order, access_tier')
      .order('sort_order', { ascending: true });

    if (!includePremium) {
      query = query.eq('access_tier', 'free');
    }

    const { data, error } = await query;
    if (error) {
      throwDatabaseError(error, 'Could not read the guide.');
    }

    return (data ?? []).map((row) => mapGuide(row));
  }

  async saveProject(
    userId: string,
    name: string,
    input: CalculatorInput,
    result: CalculatorResult,
  ): Promise<SavedProject> {
    const { data, error } = await this.client
      .from('projects')
      .insert({
        user_id: userId,
        name,
        input,
        result,
        rule_version: result.ruleVersion,
      })
      .select('id, name, input, result, rule_version, created_at, updated_at')
      .single();

    if (error) {
      throwDatabaseError(error, 'Could not save the project.');
    }

    return mapProject(data);
  }

  async listProjects(userId: string): Promise<SavedProject[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('id, name, input, result, rule_version, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throwDatabaseError(error, 'Could not list saved projects.');
    }

    return (data ?? []).map((row) => mapProject(row));
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const { data, error } = await this.client
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      throwDatabaseError(error, 'Could not delete the project.');
    }

    if (!data) {
      throw new ApiError(
        404,
        'PROJECT_NOT_FOUND',
        'The project was not found.',
      );
    }
  }

  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throwDatabaseError(error, 'Could not verify administrator access.');
    }

    return Boolean(data);
  }

  async listPendingPayments(): Promise<AdminPaymentRequest[]> {
    const { data, error } = await this.client
      .from('payment_requests')
      .select(
        'id, user_id, amount_bdt, sender_last4, status, submitted_at, reviewed_at, review_note',
      )
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
      .limit(200);

    if (error) {
      throwDatabaseError(error, 'Could not read the payment review queue.');
    }

    const rows = data ?? [];
    const userIds = [...new Set(rows.map((row) => String(row.user_id)))];
    const emails = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profileRows, error: profileError } = await this.client
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      if (profileError) {
        throwDatabaseError(
          profileError,
          'Could not read payment account emails.',
        );
      }

      for (const profile of profileRows ?? []) {
        emails.set(String(profile.user_id), String(profile.email));
      }
    }

    return rows.map((row) => ({
      ...mapPayment(row),
      userId: String(row.user_id),
      email: emails.get(String(row.user_id)) ?? null,
    }));
  }

  async approvePayment(
    paymentId: string,
    reviewerId: string,
    note: string | null,
  ): Promise<PaymentRequest> {
    const { data, error } = await this.client.rpc('approve_payment_request', {
      p_payment_id: paymentId,
      p_reviewer_id: reviewerId,
      p_review_note: note,
    });

    if (error) {
      if (error.code === 'P0002') {
        throw new ApiError(
          404,
          'PAYMENT_NOT_PENDING',
          'The pending payment request was not found.',
        );
      }
      throwDatabaseError(error, 'Could not approve the payment request.');
    }

    return mapPayment(data as Record<string, unknown>);
  }

  async rejectPayment(
    paymentId: string,
    reviewerId: string,
    note: string | null,
  ): Promise<PaymentRequest> {
    const { data, error } = await this.client
      .from('payment_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        review_note: note,
      })
      .eq('id', paymentId)
      .eq('status', 'pending')
      .select(
        'id, amount_bdt, sender_last4, status, submitted_at, reviewed_at, review_note',
      )
      .maybeSingle();

    if (error) {
      throwDatabaseError(error, 'Could not reject the payment request.');
    }

    if (!data) {
      throw new ApiError(
        404,
        'PAYMENT_NOT_PENDING',
        'The pending payment request was not found.',
      );
    }

    return mapPayment(data);
  }
}
