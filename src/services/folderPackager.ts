import JSZip from 'jszip';
import RNFS from 'react-native-fs';
import { transfersApi } from '../api/transfers';
import { storage } from './storage';
import type { PickedFile } from '../types';

export interface FolderUploadProgress {
  stage: 'reading' | 'zipping' | 'uploading' | 'completing';
  percent: number;
  currentFileName?: string;
  loadedBytes?: number;
  totalBytes?: number;
}

export const folderPackager = {
  /**
   * Packages multiple files or a simulated directory tree into a single ZIP file,
   * saves it to the temporary cache directory, and uploads it via the transfers pipeline.
   */
  async packageAndUploadFolder(
    files: PickedFile[],
    folderName: string = 'shared_folder',
    options?: { password?: string },
    onProgress?: (progress: FolderUploadProgress) => void
  ): Promise<{ transferId: string; shareUrl: string }> {
    if (!files || files.length === 0) {
      throw new Error('No files provided to package');
    }

    const zip = new JSZip();
    const cleanFolderName = folderName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const zipFileName = cleanFolderName.endsWith('.zip')
      ? cleanFolderName
      : `${cleanFolderName}.zip`;

    // 1. Read files and add to JSZip
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.({
        stage: 'reading',
        percent: Math.round(((i + 1) / files.length) * 30),
        currentFileName: file.name,
      });

      try {
        // Read file as base64 using react-native-fs or fetch blob
        const base64Data = await RNFS.readFile(file.uri, 'base64');
        zip.file(file.name, base64Data, { base64: true });
      } catch (err) {
        // Fallback to fetch blob if RNFS has content URI permission issues
        try {
          const resp = await fetch(file.uri);
          const blob = await resp.blob();
          const reader = new FileReader();
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
          });
          zip.file(file.name, arrayBuffer);
        } catch (innerErr) {
          throw new Error(`Failed to read file ${file.name}: ${(err as Error).message}`);
        }
      }
    }

    // 2. Generate ZIP archive
    onProgress?.({
      stage: 'zipping',
      percent: 40,
    });

    const zipBase64 = await zip.generateAsync(
      {
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        onProgress?.({
          stage: 'zipping',
          percent: 40 + Math.round(metadata.percent * 0.2), // 40% -> 60%
        });
      }
    );

    // Save temporary zip file
    const tempZipPath = `${RNFS.CachesDirectoryPath}/${Date.now()}_${zipFileName}`;
    await RNFS.writeFile(tempZipPath, zipBase64, 'base64');
    const stat = await RNFS.stat(tempZipPath);
    const zipSize = stat.size;

    // 3. Initiate Transfer on Backend
    onProgress?.({
      stage: 'uploading',
      percent: 65,
    });

    const created = await transfersApi.createTransfer({
      filename: zipFileName,
      mime_type: 'application/zip',
      declared_size_bytes: zipSize,
      password: options?.password || undefined,
    });

    // 4. Get presigned R2 upload URL
    const { upload_url } = await transfersApi.getUploadUrl(created.id);

    // 5. Upload ZIP directly to R2
    const fileUri = `file://${tempZipPath}`;
    await transfersApi.uploadFileDirect(
      upload_url,
      fileUri,
      'application/zip',
      (pct, loaded, total) => {
        onProgress?.({
          stage: 'uploading',
          percent: 65 + Math.round(pct * 0.3), // 65% -> 95%
          loadedBytes: loaded,
          totalBytes: total,
        });
      }
    );

    // 6. Complete transfer
    onProgress?.({
      stage: 'completing',
      percent: 98,
    });

    await transfersApi.completeTransfer(created.id, created.raw_token);
    await storage.saveShareUrl(created.id, created.share_url);

    // Cleanup temp zip file in background
    RNFS.unlink(tempZipPath).catch(() => {});

    onProgress?.({
      stage: 'completing',
      percent: 100,
    });

    return {
      transferId: created.id,
      shareUrl: created.share_url,
    };
  },
};
