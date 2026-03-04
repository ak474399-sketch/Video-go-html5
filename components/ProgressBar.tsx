"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
  showPercent?: boolean;
}

export default function ProgressBar({
  progress,
  label,
  className,
  showPercent = true,
}: ProgressBarProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          {label && <span>{label}</span>}
          {showPercent && <span className="tabular-nums">{progress}%</span>}
        </div>
      )}
      <Progress value={progress} className="h-2" />
    </div>
  );
}
