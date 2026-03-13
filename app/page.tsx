"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minimize2, FileCode2, Shuffle, Layers, MessageCircle, Mail } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLang } from "@/components/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

const SmartCompressor = dynamic(() => import("@/components/SmartCompressor"), { ssr: false });
const SmartH5Converter = dynamic(() => import("@/components/SmartH5Converter"), { ssr: false });
const VideoObfuscator = dynamic(() => import("@/components/VideoObfuscator"), { ssr: false });

export default function Home() {
  const { t } = useLang();

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-primary text-primary-foreground shrink-0">
                <Layers size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight leading-tight">{t.appName}</h1>
                <p className="text-xs text-muted-foreground">{t.appNameEn}</p>
              </div>
            </div>
            <LanguageToggle className="shrink-0 mt-1" />
          </div>
          <p className="text-muted-foreground mt-3 text-sm">{t.appDesc}</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="compress">
          <TabsList className="grid grid-cols-3 mb-6 h-auto">
            <TabsTrigger
              value="compress"
              className="flex flex-col gap-1 py-2 text-xs sm:text-sm sm:flex-row sm:gap-2"
            >
              <Minimize2 size={15} />
              <span>压缩（自动识别）</span>
            </TabsTrigger>
            <TabsTrigger
              value="to-h5"
              className="flex flex-col gap-1 py-2 text-xs sm:text-sm sm:flex-row sm:gap-2"
            >
              <FileCode2 size={15} />
              <span>转 H5（自动识别）</span>
            </TabsTrigger>
            <TabsTrigger
              value="obfuscate"
              className="flex flex-col gap-1 py-2 text-xs sm:text-sm sm:flex-row sm:gap-2"
            >
              <Shuffle size={15} />
              <span>视频混淆</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compress">
            <SmartCompressor />
          </TabsContent>
          <TabsContent value="to-h5">
            <SmartH5Converter />
          </TabsContent>
          <TabsContent value="obfuscate">
            <VideoObfuscator />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-12 space-y-5 border-t border-border pt-6">
          {/* Nav Links */}
          <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t.footerPrivacy}
            </Link>
            <span className="w-px h-3 bg-border" />
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t.footerTerms}
            </Link>
            <span className="w-px h-3 bg-border" />
            <Link href="/blog" className="hover:text-foreground transition-colors">
              {t.footerBlog}
            </Link>
          </div>

          {/* Feedback */}
          <div className="text-center space-y-1.5">
            <p className="text-xs font-medium text-foreground">{t.footerFeedback}</p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <MessageCircle size={13} />
                {t.footerWechat}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={13} />
                <a href="mailto:ak474399@gmail.com" className="hover:text-foreground transition-colors">
                  {t.footerEmail}
                </a>
              </span>
            </div>
          </div>

          {/* Privacy note */}
          <p className="text-center text-xs text-muted-foreground">
            {t.localProcess}
          </p>
        </footer>
      </div>
    </main>
  );
}
