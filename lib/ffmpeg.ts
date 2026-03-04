import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let loading = false;
let loadPromise: Promise<FFmpeg> | null = null;

const FFMPEG_CDN = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

export async function getFFmpeg(
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  if (loadPromise) return loadPromise;

  loading = true;
  loadPromise = (async () => {
    const instance = new FFmpeg();

    if (onProgress) {
      instance.on("progress", ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.wasm`, "application/wasm"),
    ]);

    await instance.load({ coreURL, wasmURL });
    ffmpeg = instance;
    loading = false;
    return instance;
  })();

  return loadPromise;
}

export { fetchFile };

export function resetFFmpegProgress(
  instance: FFmpeg,
  onProgress: (progress: number) => void
) {
  instance.on("progress", ({ progress }) => {
    onProgress(Math.round(progress * 100));
  });
}

export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => resolve(60);
    video.src = url;
  });
}

export function calcTargetBitrate(
  durationSec: number,
  maxSizeBytes: number = 4.9 * 1024 * 1024,
  audioBitrate: number = 128000
): number {
  const totalBits = maxSizeBytes * 8;
  const audioBits = audioBitrate * durationSec;
  const videoBits = totalBits - audioBits;
  return Math.max(Math.floor(videoBits / durationSec), 100000);
}

export async function terminateFFmpeg() {
  if (ffmpeg) {
    try {
      await ffmpeg.terminate();
    } catch {
      // ignore terminate errors
    }
  }
  ffmpeg = null;
  loadPromise = null;
  loading = false;
}
