import type {
  CalculatorInput,
  CalculatorResult,
  Entitlement,
  GuideSection,
  PaymentRequest,
} from '@homexbd/shared';

export type AuthUser = {
  id: string;
  email: string | null;
};

export type DeviceBinding = {
  deviceHash: string;
  active: boolean;
};

export type SavedProject = {
  id: string;
  name: string;
  input: CalculatorInput;
  result: CalculatorResult;
  ruleVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminPaymentRequest = PaymentRequest & {
  userId: string;
  email: string | null;
};

export interface AuthService {
  verifyAccessToken(accessToken: string): Promise<AuthUser>;
}

export interface DataStore {
  getDeviceBinding(userId: string): Promise<DeviceBinding | null>;
  bindDevice(
    userId: string,
    deviceHash: string,
    label: string | null,
  ): Promise<DeviceBinding>;
  resetDevice(userId: string, reviewerId: string): Promise<void>;
  getEntitlement(userId: string): Promise<Entitlement>;
  createPaymentRequest(
    userId: string,
    amountBdt: number,
    senderLast4: string,
  ): Promise<PaymentRequest>;
  getLatestPaymentRequest(userId: string): Promise<PaymentRequest | null>;
  getGuideSections(includePremium: boolean): Promise<GuideSection[]>;
  saveProject(
    userId: string,
    name: string,
    input: CalculatorInput,
    result: CalculatorResult,
  ): Promise<SavedProject>;
  listProjects(userId: string): Promise<SavedProject[]>;
  deleteProject(userId: string, projectId: string): Promise<void>;
  isAdmin(userId: string): Promise<boolean>;
  listPendingPayments(): Promise<AdminPaymentRequest[]>;
  approvePayment(
    paymentId: string,
    reviewerId: string,
    note: string | null,
  ): Promise<PaymentRequest>;
  rejectPayment(
    paymentId: string,
    reviewerId: string,
    note: string | null,
  ): Promise<PaymentRequest>;
}

export type ApiRuntimeConfig = {
  allowedOrigins: string[];
  bKashAccountNumber: string;
  deviceHashPepper: string;
  environment: 'development' | 'test' | 'production';
};

export type ApiDependencies = {
  auth: AuthService;
  store: DataStore;
  config: ApiRuntimeConfig;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      id: string;
    }
  }
}

