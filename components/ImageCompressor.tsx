"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Download, ImageIcon } from "lucide-react";
import FileDropzone from "./FileDropzone";
import ProgressBar from "./ProgressBar";
import { useLang } from "./LanguageContext";
import { compressImage, formatBytes, getCompressionRatio } from "@/lib/imageUtils";
import { downloadBlob } from "@/lib/zipUtils";

export default function ImageCompressor() {
  const { t } = useLang();
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(0.8);
  const [maxSizeMB, setMaxSizeMB] = useState(1);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    Array<{ original: File; compressed: File; previewUrl: string }>
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      results.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    };
  }, [results]);

  const handleCompress = async () => {
    if (!files.length) return;
    setLoading(true);
    setError("");
    setProgress(0);
    setResults([]);

    const out: typeof results = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i], {
          quality,
          maxSizeMB,
          onProgress: (p) =>
            setProgress(Math.round((i / files.length + p / 100 / files.length) * 100)),
        });
        const previewUrl = URL.createObjectURL(compressed);
        out.push({ original: files[i], compressed, previewUrl });
      } catch {
        setError(t.compressFileFail1 + files[i].name + t.compressFileFail2);
      }
    }

    setResults(out);
    setProgress(100);
    setLoading(false);
  };

  const handleDownload = (result: (typeof results)[0]) => {
    const ext = result.compressed.name.split(".").pop();
    const baseName = result.original.name.replace(/\.[^.]+$/, "");
    downloadBlob(result.compressed, `${baseName}_compressed.${ext}`);
  };

  const handleDownloadAll = () => results.forEach(handleDownload);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon size={18} />
            {t.imageCompressTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FileDropzone
            accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] }}
            multiple
            maxFiles={20}
            files={files}
            onFilesChange={setFiles}
            label={t.dropImageLabel}
            hint={t.dropImageHint}
            disabled={loading}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{t.compressQuality}</span>
                <span className="text-muted-foreground">{Math.round(quality * 100)}%</span>
              </div>
              <Slider
                min={10}
                max={100}
                step={5}
                value={[Math.round(quality * 100)]}
                onValueChange={([v]) => setQuality(v / 100)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{t.maxSize}</span>
                <span className="text-muted-foreground">{maxSizeMB} MB</span>
              </div>
              <Slider
                min={0.1}
                max={5}
                step={0.1}
                value={[maxSizeMB]}
                onValueChange={([v]) => setMaxSizeMB(v)}
                disabled={loading}
              />
            </div>
          </div>

          {loading && <ProgressBar progress={progress} label={t.compressingStatus} />}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleCompress}
              disabled={!files.length || loading}
              className="flex-1"
            >
              {loading ? t.compressing : t.startCompress}
            </Button>
            {results.length > 1 && (
              <Button variant="outline" onClick={handleDownloadAll}>
                <Download size={16} className="mr-1" />
                {t.downloadAll}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                <img
                  src={result.previewUrl}
                  alt={result.original.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <CardContent className="pt-3 pb-3 space-y-2">
                <p className="text-sm font-medium truncate">{result.original.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {t.original} {formatBytes(result.original.size)}
                  </Badge>
                  <Badge className="text-xs">
                    {t.compressed} {formatBytes(result.compressed.size)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs text-green-600">
                    {t.saved} {getCompressionRatio(result.original.size, result.compressed.size)}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDownload(result)}
                >
                  <Download size={14} className="mr-1" />
                  {t.download}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
