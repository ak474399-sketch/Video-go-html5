"use client";

import Link from "next/link";
import { useLang } from "@/components/LanguageContext";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const posts = {
  zh: [
    {
      slug: "image-compression-guide",
      title: "图片压缩完全指南：如何在保证画质的前提下大幅减小体积",
      summary:
        "图片是 H5 页面中最重要的视觉元素，也是影响加载速度的关键因素。本文介绍 JPG、PNG、WebP 三种格式的压缩策略，以及在不同场景下的最佳参数选择。",
      date: "2024-03-15",
      readTime: "5 分钟",
      tags: ["图片优化", "WebP", "性能"],
    },
    {
      slug: "video-bgm-tips",
      title: "视频压缩时如何确保 BGM 不丢失：CRF 与音频码率详解",
      summary:
        "很多开发者在压缩视频时会误删音轨，导致 H5 页面没有背景音乐。本文深入讲解 FFmpeg 的 -c:a aac 参数，以及如何平衡视频画质与音频质量。",
      date: "2024-03-08",
      readTime: "7 分钟",
      tags: ["视频压缩", "FFmpeg", "BGM"],
    },
    {
      slug: "h5-size-optimization",
      title: "H5 ZIP 包为何要控制在 5MB 以内？微信分享限制详解",
      summary:
        "微信对 H5 页面的资源加载有严格限制，超过 5MB 的素材包在移动网络下加载体验极差，甚至无法正常打开。本文从技术角度解析这一限制并提供实用优化策略。",
      date: "2024-03-01",
      readTime: "6 分钟",
      tags: ["H5", "微信", "性能优化"],
    },
    {
      slug: "webassembly-ffmpeg",
      title: "WebAssembly FFmpeg：让视频处理完全跑在浏览器里",
      summary:
        "传统视频处理需要服务器，而 @ffmpeg/ffmpeg 让 FFmpeg 直接运行在浏览器中。本文介绍 WASM 版 FFmpeg 的工作原理、SharedArrayBuffer 的必要性，以及如何实现进度回调。",
      date: "2024-02-20",
      readTime: "8 分钟",
      tags: ["WebAssembly", "FFmpeg", "前端技术"],
    },
    {
      slug: "mobile-h5-best-practices",
      title: "移动端 H5 最佳实践：轮播、触屏手势与全屏视频",
      summary:
        "一个优秀的移动端 H5 页面需要考虑很多细节：触屏滑动、视口适配、iOS Safari 的自动播放限制……本文整理了实战中遇到的常见问题及解决方案。",
      date: "2024-02-10",
      readTime: "10 分钟",
      tags: ["移动端", "H5", "CSS", "JavaScript"],
    },
    {
      slug: "next-js-media-tool",
      title: "用 Next.js 打造纯前端媒体处理工具：架构设计与实践",
      summary:
        "如何用 Next.js App Router 构建一个无需后端的媒体处理工具？本文分享 H5 素材生成器的完整架构设计，包括 FFmpeg.wasm 单例管理、图片压缩流水线和 ZIP 自动重试机制。",
      date: "2024-01-28",
      readTime: "12 分钟",
      tags: ["Next.js", "架构设计", "开源"],
    },
  ],
  en: [
    {
      slug: "image-compression-guide",
      title: "The Complete Guide to Image Compression: Reduce File Size Without Sacrificing Quality",
      summary:
        "Images are the most important visual element in H5 pages and the biggest factor affecting load speed. This guide covers compression strategies for JPG, PNG, and WebP formats with optimal parameters for different use cases.",
      date: "2024-03-15",
      readTime: "5 min read",
      tags: ["Image Optimization", "WebP", "Performance"],
    },
    {
      slug: "video-bgm-tips",
      title: "How to Preserve BGM During Video Compression: CRF and Audio Bitrate Explained",
      summary:
        "Many developers accidentally strip audio tracks while compressing videos, resulting in H5 pages with no background music. This post dives into FFmpeg's -c:a aac parameter and how to balance video and audio quality.",
      date: "2024-03-08",
      readTime: "7 min read",
      tags: ["Video Compression", "FFmpeg", "BGM"],
    },
    {
      slug: "h5-size-optimization",
      title: "Why Keep H5 ZIP Packages Under 5 MB? WeChat Load Constraints Explained",
      summary:
        "WeChat imposes strict limits on H5 asset loading. Packages over 5 MB load extremely poorly on mobile networks and may fail to open entirely. This post explains the technical constraints and practical optimization strategies.",
      date: "2024-03-01",
      readTime: "6 min read",
      tags: ["H5", "WeChat", "Performance"],
    },
    {
      slug: "webassembly-ffmpeg",
      title: "WebAssembly FFmpeg: Running Video Processing Entirely in the Browser",
      summary:
        "Video processing traditionally required a server. @ffmpeg/ffmpeg runs FFmpeg directly in the browser. This post explains how WASM FFmpeg works, why SharedArrayBuffer is required, and how to implement a progress callback.",
      date: "2024-02-20",
      readTime: "8 min read",
      tags: ["WebAssembly", "FFmpeg", "Frontend"],
    },
    {
      slug: "mobile-h5-best-practices",
      title: "Mobile H5 Best Practices: Carousels, Touch Gestures & Fullscreen Video",
      summary:
        "A great mobile H5 page requires careful attention to touch swipe, viewport scaling, and iOS Safari autoplay restrictions. This post compiles common real-world issues and their solutions.",
      date: "2024-02-10",
      readTime: "10 min read",
      tags: ["Mobile", "H5", "CSS", "JavaScript"],
    },
    {
      slug: "next-js-media-tool",
      title: "Building a Pure-Frontend Media Tool with Next.js: Architecture & Implementation",
      summary:
        "How do you build a backend-free media processing tool with Next.js App Router? This post shares the complete architecture of H5 Asset Generator — including FFmpeg.wasm singleton management, image compression pipelines, and ZIP auto-retry.",
      date: "2024-01-28",
      readTime: "12 min read",
      tags: ["Next.js", "Architecture", "Open Source"],
    },
  ],
};

export default function BlogPage() {
  const { lang, t } = useLang();
  const list = posts[lang];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={15} />
          {t.backToHome}
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">{t.blogTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.blogDesc}</p>
        </div>

        <div className="space-y-4">
          {list.map((post) => (
            <Card key={post.slug} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4 space-y-3">
                <h2 className="font-semibold text-base leading-snug">{post.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{post.summary}</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {post.readTime}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-primary cursor-pointer hover:underline">
                  {t.readMore}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
