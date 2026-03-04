"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Download, Video, Music } from "lucide-react";
import FileDropzone from "./FileDropzone";
import ProgressBar from "./ProgressBar";
import { useLang } from "./LanguageContext";
import { getFFmpeg, fetchFile } from "@/lib/ffmpeg";
import { downloadBlob, formatBytes } from "@/lib/zipUtils";

export default function VideoCompressor() {
  const { t } = useLang();
  const [files, setFiles] = useState<File[]>([]);
  const [crf, setCrf] = useState(28);
  const [audioBitrate, setAudioBitrate] = useState(128);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [error, setError] = useState("");

  const handleCompress = async () => {
    if (!files.length) return;
    const file = files[0];
    setLoading(true);
    setError("");
    setResult(null);
    setProgress(0);
    setStatus(t.ffmpegLoading);

    try {
      const ffmpeg = await getFFmpeg((p) => setProgress(p));
      setStatus(t.processingVideo);

      await ffmpeg.writeFile("input.mp4", await fetchFile(file));

      await ffmpeg.exec([
        "-i", "input.mp4",
        "-c:v", "libx264",
        "-crf", String(crf),
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", `${audioBitrate}k`,
        "-movflags", "+faststart",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([data as any], { type: "video/mp4" });

      await ffmpeg.deleteFile("input.mp4");
      await ffmpeg.deleteFile("output.mp4");

      const baseName = file.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}_compressed.mp4` });
      setStatus(t.compressDone);
      setProgress(100);
    } catch (e) {
      setError(t.compressFail + (e instanceof Error ? e.message : t.unknownError));
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const getQualityLabel = () => {
    if (crf <= 18) return t.qualityVeryHigh;
    if (crf <= 23) return t.qualityHigh;
    if (crf <= 28) return t.qualityMid;
    if (crf <= 35) return t.qualityLow;
    return t.qualityVeryLow;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video size={18} />
            {t.videoCompressTitle}
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
            label={t.dropVideoLabel}
            hint={t.dropVideoHint}
            disabled={loading}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{t.videoQuality}</span>
                <span className="text-muted-foreground">
                  {crf} <span className="text-xs">({getQualityLabel()})</span>
                </span>
              </div>
              <Slider
                min={18}
                max={40}
                step={1}
                value={[crf]}
                onValueChange={([v]) => setCrf(v)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">{t.crfNote}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{t.audioBitrate}</span>
                <span className="text-muted-foreground">{audioBitrate} kbps</span>
              </div>
              <Slider
                min={64}
                max={320}
                step={32}
                value={[audioBitrate]}
                onValueChange={([v]) => setAudioBitrate(v)}
                disabled={loading}
              />
            </div>
          </div>

          {loading && <ProgressBar progress={progress} label={status} />}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button onClick={handleCompress} disabled={!files.length || loading} className="w-full">
            {loading ? t.compressing : t.startCompress}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-sm">{result.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.compressedSize}
                  <Badge className="ml-1 text-xs">{formatBytes(result.blob.size)}</Badge>
                </p>
              </div>
              <Button onClick={() => downloadBlob(result.blob, result.name)} size="sm">
                <Download size={14} className="mr-1" />
                {t.downloadVideo}
              </Button>
            </div>
            {files[0] && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {t.original} {formatBytes(files[0].size)}
                </Badge>
                <Badge className="text-xs">
                  {t.compressed} {formatBytes(result.blob.size)}
                </Badge>
                <Badge variant="secondary" className="text-xs text-green-600">
                  {t.saved}{" "}
                  {(((files[0].size - result.blob.size) / files[0].size) * 100).toFixed(1)}%
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
