"use client";

import { useEffect, useState } from "react";
import JSZip from "jszip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Shuffle } from "lucide-react";
import FileDropzone from "./FileDropzone";
import { downloadBlob } from "@/lib/zipUtils";
import { formatBytes } from "@/lib/imageUtils";

type VariantItem = {
  name: string;
  blob: Blob;
  url: string;
};

type EnvStatus = {
  code: string;
  message: string;
  ok: boolean;
  python3: boolean;
  ffmpeg: boolean;
  ffprobe: boolean;
  detail?: {
    python3: string | null;
    ffmpeg: string | null;
    ffprobe: string | null;
  };
};

type ApiErr = {
  code?: string;
  message?: string;
  detail?: string;
};

export default function VideoObfuscator() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [envLoading, setEnvLoading] = useState(true);
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [variants, setVariants] = useState<VariantItem[]>([]);

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

  const loadEnvStatus = async () => {
    setEnvLoading(true);
    try {
      const res = await fetch("/api/video-obfuscate", { method: "GET" });
      const json = (await res.json()) as EnvStatus;
      setEnv(json);
    } catch {
      setEnv(null);
    } finally {
      setEnvLoading(false);
    }
  };

  useEffect(() => {
    loadEnvStatus();
  }, []);

  const handleObfuscate = async () => {
    if (!files.length) return;
    setError("");
    setLoading(true);
    clearVariants();

    try {
      const fd = new FormData();
      fd.append("files", files[0]);
      const res = await fetch("/api/video-obfuscate", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiErr | null;
        const code = err?.code ? `[${err.code}] ` : "";
        const detail = err?.detail ? ` (${err.detail})` : "";
        throw new Error(`${code}${err?.message || "混淆失败"}${detail}`);
      }

      const zip = await res.blob();
      setZipBlob(zip);

      const parsed = await JSZip.loadAsync(zip);
      const mp4Entries = Object.values(parsed.files)
        .filter((f) => !f.dir && f.name.toLowerCase().endsWith(".mp4"))
        .sort((a, b) => a.name.localeCompare(b.name));

      const out: VariantItem[] = [];
      for (const entry of mp4Entries) {
        const blob = await entry.async("blob");
        out.push({
          name: entry.name.split("/").pop() || entry.name,
          blob,
          url: URL.createObjectURL(blob),
        });
      }
      setVariants(out);

      if (out.length !== 5) {
        setError(`已生成 ${out.length} 个变体（期望 5 个），请检查输入视频和后端环境`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "混淆失败");
    } finally {
      setLoading(false);
    }
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

          <div className="rounded-lg border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-medium">环境自检</p>
              <Button size="sm" variant="outline" onClick={loadEnvStatus} disabled={envLoading}>
                {envLoading ? "检测中..." : "重新检测"}
              </Button>
            </div>
            {!envLoading && env && (
              <div className="mt-2 flex gap-2 flex-wrap">
                <Badge variant={env.python3 ? "secondary" : "destructive"}>
                  python3: {env.python3 ? "OK" : "Missing"}
                </Badge>
                <Badge variant={env.ffmpeg ? "secondary" : "destructive"}>
                  ffmpeg: {env.ffmpeg ? "OK" : "Missing"}
                </Badge>
                <Badge variant={env.ffprobe ? "secondary" : "destructive"}>
                  ffprobe: {env.ffprobe ? "OK" : "Missing"}
                </Badge>
              </div>
            )}
          </div>

          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            multiple={false}
            maxFiles={1}
            accept={{ "video/*": [".mp4", ".mov", ".mkv", ".avi", ".webm"] }}
            label="上传一个视频文件"
            hint="将调用 Python + FFmpeg 生成 5 个混淆变体"
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleObfuscate}
            disabled={loading || !files.length || envLoading || (env !== null && !env.ok)}
          >
            {loading ? "混淆中..." : "开始混淆"}
          </Button>
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
