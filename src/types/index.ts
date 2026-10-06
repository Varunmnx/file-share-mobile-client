// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  created_at: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage
// ─────────────────────────────────────────────────────────────────────────────

export interface Usage {
  user_id: string;
  active_transfer_count: number;
  active_storage_bytes: number;
  max_transfers: number;
  max_storage_bytes: number;
  updated_at: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfer
// ─────────────────────────────────────────────────────────────────────────────

export type TransferStatus =
  | 'CREATING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'READY'
  | 'CONSUMED'
  | 'EXPIRED'
  | 'FAILED'
  | 'DELETED';

export interface Transfer {
  id: string;
  filename: string;
  mime_type: string;
  declared_size_bytes: number;
  actual_size_bytes?: number;
  status: TransferStatus;
  expires_at: number;
  created_at: number;
  share_url?: string;
  password_hash?: string | null;
}

export interface CreateTransferPayload {
  filename: string;
  mime_type: string;
  declared_size_bytes: number;
  password?: string;
}

export interface CreateTransferResponse {
  id: string;
  raw_token: string;
  share_url: string;
  upload_url_endpoint: string;
  status: TransferStatus;
  expires_at: number;
}

export interface UploadUrlResponse {
  upload_url: string;
  r2_key: string;
  expires_in_secs: number;
}

export interface CompleteResponse {
  transfer_id: string;
  share_url: string;
  status: TransferStatus;
  actual_size_bytes?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipient Public Share
// ─────────────────────────────────────────────────────────────────────────────

export interface TransferInfo {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes?: number;
  has_password: boolean;
  expires_at: number;
  status: TransferStatus | string;
}

export interface AccessResult {
  download_url: string;
  filename: string;
  expires_at: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plans & Billing
// ─────────────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  max_file_bytes: number;
  max_transfers: number;
  max_storage_bytes: number;
  transfer_ttl_days: number;
  price_usd_cents: number;
  price_inr_paise: number;
  price_display: string;
}

export interface CheckoutSessionResponse {
  session_id: string;
  url: string;
}

export interface SubscriptionResponse {
  user_id: string;
  status: string;
  stripe_subscription_id?: string | null;
  current_period_end?: number | null;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  user: User;
  usage: Usage;
}

// ─────────────────────────────────────────────────────────────────────────────
// File / Folder Picked Item
// ─────────────────────────────────────────────────────────────────────────────

export interface PickedFile {
  uri: string;
  name: string;
  size: number;
  type: string;
}
