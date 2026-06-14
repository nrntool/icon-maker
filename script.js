// ================================
// FrameLab ドラッグ慣性つき完全版（ズレゼロ修正版）
// ================================

const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ▼ GitHub raw URLからフレーム一覧を取得
async function loadFramesFromGitHub() {
  const repo = "framesynth/icon-maker";
  const framesUrl = `https://api.github.com/repos/${repo}/contents/frames?t=${Date.now()}`;

  try {
    const response = await fetch(framesUrl, { cache: "no-cache" });
    const data = await response.json();

    frameSelect.innerHTML = '<option value="">選択してください</option>';

    data.forEach(item => {
      if (item.name.endsWith(".png")) {
        const rawUrl = `https://raw.githubusercontent.com/${repo}/main/frames/${item.name}`;
        const option = document.createElement("option");
        option.value = rawUrl;
        option.textContent = item.name.replace(".png", "");
        frameSelect.appendChild(option);
      }
    });
  } catch (err) {
    console.error("GitHub API 読み込みエラー:", err);
    frameSelect.innerHTML = '<option value="">読み込み失敗</option>';
  }
}

// ▼ Canvas サイズ調整
function resizeCanvas() {
  const size = canvas.clientWidth;
  if (!size) return;
  canvas.width = size;
  canvas.height = size;
  redraw();
}

window.addEventListener("DOMContentLoaded", () => {
  loadFramesFromGitHub();
  setTimeout(resizeCanvas, 50);
});

window.addEventListener("resize", () => {
  setTimeout(resizeCanvas, 50);
});

let baseImage = null;
let frameImage = null;

let scale = 1;
let minScale = 0.3;
let maxScale = 4;

let offsetX = 0;
let offsetY = 0;

// ▼ 画像読み込み
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = baseImage.width;
      const ih = baseImage.height;

      const fitScale = Math.min(cw / iw, ch / ih);
      scale = fitScale;
      minScale = fitScale * 0.3;

      offsetX = cw / 2 - (iw * scale) / 2;
      offsetY = ch / 2 - (ih * scale) / 2;

      redraw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ▼ フレーム選択
frameSelect.addEventListener("change", () => {
  const value = frameSelect.value;
  if (!value) {
    frameImage = null;
    redraw();
    return;
  }

  frameImage = new Image();
  frameImage.crossOrigin = "anonymous";
  frameImage.onload = redraw;
  frameImage.src = value;
});

// ▼ ピンチ距離
function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ▼ ピンチ中心
function getCenter(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  };
}

let isDragging = false;
let lastX = null;
let lastY = null;
let lastDist = null;

// ▼ 慣性用の速度
let vx = 0;
let vy = 0;
let lastMoveTime = 0;

// ================================
// ▼ タッチ開始（ズレゼロ修正版）
// ================================
canvas.addEventListener("touchstart", (e) => {
  const rect = canvas.getBoundingClientRect();

  if (e.touches.length === 1) {
    isDragging = true;

    lastX = e.touches[0].clientX - rect.left;
    lastY = e.touches[0].clientY - rect.top;

    vx = 0;
    vy = 0;
    lastMoveTime = performance.now();
  }

  if (e.touches.length === 2) {
    lastDist = getDistance(e.touches);
  }
});

// ================================
// ▼ タッチ移動（ピンチ＋ドラッグ慣性）
// ================================
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();

  // ▼ 2本指ピンチ
  if (e.touches.length === 2) {
    const dist = getDistance(e.touches);
    const center = getCenter(e.touches);

    const cx = center.x - rect.left;
    const cy = center.y - rect.top;

    const oldScale = scale;
    const delta = (dist - lastDist) * 0.004;

    scale = Math.max(minScale, Math.min(maxScale, scale + delta));

    const zoomRatio = scale / oldScale;
    offsetX = cx - (cx - offsetX) * zoomRatio;
    offsetY = cy - (cy - offsetY) * zoomRatio;

    lastDist = dist;
    redraw();
    return;
  }

  // ▼ 1本指ドラッグ（慣性つき）
  if (e.touches.length === 1 && isDragging) {
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    const now = performance.now();
    const dt = now - lastMoveTime;

    const dx = x - lastX;
    const dy = y - lastY;

    vx = dx / dt;
    vy = dy / dt;

    offsetX += dx;
    offsetY += dy;

    lastX = x;
    lastY = y;
    lastMoveTime = now;

    redraw();
  }
}, { passive: false });

// ================================
// ▼ タッチ終了 → 慣性開始
// ================================
canvas.addEventListener("touchend", () => {
  isDragging = false;
  lastX = null;
  lastY = null;
  lastDist = null;
  startInertia();
});

// ▼ 慣性アニメーション
function startInertia() {
  const friction = 0.95;
  const minSpeed = 0.001;

  function animate() {
    offsetX += vx * 16;
    offsetY += vy * 16;

    vx *= friction;
    vy *= friction;

    redraw();

    if (Math.abs(vx) > minSpeed || Math.abs(vy) > minSpeed) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// ▼ 描画
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (baseImage) {
    const drawW = baseImage.width * scale;
    const drawH = baseImage.height * scale;
    ctx.drawImage(baseImage, offsetX, offsetY, drawW, drawH);
  }

  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  }
}

// ▼ 保存処理
function saveHighRes() {
  if (!baseImage) {
    alert("画像が選択されていません。");
    return;
  }

  const scaleFactor = 3;
  const saveCanvas = document.createElement("canvas");
  saveCanvas.width = canvas.width * scaleFactor;
  saveCanvas.height = canvas.height * scaleFactor;
  const sctx = saveCanvas.getContext("2d");

  sctx.fillStyle = "#ffffff";
  sctx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);

  const drawW = baseImage.width * scale * scaleFactor;
  const drawH = baseImage.height * scale * scaleFactor;
  const x = offsetX * scaleFactor;
  const y = offsetY * scaleFactor;

  sctx.drawImage(baseImage, x, y, drawW, drawH);

  if (frameImage && frameImage.complete) {
    sctx.drawImage(frameImage, 0, 0, saveCanvas.width, saveCanvas.height);
  }

  const now = new Date();
  const filename = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.png`;

  saveCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, "image/png");
}

document.getElementById("saveBtn").addEventListener("click", saveHighRes);
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  imageInput.value = "";
  frameSelect.value = "";
  redraw();
});
