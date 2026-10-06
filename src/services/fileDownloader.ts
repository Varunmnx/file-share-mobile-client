import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export interface DownloadProgress {
  percent: number;
  bytesWritten: number;
  contentLength: number;
}

export const fileDownloader = {
  /**
   * Downloads a claimed file from its presigned R2 GET URL directly to the device storage.
   * Returns the local file path.
   */
  async downloadFile(
    downloadUrl: string,
    filename: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const targetDir =
      Platform.OS === 'android' && RNFS.DownloadDirectoryPath
        ? RNFS.DownloadDirectoryPath
        : RNFS.DocumentDirectoryPath;

    // Ensure safe unique filename if already exists
    const sanitizedName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const destPath = `${targetDir}/${sanitizedName}`;

    // Remove old copy if exists
    try {
      const exists = await RNFS.exists(destPath);
      if (exists) {
        await RNFS.unlink(destPath);
      }
    } catch {
      // Ignore
    }

    const downloadJob = RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: destPath,
      background: true,
      progressDivider: 1,
      progress: (res) => {
        if (res.contentLength > 0 && onProgress) {
          const percent = Math.round((res.bytesWritten / res.contentLength) * 100);
          onProgress({
            percent,
            bytesWritten: res.bytesWritten,
            contentLength: res.contentLength,
          });
        }
      },
    });

    const result = await downloadJob.promise;
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return destPath;
    } else {
      throw new Error(`Download failed with status code ${result.statusCode}`);
    }
  },
};
