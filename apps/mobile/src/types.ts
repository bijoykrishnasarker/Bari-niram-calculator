import type { Entitlement, PaymentRequest } from '@homexbd/shared';

export type AccountSummary = {
  user: { id: string; email: string | null };
  entitlement: Entitlement;
  deviceBound: boolean;
  latestPayment: PaymentRequest | null;
};

export type PublicConfig = {
  premium: {
    amountBdt: number;
    lifetime: boolean;
    paymentMethod: 'bkash_manual';
    accountNumber: string | null;
    configured: boolean;
  };
};
