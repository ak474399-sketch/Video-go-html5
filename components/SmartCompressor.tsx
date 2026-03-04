"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Download, Minimize2 } from "lucide-react";
import FileDropzone from "./FileDropzone";
import ProgressBar from "./ProgressBar";
import { compressImage, formatBytes } from "@/lib/imageUtils";
import { calcTargetBitrate, fetchFile, getFFmpeg, getVideoDuration } from "@/lib/ffmpeg";
import { downloadBlob } from "@/lib/zipUtils";

const MAX_OUTPUT_SIZE = 5 * 1024 * 1024;

type ItemResult = {
  sourceIndex: number;
  sourceName: string;
  outputName: string;
  blob?: Blob;
  error?: string;
};

function buildOutputName(prefix: string, startNumber: number, index: number, ext: string) {
  return `${prefix}${startNumber + index}.${ext}`;
}

export default function SmartCompressor() {
  const [files, setFiles] = useState<File[]>([]);
  const [namePrefix, setNamePrefix] = useState("compress_");
  const [startNumber, setStartNumber] = useState(1);
  const [imageQuality, setImageQuality] = useState(80);
  const [videoAudioBitrate, setVideoAudioBitrate] = useState(128);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);

  const compressImageUnder5MB = async (file: File): Promise<File> => {
    let quality = imageQuality / 100;
    let maxSizeMB = 4.8;
    for (let i = 0; i < 10; i++) {
      const out = await compressImage(file, { quality, maxSizeMB, maxWidthOrHeight: 1920 });
      if (out.size <= MAX_OUTPUT_SIZE) return out;
      quality = Math.max(quality * 0.82, 0.08);
      maxSizeMB = Math.max(maxSizeMB * 0.85, 0.25);
    }
    throw new Error("图片在最低质量下仍超过 5MB");
  };

  const compressVideoUnder5MB = async (file: File): Promise<Blob> => {
    const ffmpeg = await getFFmpeg((p) => setProgress(Math.round(p)));
    const duration = await getVideoDuration(file);
    let targetBytes = 4.5 * 1024 * 1024;

    for (let i = 0; i < 10; i++) {
      const bitrate = calcTargetBitrate(duration, targetBytes, videoAudioBitrate * 1000);
      await ffmpeg.writeFile("compress_input.mp4", await fetchFile(file));
      await ffmpeg.exec([
        "-i", "compress_input.mp4",
        "-c:v", "libx264",
        "-b:v", `${Math.round(bitrate / 1000)}k`,
        "-maxrate", `${Math.round(bitrate / 1000)}k`,
        "-bufsize", `${Math.round((bitrate / 1000) * 1.5)}k`,
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", `${videoAudioBitrate}k`,
        "-movflags", "+faststart",
        "compress_output.mp4",
      ]);
      const data = await ffmpeg.readFile("compress_output.mp4");
      await ffmpeg.deleteFile("compress_input.mp4");
      await ffmpeg.deleteFile("compress_output.mp4");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([data as any], { type: "video/mp4" });
      if (blob.size <= MAX_OUTPUT_SIZE) return blob;
      targetBytes *= 0.75;
    }
    throw new Error("视频在多次重试后仍超过 5MB，建议先裁剪时长");
  };

  const processBatch = async (indices: number[], reset: boolean) => {
    if (!indices.length) return;
    setLoading(true);
    if (reset) setResults([]);
    setProgress(0);
    const next: ItemResult[] = [];

    for (let i = 0; i < indices.length; i++) {
      const sourceIndex = indices[i];
      const f = files[sourceIndex];
      if (!f) continue;
      try {
        setStatus(`处理中 ${i + 1}/${indices.length}: ${f.name}`);
        if (f.type.startsWith("image/")) {
          const out = await compressImageUnder5MB(f);
          const ext = out.type.split("/")[1] || "jpg";
          next.push({
            sourceIndex,
            sourceName: f.name,
            outputName: buildOutputName(namePrefix, startNumber, sourceIndex, ext),
            blob: out,
          });
        } else if (f.type.startsWith("video/")) {
          const out = await compressVideoUnder5MB(f);
          next.push({
            sourceIndex,
            sourceName: f.name,
            outputName: buildOutputName(namePrefix, startNumber, sourceIndex, "mp4"),
            blob: out,
          });
        } else {
          next.push({
            sourceIndex,
            sourceName: f.name,
            outputName: "",
            error: "仅支持图片或视频文件",
          });
        }
      } catch (e) {
        next.push({
          sourceIndex,
          sourceName: f.name,
          outputName: "",
          error: e instanceof Error ? e.message : "处理失败",
        });
      }
      setProgress(Math.round(((i + 1) / indices.length) * 100));
    }

    setResults((prev) => {
      if (reset) return next;
      const map = new Map(prev.map((r) => [r.sourceIndex, r]));
      next.forEach((r) => map.set(r.sourceIndex, r));
      return Array.from(map.values()).sort((a, b) => a.sourceIndex - b.sourceIndex);
    });
    setStatus("处理完成");
    setLoading(false);
  };

  const handleRun = async () => {
    if (!files.length) return;
    const indices = files.map((_, i) => i);
    await processBatch(indices, true);
  };

  const handleRetryFailed = async () => {
    const failedIndices = results.filter((r) => r.error).map((r) => r.sourceIndex);
    await processBatch(failedIndices, false);
  };

  const exportCsv = () => {
    const rows = [
      ["sourceName", "outputName", "sizeBytes", "status", "error"],
      ...results.map((r) => [
        r.sourceName,
        r.outputName || "",
        r.blob ? String(r.blob.size) : "",
        r.error ? "failed" : "success",
        r.error || "",
      ]),
    ];
    const csv = rows
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `compress_result_list_${Date.now()}.csv`);
  };

  const okResults = results.filter((r) => r.blob);
  const failedCount = results.filter((r) => r.error).length;
  const previewNames = files.map((f, i) => {
    const ext = f.type.startsWith("video/") ? "mp4" : "jpg";
    return buildOutputName(namePrefix, startNumber, i, ext);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Minimize2 size={18} />
            压缩（自动识别图片/视频）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            multiple
            maxFiles={20}
            accept={{ "image/*": [], "video/*": [] }}
            label="上传图片或视频（可混合批量）"
            hint="自动识别格式；输出会自动重试直到小于 5MB"
            disabled={loading}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">批量命名常量</label>
              <input
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">变量起始数字</label>
              <input
                type="number"
                min={1}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                value={startNumber}
                onChange={(e) => setStartNumber(Number(e.target.value || 1))}
                disabled={loading}
              />
            </div>
          </div>

          {previewNames.length > 0 && (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium mb-1.5">命名预览</p>
              <div className="flex gap-1.5 flex-wrap">
                {previewNames.slice(0, 20).map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">图片质量</span>
                <span className="text-muted-foreground">{imageQuality}%</span>
              </div>
              <Slider
                min={10}
                max={100}
                step={5}
                value={[imageQuality]}
                onValueChange={([v]) => setImageQuality(v)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">视频音频码率</span>
                <span className="text-muted-foreground">{videoAudioBitrate} kbps</span>
              </div>
              <Slider
                min={64}
                max={320}
                step={32}
                value={[videoAudioBitrate]}
                onValueChange={([v]) => setVideoAudioBitrate(v)}
                disabled={loading}
              />
            </div>
          </div>

          {loading && <ProgressBar progress={progress} label={status} />}

          <Button className="w-full" onClick={handleRun} disabled={loading || !files.length}>
            {loading ? "处理中..." : "开始批量压缩"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">处理结果</p>
              <div className="flex items-center gap-2">
                {results.length > 0 && (
                  <Button size="sm" variant="outline" onClick={exportCsv}>
                    导出CSV
                  </Button>
                )}
                {failedCount > 0 && (
                  <Button size="sm" variant="secondary" onClick={handleRetryFailed} disabled={loading}>
                    重试失败项（{failedCount}）
                  </Button>
                )}
                {okResults.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    okResults.forEach((r) => downloadBlob(r.blob!, r.outputName));
                  }}
                >
                  <Download size={14} className="mr-1" />
                  全部下载
                </Button>
                )}
              </div>
            </div>
            {results.map((r, idx) => (
              <div key={`${r.sourceName}-${idx}`} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium truncate">{r.sourceName}</p>
                {r.error ? (
                  <p className="text-destructive mt-1">{r.error}</p>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{r.outputName}</Badge>
                      <Badge>{formatBytes(r.blob!.size)}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadBlob(r.blob!, r.outputName)}>
                      下载
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
