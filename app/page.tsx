"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Video, FileCode, Layers, MessageCircle, Mail } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLang } from "@/components/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

const ImageCompressor = dynamic(() => import("@/components/ImageCompressor"), { ssr: false });
const VideoCompressor = dynamic(() => import("@/components/VideoCompressor"), { ssr: false });
const ImageToH5 = dynamic(() => import("@/components/ImageToH5"), { ssr: false });
const VideoToH5 = dynamic(() => import("@/components/VideoToH5"), { ssr: false });

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
        <Tabs defaultValue="image-compress">
          <TabsList className="grid grid-cols-4 mb-6 h-auto">
            <TabsTrigger
              value="image-compress"
              className="flex flex-col gap-1 py-2 text-xs sm:text-sm sm:flex-row sm:gap-2"
            >
              <ImageIcon size={15} />
              <span>{t.tabImageCompress}</span>
            </TabsTrigger>
            <TabsTrigger
              value="video-compress"
              className="flex flex-col gap-1 py-2 text-xs sm:text-sm sm:flex-row sm:gap-2"
            >
              <Video size={15} />
              <span>{t.tabVideoCompress}</span>
            </TabsTrigger>
            <TabsTrigger
              value="image-h5"
              className="flex flex-col gap-1 py-2 text-xs sm:text-sm sm:flex-row sm:gap-2"
            >
              <ImageIcon size={15} />
              <span>{t.tabImageH5}</span>
            </TabsTrigger>
            <TabsTrigger
              value="video-h5"
              className="flex flex-col gap-1 py-2 text-xs sm:text-sm sm:flex-row sm:gap-2"
            >
              <FileCode size={15} />
              <span>{t.tabVideoH5}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image-compress">
            <ImageCompressor />
          </TabsContent>
          <TabsContent value="video-compress">
            <VideoCompressor />
          </TabsContent>
          <TabsContent value="image-h5">
            <ImageToH5 />
          </TabsContent>
          <TabsContent value="video-h5">
            <VideoToH5 />
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
