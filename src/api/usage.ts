import apiClient from './client';
import type { Usage } from '../types';

export const usageApi = {
  async getUsage(): Promise<Usage> {
    const { data } = await apiClient.get<Usage>('/usage');
    return data;
  },
};
