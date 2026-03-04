"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileCode, Music, AlertCircle, Info } from "lucide-react";
import FileDropzone from "./FileDropzone";
import ProgressBar from "./ProgressBar";
import { useLang } from "./LanguageContext";
import { getFFmpeg, fetchFile, getVideoDuration, calcTargetBitrate } from "@/lib/ffmpeg";
import { generateVideoH5 } from "@/lib/h5Template";
import { createZip, downloadBlob, formatBytes, isUnderSizeLimit } from "@/lib/zipUtils";

export default function VideoToH5() {
  const { t } = useLang();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [autoplay, setAutoplay] = useState(true);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ blob: Blob } | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const effectiveTitle = title || t.defaultVideoTitle;

  const handleGenerate = async () => {
    if (!files.length) return;
    const file = files[0];
    setLoading(true);
    setError("");
    setResult(null);
    setInfo("");
    setProgress(0);

    try {
      setStatus(t.ffmpegLoading);
      const ffmpeg = await getFFmpeg((p) => setProgress(Math.round(p * 0.7)));

      setStatus(t.analyzeVideo);
      const duration = await getVideoDuration(file);
      const targetVideoBitrate = calcTargetBitrate(duration, 4.85 * 1024 * 1024, 128000);
      const audioBitrate = 128;

      setInfo(
        t.videoDurationPrefix +
          duration.toFixed(1) +
          t.videoBitratePrefix +
          Math.round(targetVideoBitrate / 1000) +
          t.videoBitrateSuffix
      );
      setStatus(t.compressingVideoAudio);

      await ffmpeg.writeFile("input_v.mp4", await fetchFile(file));

      await ffmpeg.exec([
        "-i", "input_v.mp4",
        "-c:v", "libx264",
        "-b:v", `${Math.round(targetVideoBitrate / 1000)}k`,
        "-maxrate", `${Math.round((targetVideoBitrate / 1000) * 1.5)}k`,
        "-bufsize", `${Math.round((targetVideoBitrate / 1000) * 2)}k`,
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", `${audioBitrate}k`,
        "-movflags", "+faststart",
        "output_v.mp4",
      ]);

      const videoData = await ffmpeg.readFile("output_v.mp4");
      await ffmpeg.deleteFile("input_v.mp4");
      await ffmpeg.deleteFile("output_v.mp4");

      setProgress(78);
      setStatus(t.generatingH5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videoBlob = new Blob([videoData as any], { type: "video/mp4" });
      const videoFilename = "video.mp4";

      const html = generateVideoH5({
        title: effectiveTitle,
        videoFilename,
        autoplay,
        loop,
        muted,
      });

      setStatus(t.packingZip);
      setProgress(90);

      const zipBlob = await createZip([
        { path: "index.html", data: html },
        { path: `assets/${videoFilename}`, data: videoBlob },
      ]);

      if (!isUnderSizeLimit(zipBlob)) {
        setError(t.warnVideoZip + formatBytes(zipBlob.size) + t.warnVideoZipSuffix);
      }

      setResult({ blob: zipBlob });
      setProgress(100);
      setStatus(t.videoGenerateDone);
    } catch (e) {
      setError(t.generateFail + (e instanceof Error ? e.message : t.unknownError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode size={18} />
            {t.videoH5Title}
            <Badge variant="secondary" className="ml-auto flex items-center gap-1 text-xs">
              <Music size={12} />
              {t.keepBGM}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FileDropzone
            accept={{ "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"] }}
            files={files}
            onFilesChange={setFiles}
            label={t.dropVideoH5Label}
            hint={t.dropVideoH5Hint}
            disabled={loading}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t.h5TitleLabel}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t.h5TitlePlaceholder}
              disabled={loading}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { label: t.autoplay, value: autoplay, onChange: setAutoplay },
              { label: t.loop, value: loop, onChange: setLoop },
              { label: t.mutedDefault, value: muted, onChange: setMuted },
            ].map(({ label, value, onChange }) => (
              <label key={label} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>

          {info && (
            <div className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {loading && <ProgressBar progress={progress} label={status} />}

          {error && (
            <div className="flex gap-2 text-sm bg-destructive/10 text-destructive rounded-lg px-3 py-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!files.length || loading}
            className="w-full"
          >
            {loading ? t.generating : t.generateVideoH5}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-sm">{effectiveTitle}.zip</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className="text-xs">{formatBytes(result.blob.size)}</Badge>
                  {isUnderSizeLimit(result.blob) ? (
                    <Badge variant="secondary" className="text-xs text-green-600">
                      {t.underLimit}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      {t.overLimit}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                onClick={() => downloadBlob(result.blob, `${effectiveTitle}.zip`)}
                size="sm"
              >
                <Download size={14} className="mr-1" />
                {t.downloadZip}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
