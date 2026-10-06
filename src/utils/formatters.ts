export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeRemaining(expiresAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = expiresAt - now;
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function getFileIcon(filename: string = '', mime: string = ''): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return '🖼️';
  }
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) {
    return '🎬';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'aac', 'ogg', 'flac'].includes(ext)) {
    return '🎵';
  }
  if (mime.includes('pdf') || ext === 'pdf') {
    return '📄';
  }
  if (
    mime.includes('zip') ||
    mime.includes('compressed') ||
    ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)
  ) {
    return '📦';
  }
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) {
    return '📝';
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return '📊';
  }
  if (['js', 'ts', 'tsx', 'rs', 'py', 'json', 'html', 'css'].includes(ext)) {
    return '💻';
  }
  return '📁';
}

/**
 * Extracts raw 32-64 char share token from user input.
 * Supports:
 * - Direct token: "a1b2c3d4e5f6..."
 * - Full URL: "https://file-share-web-client-two.vercel.app/s/a1b2c3d4e5f6..."
 * - Deep link: "filedrop://s/a1b2c3d4e5f6..."
 */
export function extractToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/s\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}
