import axios from 'axios';
import apiClient from './client';
import { storage } from '../services/storage';
import type {
  CreateTransferPayload,
  CreateTransferResponse,
  UploadUrlResponse,
  CompleteResponse,
  Transfer,
} from '../types';

export const transfersApi = {
  async createTransfer(payload: CreateTransferPayload): Promise<CreateTransferResponse> {
    const { data } = await apiClient.post<CreateTransferResponse>('/transfers', payload);
    return data;
  },

  async getUploadUrl(transferId: string): Promise<UploadUrlResponse> {
    const { data } = await apiClient.post<UploadUrlResponse>(
      `/transfers/${transferId}/upload-url`
    );
    return data;
  },

  /**
   * Uploads file binary data directly to presigned R2 PUT URL with real-time percentage progress
   */
  async uploadFileDirect(
    uploadUrl: string,
    fileUri: string,
    mimeType: string,
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<void> {
    const contentType = mimeType || 'application/octet-stream';

    // Fetch the local file as a Blob using React Native's native fetch
    const response = await fetch(fileUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && evt.total > 0) {
            const percent = Math.round((evt.loaded / evt.total) * 100);
            onProgress(percent, evt.loaded, evt.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Direct R2 upload failed with HTTP ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during direct R2 file upload'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Direct R2 file upload timed out'));
      };

      xhr.send(blob);
    });
  },

  /**
   * Uploads raw buffer or blob (e.g. for zipped folders) directly to presigned R2 PUT URL
   */
  async uploadBlobDirect(
    uploadUrl: string,
    blob: Blob | Uint8Array,
    mimeType: string,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const contentType = mimeType || 'application/zip';

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && evt.total > 0) {
            const percent = Math.round((evt.loaded / evt.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Direct R2 upload failed with HTTP ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during R2 blob upload'));
      };

      xhr.send(blob);
    });
  },

  async completeTransfer(transferId: string, rawToken: string): Promise<CompleteResponse> {
    const { data } = await apiClient.post<CompleteResponse>(
      `/transfers/${transferId}/complete`,
      { raw_token: rawToken }
    );
    return data;
  },

  async listTransfers(): Promise<Transfer[]> {
    const { data } = await apiClient.get<{ transfers: Transfer[] }>('/transfers');
    const savedUrls = await storage.getSavedShareUrls();

    // Attach saved share URLs if available
    return (data.transfers || []).map((t) => ({
      ...t,
      share_url: savedUrls[t.id] || t.share_url,
    }));
  },

  async getTransfer(id: string): Promise<Transfer> {
    const { data } = await apiClient.get<Transfer>(`/transfers/${id}`);
    const savedUrls = await storage.getSavedShareUrls();
    if (savedUrls[id]) {
      data.share_url = savedUrls[id];
    }
    return data;
  },

  async deleteTransfer(id: string): Promise<void> {
    await apiClient.delete(`/transfers/${id}`);
  },

  /**
   * End-to-end single file upload flow:
   * 1. POST /transfers (create)
   * 2. POST /transfers/:id/upload-url (presigned PUT)
   * 3. PUT directly to R2
   * 4. POST /transfers/:id/complete (R2 validation & READY)
   */
  async fullUpload(
    file: { uri: string; name: string; size: number; type: string },
    options?: { password?: string },
    onProgress?: (percent: number, loaded: number, total: number) => void
  ): Promise<{ transferId: string; shareUrl: string; status: string }> {
    // 1. Create transfer record
    const created = await this.createTransfer({
      filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      declared_size_bytes: file.size,
      password: options?.password || undefined,
    });

    // 2. Get presigned R2 upload URL
    const { upload_url } = await this.getUploadUrl(created.id);

    // 3. Upload file directly to R2
    await this.uploadFileDirect(upload_url, file.uri, file.type, onProgress);

    // 4. Complete upload
    const completed = await this.completeTransfer(created.id, created.raw_token);

    // 5. Cache share URL locally
    await storage.saveShareUrl(created.id, created.share_url);

    return {
      transferId: created.id,
      shareUrl: created.share_url,
      status: completed.status,
    };
  },
};
