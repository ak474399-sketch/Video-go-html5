"use client";

import Link from "next/link";
import { useLang } from "@/components/LanguageContext";
import { ArrowLeft } from "lucide-react";

const content = {
  zh: {
    title: "服务条款",
    updated: "最后更新：2024 年 3 月",
    sections: [
      {
        heading: "1. 接受条款",
        body: '使用 H5 素材生成器（以下简称\u201c本工具\u201d）即表示您同意本服务条款。如您不同意这些条款，请停止使用本工具。',
      },
      {
        heading: "2. 服务说明",
        body: "本工具提供以下免费功能：\n• 图片压缩（JPG、PNG、WebP）\n• 视频压缩（MP4、MOV、AVI、MKV 等，保留音频）\n• 图片转 H5 ZIP 包（移动端轮播展示）\n• 视频转 H5 ZIP 包（确保 ZIP < 5MB）\n\n所有功能均在浏览器端本地处理，不依赖服务器。",
      },
      {
        heading: "3. 使用限制",
        body: "您同意不将本工具用于：\n• 处理或传播违法内容\n• 侵犯他人知识产权的内容\n• 任何违反中国法律法规或您所在地法律的用途\n\n本工具仅供个人和合法商业用途使用。",
      },
      {
        heading: "4. 知识产权",
        body: "本工具的代码、设计和内容归作者所有。您处理的文件及其内容的版权归您或原版权持有人所有，我们不主张任何权利。",
      },
      {
        heading: "5. 免责声明",
        body: '本工具按\u201c现状\u201d提供，不提供任何明示或暗示的担保。我们不对以下情况承担责任：\n\u2022 文件处理失败或输出质量不符合预期\n\u2022 因使用本工具导致的任何直接或间接损失\n\u2022 浏览器兼容性问题导致的功能异常\n\n处理前请务必备份重要文件。',
      },
      {
        heading: "6. 服务变更",
        body: "我们保留随时修改、暂停或终止本工具任何功能的权利，恕不另行通知。",
      },
      {
        heading: "7. 适用法律",
        body: "本条款受中华人民共和国法律管辖。如发生争议，双方应首先通过友好协商解决。",
      },
      {
        heading: "8. 联系我们",
        body: "如对服务条款有任何疑问：\n微信：v_winfield\n邮箱：ak474399@gmail.com",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: "Last updated: March 2024",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: 'By using H5 Asset Generator (the "Tool"), you agree to these Terms of Service. If you do not agree, please discontinue use of the Tool.',
      },
      {
        heading: "2. Service Description",
        body: "The Tool provides the following free features:\n• Image compression (JPG, PNG, WebP)\n• Video compression (MP4, MOV, AVI, MKV, etc., audio preserved)\n• Image → H5 ZIP package (mobile swipeable carousel)\n• Video → H5 ZIP package (ZIP kept under 5 MB)\n\nAll processing is performed locally in the browser with no server dependency.",
      },
      {
        heading: "3. Prohibited Uses",
        body: "You agree not to use the Tool to:\n• Process or distribute illegal content\n• Infringe on the intellectual property rights of others\n• Violate any applicable local, national, or international law or regulation",
      },
      {
        heading: "4. Intellectual Property",
        body: "The Tool's code, design, and content are owned by the author. Files you process and their content remain your property or the property of their original copyright holders — we claim no rights over them.",
      },
      {
        heading: "5. Disclaimer of Warranties",
        body: 'The Tool is provided "as is" without any express or implied warranties. We are not liable for:\n\u2022 File processing failures or output quality not meeting expectations\n\u2022 Any direct or indirect loss resulting from use of the Tool\n\u2022 Feature malfunctions due to browser compatibility issues\n\nAlways back up important files before processing.',
      },
      {
        heading: "6. Service Changes",
        body: "We reserve the right to modify, suspend, or discontinue any feature of the Tool at any time without prior notice.",
      },
      {
        heading: "7. Governing Law",
        body: "These Terms are governed by applicable law. Any disputes shall first be resolved through good-faith negotiation.",
      },
      {
        heading: "8. Contact",
        body: "Questions about these Terms?\nWeChat: v_winfield\nEmail: ak474399@gmail.com",
      },
    ],
  },
};

export default function TermsPage() {
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
