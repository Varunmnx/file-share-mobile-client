import apiClient from './client';
import type { TransferInfo, AccessResult } from '../types';

export const recipientApi = {
  /**
   * Fetches public transfer metadata by token (filename, size, expiry, password requirement).
   * Unauthenticated.
   */
  async getTransferInfo(token: string): Promise<TransferInfo> {
    const { data } = await apiClient.get<TransferInfo>(`/s/${token}`);
    return data;
  },

  /**
   * Verifies transfer password and receives an HMAC signed short-lived grant token.
   * If incorrect, throws 403 Forbidden without burning one-time access claim.
   */
  async verifyPassword(token: string, password: string): Promise<string> {
    const { data } = await apiClient.post<{ grant_token: string }>(
      `/s/${token}/password`,
      { password }
    );
    return data.grant_token;
  },

  /**
   * Atomically claims one-time access to the transfer using optional grant token.
   * Returns a presigned GET download URL valid for 1 hour.
   * A second claim will return 410 Gone.
   */
  async claimAccess(token: string, grantToken?: string): Promise<AccessResult> {
    const { data } = await apiClient.post<AccessResult>(`/s/${token}/access`, {
      grant_token: grantToken || undefined,
    });
    return data;
  },
};
