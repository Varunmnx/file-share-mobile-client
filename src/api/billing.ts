import apiClient from './client';
import type {
  Plan,
  CheckoutSessionResponse,
  SubscriptionResponse,
  VerifyPaymentResponse,
} from '../types';

export const billingApi = {
  async getPlans(): Promise<Plan[]> {
    const { data } = await apiClient.get<{ plans: Plan[] }>('/plans');
    return data.plans || [];
  },

  async createCheckoutSession(params?: {
    price_id?: string;
    success_url?: string;
    cancel_url?: string;
  }): Promise<CheckoutSessionResponse> {
    const { data } = await apiClient.post<CheckoutSessionResponse>(
      '/billing/checkout',
      params || {}
    );
    return data;
  },

  async verifyPayment(params: {
    payment_link_id?: string;
    payment_id?: string;
  }): Promise<VerifyPaymentResponse> {
    const { data } = await apiClient.post<VerifyPaymentResponse>(
      '/billing/verify',
      params
    );
    return data;
  },

  async getSubscription(): Promise<SubscriptionResponse> {
    const { data } = await apiClient.get<SubscriptionResponse>(
      '/billing/subscription'
    );
    return data;
  },
};
