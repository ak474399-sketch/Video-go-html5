"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import SparkMD5 from "spark-md5";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Shuffle } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { downloadBlob } from "@/lib/zipUtils";
import { formatBytes } from "@/lib/imageUtils";
import { fetchFile, getFFmpeg, terminateFFmpeg } from "@/lib/ffmpeg";

type VariantItem = { name: string; blob: Blob; url: string; md5: string };

export default function VideoObfuscator() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const cancelRef = useRef(false);

  useEffect(() => {
    return () => {
      variants.forEach((v) => URL.revokeObjectURL(v.url));
    };
  }, [variants]);

  const clearVariants = () => {
    variants.forEach((v) => URL.revokeObjectURL(v.url));
    setVariants([]);
    setZipBlob(null);
  };

  const handleObfuscate = async () => {
    if (!files.length) return;
    const input = files[0];
    setError("");
    setStatus("");
    setProgress(0);
    setLoading(true);
    cancelRef.current = false;
    clearVariants();

    try {
      setStatus("加载 FFmpeg...");
      const ffmpeg = await getFFmpeg((p) => setProgress(p));
      await ffmpeg.writeFile("obf_input.mp4", await fetchFile(input));

      const generated: VariantItem[] = [];
      const md5Set = new Set<string>();

      for (let i = 1; i <= 5; i++) {
        let success = false;
        for (let attempt = 1; attempt <= 8; attempt++) {
          if (cancelRef.current) {
            throw new Error("任务已终止");
          }

          const brightness = (Math.random() * 0.04 - 0.02).toFixed(6);
          const outputName = `${input.name.replace(/\.[^.]+$/, "")}_v${i}.mp4`;
          const outputKey = `obf_output_${i}.mp4`;
          setStatus(`生成变体 v${i}/5（重试 ${attempt}/8）`);

          const vf = [
            `eq=brightness=${brightness}`,
            "scale=iw*1.01:ih*1.01",
            "crop=iw:ih",
            "drawbox=x=iw-1:y=0:w=1:h=1:color=white@0.01:t=fill",
            "fps=30000/1001",
          ].join(",");

          await ffmpeg.exec([
            "-i", "obf_input.mp4",
            "-vf", vf,
            "-r", "30000/1001",
            "-map_metadata", "-1",
            "-map_chapters", "-1",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            outputKey,
          ]);

          const data = await ffmpeg.readFile(outputKey);
          await ffmpeg.deleteFile(outputKey);

          const bytes = new Uint8Array(data as Uint8Array);
          const md5 = SparkMD5.ArrayBuffer.hash(bytes.buffer.slice(0));
          if (md5Set.has(md5)) {
            continue;
          }

          md5Set.add(md5);
          const blob = new Blob([bytes], { type: "video/mp4" });
          generated.push({
            name: outputName,
            blob,
            url: URL.createObjectURL(blob),
            md5,
          });
          setProgress(Math.round((i / 5) * 100));
          success = true;
          break;
        }

        if (!success) {
          throw new Error(`变体 v${i} 无法生成唯一 MD5，请重试`);
        }
      }

      await ffmpeg.deleteFile("obf_input.mp4");
      setVariants(generated);

      const zip = new JSZip();
      generated.forEach((v) => {
        zip.file(v.name, v.blob);
      });
      const zipBlobOut = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      setZipBlob(zipBlobOut);
      setStatus("混淆完成");
    } catch (e) {
      setError(e instanceof Error ? e.message : "混淆失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    cancelRef.current = true;
    setStatus("正在终止...");
    await terminateFFmpeg();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shuffle size={18} />
            视频混淆
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
            <li>上传视频</li>
            <li>点击视频混淆</li>
            <li>开始混淆</li>
            <li>输出 5 个变体</li>
            <li>下载变体</li>
          </ol>

          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            multiple={false}
            maxFiles={1}
            accept={{ "video/*": [".mp4", ".mov", ".mkv", ".avi", ".webm"] }}
            label="上传一个视频文件"
            hint="将在浏览器本地调用 FFmpeg.wasm 生成 5 个混淆变体"
            disabled={loading}
          />

          {loading && (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{status || "处理中..."}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleObfuscate} disabled={loading || !files.length}>
              {loading ? "混淆中..." : "开始混淆"}
            </Button>
            {loading && (
              <Button variant="destructive" onClick={handleCancel}>
                终止
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {variants.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">混淆结果（{variants.length} 个）</p>
              <div className="flex items-center gap-2">
                {zipBlob && (
                  <Button size="sm" variant="outline" onClick={() => downloadBlob(zipBlob, "video_obfuscation_variants.zip")}>
                    下载ZIP
                  </Button>
                )}
              </div>
            </div>

            {variants.map((v) => (
              <div key={v.name} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{v.name}</Badge>
                    <Badge>{formatBytes(v.blob.size)}</Badge>
                    <Badge variant="secondary">MD5: {v.md5.slice(0, 8)}...</Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadBlob(v.blob, v.name)}>
                    <Download size={14} className="mr-1" />
                    下载
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
