// ================================
// FrameLab 安全版 script.js（完全ファイル）
// ================================

const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ▼ 日本語ファイル名を整形
function formatFrameName(name) {
  return name
    .replace(".png", "")
    .replace(/[_\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ▼ GitHub APIからフレーム一覧を取得（安全版）
async function loadFrames() {
  const repo = "framesynth/icon-maker";
  const apiUrl = `https://api.github.com/repos/${repo}/contents/frames`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": "FrameLab-Client"
      }
    });

    const data = await response.json();

    // ▼ APIエラー時の安全処理
    if (!Array.isArray(data)) {
      console.error("GitHub API error:", data);
      frameSelect.innerHTML = '<option value="">フレーム読み込みエラー</option>';
      return;
    }

    frameSelect.innerHTML = '<option value="">選択してください</option>';

    data.forEach(item => {
      if (item.name.endsWith(".png")) {
        const option = document.createElement("option");
        option.value = item.download_url;
        option.textContent = formatFrameName(item.name);
        frameSelect.appendChild(option);
      }
    });
  } catch (err) {
    console.error("フレーム一覧取得エラー:", err);
    frameSelect.innerHTML = '<option value="">読み込み失敗</option>';
  }
}

// ▼ 初期化
window.addEventListener("DOMContentLoaded", () => {
  loadFrames();
  resizeCanvas();
});

let baseImage = null;
let frameImage = null;

let scale = 1;
let minScale = 0.3;
let maxScale = 4;

let offsetX = 0;
let offsetY = 0;

let lastX = 0;
let lastY = 0;

let lastDist = 0;
let isDragging = false;

// ▼ Canvasサイズ調整（安全版）
function resizeCanvas() {
  const size = canvas.clientWidth;
  if (size === 0) return; // レイアウト未確定対策
  canvas.width = size;
  canvas.height = size;
  redraw();
}

window.addEventListener("resize", resizeCanvas);

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

// ▼ タッチ開始
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }
  if (e.touches.length === 2) {
    lastDist = getDistance(e.touches);
  }
});

// ▼ タッチ移動
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();

  if (e.touches.length === 2) {
    const dist = getDistance(e.touches);
    const center = getCenter(e.touches);

    const rect = canvas.getBoundingClientRect();
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

  if (e.touches.length === 1 && isDragging) {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    offsetX += (x - lastX);
    offsetY += (y - lastY);

    lastX = x;
    lastY = y;

    redraw();
  }
});

canvas.addEventListener("touchend", () => {
  isDragging = false;
});

// ▼ 描画
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (baseImage) {
    const drawW = baseImage.width * scale;
    const drawH = baseImage.height * scale;
    ctx.drawImage(baseImage, offsetX, offsetY, drawW, drawH);
  }

  if (frameImage) {
    const cw = canvas.width;
    const ch = canvas.height;
    const size = Math.min(cw, ch);
    const x = (cw - size) / 2;
    const y = (ch - size) / 2;
    ctx.drawImage(frameImage, x, y, size, size);
  }
}

// ▼ 保存処理（高解像度）
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

  if (frameImage) {
    const cw = saveCanvas.width;
    const ch = saveCanvas.height;
    const size = Math.min(cw, ch);
    const fx = (cw - size) / 2;
    const fy = (ch - size) / 2;
    sctx.drawImage(frameImage, fx, fy, size, size);
  }

  const now = new Date();
  const filename = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.png`;

  const link = document.createElement("a");
  link.download = filename;
  link.href = saveCanvas.toDataURL("image/png");
  link.click();
}

// ▼ ボタンイベント
document.getElementById("saveBtn").addEventListener("click", saveHighRes);
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  imageInput.value = "";
