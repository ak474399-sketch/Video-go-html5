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

type VariantItem = {
  index: number;
  name: string;
  blob?: Blob;
  url?: string;
  md5?: string;
  error?: string;
};

export default function VideoObfuscator() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockError, setWakeLockError] = useState("");
  const [visibilityHidden, setVisibilityHidden] = useState(false);
  const wakeLockRef = useRef<unknown>(null);
  const cancelRef = useRef(false);
  const pausedRef = useRef(false);
  const variantsRef = useRef<VariantItem[]>([]);

  useEffect(() => {
    setWakeLockSupported(
      typeof navigator !== "undefined" &&
        "wakeLock" in navigator &&
        typeof (navigator as Navigator & { wakeLock?: unknown }).wakeLock !== "undefined"
    );
  }, []);

  useEffect(() => {
    variantsRef.current = variants;
  }, [variants]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    return () => {
      variantsRef.current.forEach((v) => {
        if (v.url) URL.revokeObjectURL(v.url);
      });
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState !== "visible";
      setVisibilityHidden(hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!loading) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [loading]);

  const clearVariants = () => {
    variantsRef.current.forEach((v) => {
      if (v.url) URL.revokeObjectURL(v.url);
    });
    setVariants([]);
    variantsRef.current = [];
    setZipBlob(null);
  };

  const waitIfPaused = async () => {
    while (pausedRef.current && !cancelRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  const requestWakeLock = async () => {
    try {
      setWakeLockError("");
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<unknown> };
      };
      if (!nav.wakeLock) return;
      wakeLockRef.current = await nav.wakeLock.request("screen");
      setWakeLockActive(true);
    } catch {
      setWakeLockActive(false);
      setWakeLockError("无法开启保活（Wake Lock），按要求本功能必须保活，无法继续。");
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (
        wakeLockRef.current &&
        typeof wakeLockRef.current === "object" &&
        wakeLockRef.current !== null &&
        "release" in wakeLockRef.current &&
        typeof (wakeLockRef.current as { release: () => Promise<void> }).release === "function"
      ) {
        await (wakeLockRef.current as { release: () => Promise<void> }).release();
      }
    } catch {
      // ignore
    } finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  const handleObfuscate = async () => {
    if (!files.length) return;
    const input = files[0];
    setError("");
    setStatus("");
    setProgress(0);
    setPaused(false);
    setLoading(true);
    cancelRef.current = false;
    pausedRef.current = false;
    clearVariants();

    try {
      // 保活为必选项：必须成功开启后才能处理
      if (!wakeLockSupported) {
        throw new Error("当前浏览器不支持 Wake Lock，按要求无法开始混淆。");
      }
      if (!wakeLockActive) await requestWakeLock();
      if (!wakeLockRef.current) {
        throw new Error("保活未开启成功，按要求无法开始混淆。");
      }
      setStatus("加载 FFmpeg...");
      const ffmpeg = await getFFmpeg((p) => setProgress(p));
      await ffmpeg.writeFile("obf_input.mp4", await fetchFile(input));

      const generated: VariantItem[] = [];
      const md5Set = new Set<string>();

      for (let i = 1; i <= 5; i++) {
        let success = false;
        let lastReason = "";
        let duplicateCount = 0;
        for (let attempt = 1; attempt <= 8; attempt++) {
          await waitIfPaused();
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

          try {
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
          } catch (e) {
            lastReason = `FFmpeg 转码失败（attempt ${attempt}/8）：${e instanceof Error ? e.message : "未知错误"}`;
            continue;
          }

          const data = await ffmpeg.readFile(outputKey);
          await ffmpeg.deleteFile(outputKey);

          const bytes = new Uint8Array(data as Uint8Array);
          const md5 = SparkMD5.ArrayBuffer.hash(bytes.buffer.slice(0));
          if (md5Set.has(md5)) {
            duplicateCount += 1;
            lastReason = `MD5 冲突（attempt ${attempt}/8），已自动重试`;
            continue;
          }

          md5Set.add(md5);
          const blob = new Blob([bytes], { type: "video/mp4" });
          const successItem: VariantItem = {
            index: i,
            name: outputName,
            blob,
            url: URL.createObjectURL(blob),
            md5,
          };
          generated.push(successItem);
          setVariants([...generated].sort((a, b) => a.index - b.index));
          setProgress(Math.round((i / 5) * 100));
          success = true;
          break;
        }

        if (!success) {
          const failedItem: VariantItem = {
            index: i,
            name: `${input.name.replace(/\.[^.]+$/, "")}_v${i}.mp4`,
            error:
              lastReason ||
              (duplicateCount > 0
                ? "多次重试后仍与其他变体 MD5 冲突，可能因视频内容过于单一"
                : "生成失败，原因未知"),
          };
          generated.push(failedItem);
          setVariants([...generated].sort((a, b) => a.index - b.index));
          continue;
        }
      }

      await ffmpeg.deleteFile("obf_input.mp4");
      setVariants(generated.sort((a, b) => a.index - b.index));

      const successItems = generated.filter((v) => v.blob && v.name);
      const failedItems = generated.filter((v) => v.error);

      const zip = new JSZip();
      successItems.forEach((v) => {
        zip.file(v.name, v.blob!);
      });

      if (successItems.length > 0) {
        const zipBlobOut = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        setZipBlob(zipBlobOut);
      } else {
        setZipBlob(null);
      }

      if (failedItems.length > 0) {
        setError(
          `已完成 ${successItems.length}/5 个变体；失败 ${failedItems.length} 个。失败原因已在结果列表显示。`
        );
      } else {
        setStatus("混淆完成");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "混淆失败");
    } finally {
      setPaused(false);
      await releaseWakeLock();
      setLoading(false);
    }
  };

  const handlePauseToggle = () => {
    setPaused((prev) => {
      const next = !prev;
      setStatus(next ? "已暂停，点击继续可恢复" : "继续处理中...");
      return next;
    });
  };

  const handleCancel = async () => {
    cancelRef.current = true;
    setPaused(false);
    pausedRef.current = false;
    setStatus("正在终止...");
    await terminateFFmpeg();
    await releaseWakeLock();
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

          <div className="rounded-lg border border-border p-3 text-sm space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-medium">后台保活</p>
              <Badge variant={wakeLockActive ? "secondary" : "destructive"}>
                {wakeLockActive ? "已开启（必选）" : "未开启（必选）"}
              </Badge>
            </div>
            {!wakeLockSupported && (
              <p className="text-muted-foreground">
                当前浏览器不支持 Wake Lock。按要求此功能无法启动，请使用支持的浏览器。
              </p>
            )}
            {wakeLockError && <p className="text-destructive">{wakeLockError}</p>}
            {visibilityHidden && loading && (
              <p className="text-amber-600">
                当前页面不在前台，浏览器可能降速或暂停任务。建议保持当前页可见。
              </p>
            )}
          </div>

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
              <Button variant="outline" onClick={handlePauseToggle}>
                {paused ? "继续" : "暂停"}
              </Button>
            )}
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
                    {v.blob && <Badge>{formatBytes(v.blob.size)}</Badge>}
                    {v.md5 && <Badge variant="secondary">MD5: {v.md5.slice(0, 8)}...</Badge>}
                    {v.error && <Badge variant="destructive">失败</Badge>}
                  </div>
                  {v.blob ? (
                    <Button size="sm" variant="outline" onClick={() => downloadBlob(v.blob!, v.name)}>
                      <Download size={14} className="mr-1" />
                      下载
                    </Button>
                  ) : null}
                </div>
                {v.error && <p className="text-destructive mt-2">{v.error}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
