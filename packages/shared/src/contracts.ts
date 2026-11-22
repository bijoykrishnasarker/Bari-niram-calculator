import { z } from 'zod';

export const PREMIUM_PRICE_BDT = 99 as const;

export const PaymentSubmissionSchema = z.object({
  amountBdt: z.literal(PREMIUM_PRICE_BDT),
  senderLast4: z
    .string()
    .regex(
      /^\d{4}$/,
      'Enter exactly the last four digits of the sender number',
    ),
});

export const ProjectNameSchema = z.string().trim().min(1).max(80);

export const DeviceIdSchema = z
  .string()
  .min(32, 'Device installation ID is too short')
  .max(128, 'Device installation ID is too long')
  .regex(
    /^[A-Za-z0-9._:-]+$/,
    'Device installation ID contains invalid characters',
  );

export const PaymentStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export type PaymentSubmission = z.infer<typeof PaymentSubmissionSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export type Entitlement = {
  plan: 'free' | 'premium';
  lifetime: boolean;
  premiumSince: string | null;
};

export type PaymentRequest = {
  id: string;
  amountBdt: number;
  senderLast4: string;
  status: PaymentStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type GuideSection = {
  id: string;
  slug: string;
  titleBn: string;
  bodyBn: string[];
  sortOrder: number;
  accessTier: 'free' | 'premium';
};
