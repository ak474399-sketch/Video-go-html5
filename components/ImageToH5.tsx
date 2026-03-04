"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Download, FileCode, AlertCircle } from "lucide-react";
import FileDropzone from "./FileDropzone";
import ProgressBar from "./ProgressBar";
import { useLang } from "./LanguageContext";
import { compressImage } from "@/lib/imageUtils";
import { generateImageH5 } from "@/lib/h5Template";
import { createZip, downloadBlob, formatBytes, isUnderSizeLimit } from "@/lib/zipUtils";

export default function ImageToH5() {
  const { t } = useLang();
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(0.75);
  const [maxSizeMB, setMaxSizeMB] = useState(0.8);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ blob: Blob } | null>(null);
  const [error, setError] = useState("");

  const effectiveTitle = title || t.defaultImgTitle;

  const handleGenerate = async () => {
    if (!files.length) return;
    setLoading(true);
    setError("");
    setResult(null);
    setProgress(0);

    try {
      let currentQuality = quality;
      let currentMaxSizeMB = maxSizeMB;
      let zipBlob: Blob;
      let attempt = 0;
      const maxAttempts = 5;

      do {
        attempt++;
        setStatus(t.retryPrefix + attempt + t.retrySuffix);

        const compressedFiles: Array<{ file: File; filename: string }> = [];

        for (let i = 0; i < files.length; i++) {
          const compressed = await compressImage(files[i], {
            quality: currentQuality,
            maxSizeMB: currentMaxSizeMB,
            onProgress: (p) =>
              setProgress(Math.round(((i + p / 100) / files.length) * 80)),
          });
          const ext = compressed.type.split("/")[1] || "jpg";
          compressedFiles.push({
            file: compressed,
            filename: `img_${String(i + 1).padStart(2, "0")}.${ext}`,
          });
        }

        setStatus(t.generatingH5);
        setProgress(85);

        const html = generateImageH5({
          title: effectiveTitle,
          images: compressedFiles.map((f) => ({ filename: f.filename })),
        });

        const entries = [
          { path: "index.html", data: html },
          ...compressedFiles.map((f) => ({ path: `assets/${f.filename}`, data: f.file })),
        ];

        setStatus(t.packingZip);
        setProgress(92);

        zipBlob = await createZip(entries);

        if (!isUnderSizeLimit(zipBlob) && attempt < maxAttempts) {
          currentQuality = Math.max(currentQuality * 0.7, 0.1);
          currentMaxSizeMB = Math.max(currentMaxSizeMB * 0.6, 0.1);
          setStatus(t.zipOverPrefix + formatBytes(zipBlob.size) + t.zipOverSuffix);
        } else {
          break;
        }
      } while (attempt < maxAttempts);

      if (!isUnderSizeLimit(zipBlob!)) {
        setError(t.warnZipOver + formatBytes(zipBlob!.size) + t.warnZipOverSuffix);
      }

      setResult({ blob: zipBlob! });
      setProgress(100);
      setStatus(t.generateDone);
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
            {t.imageH5Title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FileDropzone
            accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
            multiple
            maxFiles={30}
            files={files}
            onFilesChange={setFiles}
            label={t.dropImageH5Label}
            hint={t.dropImageH5Hint}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{t.imageQuality}</span>
                <span className="text-muted-foreground">{Math.round(quality * 100)}%</span>
              </div>
              <Slider
                min={10}
                max={95}
                step={5}
                value={[Math.round(quality * 100)]}
                onValueChange={([v]) => setQuality(v / 100)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{t.maxSizePerImage}</span>
                <span className="text-muted-foreground">{maxSizeMB} MB</span>
              </div>
              <Slider
                min={0.1}
                max={2}
                step={0.1}
                value={[maxSizeMB]}
                onValueChange={([v]) => setMaxSizeMB(v)}
                disabled={loading}
              />
            </div>
          </div>

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
            {loading ? t.generating : t.generateH5}
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
                  <Badge variant="outline" className="text-xs">
                    {files.length}{t.imagesCount}
                  </Badge>
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
