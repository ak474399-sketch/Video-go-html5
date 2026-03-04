# H5 素材生成器 · H5 Asset Generator

> 图片/视频压缩 & 转 H5 ZIP 包 · 纯浏览器端处理，文件不上传服务器

[English](#english) | [中文](#中文)

---

## 中文

### 功能特性

| 功能 | 说明 |
|------|------|
| 🖼 图片压缩 | 支持批量 JPG/PNG/WebP，可调节质量和最大体积 |
| 🎬 视频压缩 | FFmpeg.wasm 处理，**保留 BGM**，CRF 参数精细控制画质 |
| 📦 图片转 H5 | 多图生成移动端轮播 H5 + ZIP 包（< 5MB，自动重试） |
| 🎥 视频转 H5 | 自动计算目标码率，确保 ZIP 包 < 5MB，保留音频 |

### 技术栈

- **Next.js 14** (App Router)
- **@ffmpeg/ffmpeg** — WebAssembly 版 FFmpeg，浏览器内视频处理
- **browser-image-compression** — 浏览器端图片压缩
- **jszip** — 浏览器内生成 ZIP 包
- **shadcn/ui + Tailwind CSS** — 现代 UI
- **双语支持** — 中文 / English

### 本地运行

```bash
npm install
npm run dev
# 访问 http://localhost:3000
```

### 注意事项

- 视频功能首次使用需加载 FFmpeg WASM（约 10–30 秒）
- 建议使用 Chrome / Edge 最新版本
- 所有处理均在浏览器本地完成，文件不上传服务器

### 联系 / 意见反馈

- 微信：**v_winfield**
- 邮箱：**ak474399@gmail.com**

---

## English

### Features

| Feature | Description |
|---------|-------------|
| 🖼 Image Compression | Batch JPG/PNG/WebP with adjustable quality & max size |
| 🎬 Video Compression | FFmpeg.wasm powered, **BGM preserved**, fine-grained CRF control |
| 📦 Image → H5 | Multiple images → mobile swipeable H5 + ZIP (< 5 MB, auto-retry) |
| 🎥 Video → H5 | Auto-calculated bitrate keeps ZIP < 5 MB with audio intact |

### Tech Stack

- **Next.js 14** (App Router)
- **@ffmpeg/ffmpeg** — WebAssembly FFmpeg for in-browser video processing
- **browser-image-compression** — client-side image compression
- **jszip** — in-browser ZIP generation
- **shadcn/ui + Tailwind CSS** — modern UI
- **Bilingual** — Chinese / English

### Getting Started

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Notes

- First video processing requires loading FFmpeg WASM (~10–30 s)
- Latest Chrome / Edge recommended
- All processing is 100% local — files are never uploaded

### Feedback

- WeChat: **v_winfield**
- Email: **ak474399@gmail.com**

---

## License

MIT
