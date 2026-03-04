"use client";

import { useLang } from "./LanguageContext";
import { cn } from "@/lib/utils";

export default function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted/50 p-0.5 text-xs font-medium select-none",
        className
      )}
    >
      <button
        onClick={() => setLang("zh")}
        className={cn(
          "px-2.5 py-1 rounded-full transition-all",
          lang === "zh"
            ? "bg-background shadow text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        中文
      </button>
      <button
        onClick={() => setLang("en")}
        className={cn(
          "px-2.5 py-1 rounded-full transition-all",
          lang === "en"
            ? "bg-background shadow text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
    </div>
  );
}
