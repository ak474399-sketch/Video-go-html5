"use client";

import Link from "next/link";
import { useLang } from "@/components/LanguageContext";
import { ArrowLeft } from "lucide-react";

const content = {
  zh: {
    title: "隐私协议",
    updated: "最后更新：2024 年 3 月",
    sections: [
      {
        heading: "1. 概述",
        body: '欢迎使用 H5 素材生成器（以下简称\u201c本工具\u201d）。我们非常重视您的隐私，本协议旨在说明我们如何处理您使用本工具时产生的信息。',
      },
      {
        heading: "2. 数据不上传原则",
        body: "本工具所有处理均在您的浏览器本地完成，包括图片压缩、视频压缩、H5 生成等功能。您上传的任何文件均不会传输到我们的服务器或任何第三方服务器，全程保留在您的设备内存中。",
      },
      {
        heading: "3. 我们收集的信息",
        body: "本工具本身不收集任何个人信息，不设置 Cookie，不进行用户追踪。如果您通过邮件或微信联系我们提供反馈，我们仅将您的联系信息用于回复您的咨询，不会用于任何商业目的。",
      },
      {
        heading: "4. 第三方资源",
        body: "本工具通过 CDN 加载 FFmpeg WebAssembly 文件（来自 unpkg.com）。在加载过程中，您的 IP 地址可能会被该 CDN 服务记录，这不在我们的控制范围内。我们建议您查阅 unpkg 的隐私政策了解详情。",
      },
      {
        heading: "5. 未成年人保护",
        body: "本工具不面向 18 岁以下未成年人，我们不会有意收集未成年人的任何信息。",
      },
      {
        heading: "6. 协议变更",
        body: "我们可能会不定期更新本隐私协议。重大变更时，我们会在工具页面顶部显示通知。继续使用本工具即表示您接受更新后的协议。",
      },
      {
        heading: "7. 联系我们",
        body: "如您对本隐私协议有任何疑问，请通过以下方式联系：\n微信：v_winfield\n邮箱：ak474399@gmail.com",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: March 2024",
    sections: [
      {
        heading: "1. Overview",
        body: 'Welcome to H5 Asset Generator (the "Tool"). We take your privacy seriously. This policy explains how we handle information when you use the Tool.',
      },
      {
        heading: "2. Local Processing — No Uploads",
        body: "All processing in this Tool is performed entirely within your browser, including image compression, video compression, and H5 generation. Files you select are never transmitted to our servers or any third-party server \u2014 they remain in your device's memory throughout the process.",
      },
      {
        heading: "3. Information We Collect",
        body: "The Tool itself collects no personal information, sets no cookies, and performs no user tracking. If you contact us via email or WeChat with feedback, we use your contact information only to respond to your inquiry and never for commercial purposes.",
      },
      {
        heading: "4. Third-Party Resources",
        body: "The Tool loads FFmpeg WebAssembly files from a CDN (unpkg.com). Your IP address may be logged by that CDN service during loading, which is outside our control. We recommend reviewing unpkg's privacy policy for details.",
      },
      {
        heading: "5. Children's Privacy",
        body: "The Tool is not directed at individuals under the age of 18, and we do not knowingly collect information from minors.",
      },
      {
        heading: "6. Policy Changes",
        body: "We may update this Privacy Policy from time to time. For significant changes, we will display a notice at the top of the page. Continued use of the Tool constitutes acceptance of the updated policy.",
      },
      {
        heading: "7. Contact Us",
        body: "If you have questions about this Privacy Policy, please reach out:\nWeChat: v_winfield\nEmail: ak474399@gmail.com",
      },
    ],
  },
};

export default function PrivacyPage() {
  const { lang, t } = useLang();
  const c = content[lang];

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

        <h1 className="text-2xl font-bold tracking-tight mb-1">{c.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">{c.updated}</p>

        <div className="space-y-6 text-sm leading-relaxed">
          {c.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-semibold text-base mb-2">{section.heading}</h2>
              <p className="text-muted-foreground whitespace-pre-line">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
