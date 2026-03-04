import imageCompression from "browser-image-compression";

export interface CompressImageOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  onProgress?: (progress: number) => void;
}

export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1920,
    quality = 0.8,
    onProgress,
  } = options;

  const compressed = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    initialQuality: quality,
    onProgress,
    fileType: file.type as "image/jpeg" | "image/png" | "image/webp",
  });

  return new File([compressed], file.name, { type: compressed.type });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getCompressionRatio(original: number, compressed: number): string {
  const ratio = ((original - compressed) / original) * 100;
  return `${ratio.toFixed(1)}%`;
}
