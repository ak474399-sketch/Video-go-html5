"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileCode2 } from "lucide-react";
import FileDropzone from "./FileDropzone";
import ProgressBar from "./ProgressBar";
import { compressImage, formatBytes } from "@/lib/imageUtils";
import { calcTargetBitrate, fetchFile, getFFmpeg, getVideoDuration } from "@/lib/ffmpeg";
import { createZip, downloadBlob, isUnderSizeLimit } from "@/lib/zipUtils";
import { generateImageH5, generateVideoH5 } from "@/lib/h5Template";

const MAX_ZIP_SIZE = 5 * 1024 * 1024;

type H5Result = {
  sourceIndex: number;
  sourceName: string;
  outputName: string;
  blob?: Blob;
  previewHtml?: string;
  error?: string;
};

function buildZipName(prefix: string, startNumber: number, index: number) {
  return `${prefix}${startNumber + index}.zip`;
}

export default function SmartH5Converter() {
  const [files, setFiles] = useState<File[]>([]);
  const [namePrefix, setNamePrefix] = useState("h5_");
  const [startNumber, setStartNumber] = useState(1);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<H5Result[]>([]);

  const createImageH5ZipUnder5MB = async (
    file: File,
    title: string
  ): Promise<{ zip: Blob; previewHtml: string }> => {
    let quality = 0.85;
    let maxSizeMB = 4.5;

    for (let i = 0; i < 12; i++) {
      const compressed = await compressImage(file, {
        quality,
        maxSizeMB,
        maxWidthOrHeight: 1920,
      });
      const ext = compressed.type.split("/")[1] || "jpg";
      const assetName = `image.${ext}`;
      const html = generateImageH5({ title, images: [{ filename: assetName }] });
      const zip = await createZip([
        { path: "index.html", data: html },
        { path: `assets/${assetName}`, data: compressed },
      ]);
      if (isUnderSizeLimit(zip, MAX_ZIP_SIZE)) {
        const mediaUrl = URL.createObjectURL(compressed);
        const previewHtml = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>html,body{margin:0;height:100%;background:#000;display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><img src="${mediaUrl}" alt="${title}"/></body></html>`;
        return { zip, previewHtml };
      }
      quality = Math.max(quality * 0.82, 0.08);
      maxSizeMB = Math.max(maxSizeMB * 0.85, 0.2);
    }

    throw new Error("图片转 H5 多次重试后仍超过 5MB");
  };

  const createVideoH5ZipUnder5MB = async (
    file: File,
    title: string
  ): Promise<{ zip: Blob; previewHtml: string }> => {
    const ffmpeg = await getFFmpeg((p) => setProgress(Math.round(p)));
    const duration = await getVideoDuration(file);
    let targetBytes = 4.4 * 1024 * 1024;
    const audioBitrate = 128000;

    for (let i = 0; i < 12; i++) {
      const bitrate = calcTargetBitrate(duration, targetBytes, audioBitrate);
      await ffmpeg.writeFile("h5_input.mp4", await fetchFile(file));
      await ffmpeg.exec([
        "-i", "h5_input.mp4",
        "-c:v", "libx264",
        "-b:v", `${Math.round(bitrate / 1000)}k`,
        "-maxrate", `${Math.round(bitrate / 1000)}k`,
        "-bufsize", `${Math.round((bitrate / 1000) * 1.5)}k`,
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "h5_output.mp4",
      ]);
      const data = await ffmpeg.readFile("h5_output.mp4");
      await ffmpeg.deleteFile("h5_input.mp4");
      await ffmpeg.deleteFile("h5_output.mp4");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videoBlob = new Blob([data as any], { type: "video/mp4" });
      const html = generateVideoH5({ title, videoFilename: "video.mp4", autoplay: true, loop: false, muted: false });
      const zip = await createZip([
        { path: "index.html", data: html },
        { path: "assets/video.mp4", data: videoBlob },
      ]);
      if (isUnderSizeLimit(zip, MAX_ZIP_SIZE)) {
        const mediaUrl = URL.createObjectURL(videoBlob);
        const previewHtml = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>html,body{margin:0;height:100%;background:#000;display:flex;align-items:center;justify-content:center}video{width:100%;max-height:100%;object-fit:contain}</style></head><body><video src="${mediaUrl}" controls playsinline autoplay></video></body></html>`;
        return { zip, previewHtml };
      }
      targetBytes *= 0.75;
    }

    throw new Error("视频转 H5 多次重试后仍超过 5MB，建议先裁剪时长");
  };

  const processBatch = async (indices: number[], reset: boolean) => {
    if (!indices.length) return;
    setLoading(true);
    if (reset) setResults([]);
    setProgress(0);
    const next: H5Result[] = [];

    for (let i = 0; i < indices.length; i++) {
      const sourceIndex = indices[i];
      const f = files[sourceIndex];
      if (!f) continue;
      const title = `${namePrefix}${startNumber + sourceIndex}`;
      try {
        setStatus(`生成 ${i + 1}/${indices.length}: ${f.name}`);
        let zip: Blob;
        let previewHtml: string;
        if (f.type.startsWith("image/")) {
          const out = await createImageH5ZipUnder5MB(f, title);
          zip = out.zip;
          previewHtml = out.previewHtml;
        } else if (f.type.startsWith("video/")) {
          const out = await createVideoH5ZipUnder5MB(f, title);
          zip = out.zip;
          previewHtml = out.previewHtml;
        } else {
          throw new Error("仅支持图片或视频文件");
        }
        next.push({
          sourceIndex,
          sourceName: f.name,
          outputName: buildZipName(namePrefix, startNumber, sourceIndex),
          blob: zip,
          previewHtml,
        });
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
    setStatus("全部处理完成");
    setLoading(false);
  };

  const handleRun = async () => {
    if (!files.length) return;
    const indices = files.slice(0, 10).map((_, i) => i);
    await processBatch(indices, true);
  };

  const handleRetryFailed = async () => {
    const failedIndices = results.filter((r) => r.error).map((r) => r.sourceIndex);
    await processBatch(failedIndices, false);
  };

  const openPreview = (html: string) => {
    const previewUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const copyPreviewLink = async (html: string) => {
    const previewUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    try {
      await navigator.clipboard.writeText(previewUrl);
      alert("预览链接已复制");
    } catch {
      window.prompt("复制这个链接：", previewUrl);
    }
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
    downloadBlob(blob, `h5_result_list_${Date.now()}.csv`);
  };

  const okResults = results.filter((r) => r.blob);
  const failedCount = results.filter((r) => r.error).length;
  const previewNames = files
    .slice(0, 10)
    .map((_, i) => buildZipName(namePrefix, startNumber, i));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode2 size={18} />
            转 H5（自动识别图片/视频，最多 10 个）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            multiple
            maxFiles={10}
            accept={{ "image/*": [], "video/*": [] }}
            label="上传图片或视频（支持批量，最多 10 个）"
            hint="每个文件会生成一个独立 H5 ZIP，自动重试直到小于 5MB"
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
              <p className="font-medium mb-1.5">命名预览（前 10 个）</p>
              <div className="flex gap-1.5 flex-wrap">
                {previewNames.map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {loading && <ProgressBar progress={progress} label={status} />}

          <Button className="w-full" onClick={handleRun} disabled={loading || !files.length}>
            {loading ? "处理中..." : "开始批量转 H5"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">输出结果</p>
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
                  onClick={() => okResults.forEach((r) => downloadBlob(r.blob!, r.outputName))}
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
                    <div className="flex items-center gap-2">
                      {r.previewHtml && (
                        <Button size="sm" variant="secondary" onClick={() => openPreview(r.previewHtml!)}>
                          预览 HTML
                        </Button>
                      )}
                      {r.previewHtml && (
                        <Button size="sm" variant="outline" onClick={() => copyPreviewLink(r.previewHtml!)}>
                          复制预览链接
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => downloadBlob(r.blob!, r.outputName)}>
                        下载
                      </Button>
                    </div>
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
