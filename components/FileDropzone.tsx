"use client";

import { useCallback } from "react";
import { useDropzone, Accept } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/zipUtils";

interface FileDropzoneProps {
  accept?: Accept;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export default function FileDropzone({
  accept,
  multiple = false,
  files,
  onFilesChange,
  maxFiles = 1,
  label = "点击或拖拽文件到此处",
  hint,
  disabled = false,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (multiple) {
        const next = [...files, ...accepted].slice(0, maxFiles);
        onFilesChange(next);
      } else {
        onFilesChange(accepted.slice(0, 1));
      }
    },
    [files, multiple, maxFiles, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles,
    disabled,
  });

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 text-muted-foreground" size={36} />
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate font-medium">{file.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatBytes(file.size)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="ml-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                disabled={disabled}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
