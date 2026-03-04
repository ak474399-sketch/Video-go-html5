import JSZip from "jszip";

export const MAX_ZIP_SIZE = 5 * 1024 * 1024; // 5MB

export interface ZipEntry {
  path: string;
  data: Blob | Uint8Array | string;
}

export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.path, entry.data);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export function isUnderSizeLimit(blob: Blob, limit = MAX_ZIP_SIZE): boolean {
  return blob.size <= limit;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
