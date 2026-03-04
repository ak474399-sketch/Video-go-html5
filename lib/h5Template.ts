export interface H5ImageOptions {
  title?: string;
  images: Array<{ filename: string; alt?: string }>;
  bgColor?: string;
}

export interface H5VideoOptions {
  title?: string;
  videoFilename: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export function generateImageH5(options: H5ImageOptions): string {
  const { title = "图片展示", images, bgColor = "#000" } = options;

  const slides = images
    .map(
      (img, i) => `
    <div class="slide ${i === 0 ? "active" : ""}" data-index="${i}">
      <img src="assets/${img.filename}" alt="${img.alt || `图片 ${i + 1}`}" />
    </div>`
    )
    .join("");

  const dots =
    images.length > 1
      ? `<div class="dots">${images
          .map((_, i) => `<span class="dot ${i === 0 ? "active" : ""}" data-idx="${i}"></span>`)
          .join("")}</div>`
      : "";

  const navButtons =
    images.length > 1
      ? `<button class="nav prev" id="prev">&#8249;</button>
         <button class="nav next" id="next">&#8250;</button>`
      : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: ${bgColor};
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .container {
      position: relative;
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .slide {
      display: none;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
    }
    .slide.active { display: flex; }
    .slide img {
      max-width: 100%;
      max-height: 100vh;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
    }
    .nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.2);
      border: none;
      color: #fff;
      font-size: 2.5rem;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: background 0.2s;
    }
    .nav:active { background: rgba(255,255,255,0.4); }
    .prev { left: 12px; }
    .next { right: 12px; }
    .dots {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 10;
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.5);
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
    }
    .dot.active { background: #fff; transform: scale(1.3); }
    .title {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255,255,255,0.85);
      font-size: 1rem;
      font-weight: 500;
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
      z-index: 10;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="container">
    ${images.length > 1 ? `<p class="title">${title}</p>` : ""}
    ${slides}
    ${navButtons}
    ${dots}
  </div>
  ${
    images.length > 1
      ? `<script>
    var current = 0;
    var total = ${images.length};
    var slides = document.querySelectorAll('.slide');
    var dots = document.querySelectorAll('.dot');

    function goTo(n) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (n + total) % total;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    document.getElementById('prev').addEventListener('click', function() { goTo(current - 1); });
    document.getElementById('next').addEventListener('click', function() { goTo(current + 1); });
    dots.forEach(function(d) {
      d.addEventListener('click', function() { goTo(parseInt(d.dataset.idx)); });
    });

    // Touch swipe
    var startX = 0;
    document.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; });
    document.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) dx > 0 ? goTo(current - 1) : goTo(current + 1);
    });
  </script>`
      : ""
  }
</body>
</html>`;
}

export function generateVideoH5(options: H5VideoOptions): string {
  const {
    title = "视频播放",
    videoFilename,
    autoplay = true,
    loop = false,
    muted = false,
  } = options;

  const videoAttrs = [
    "playsinline",
    "controls",
    autoplay ? "autoplay" : "",
    loop ? "loop" : "",
    muted ? "muted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      max-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video {
      width: 100%;
      max-height: 100vh;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>
  <div class="video-wrapper">
    <video ${videoAttrs}>
      <source src="assets/${videoFilename}" type="video/mp4" />
      您的浏览器不支持 HTML5 视频播放。
    </video>
  </div>
</body>
</html>`;
}
