const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* ズーム・移動用 */
let scale = 1;
let minScale = 0.3;
let maxScale = 4;

let offsetX = 0;
let offsetY = 0;

let lastX = 0;
let lastY = 0;

let lastDist = 0;
let isDragging = false;

/* キャンバス自動リサイズ */
function resizeCanvas() {
  const size = canvas.clientWidth;
  canvas.width = size;
  canvas.height = size;
  redraw();
}

window.addEventListener("load", resizeCanvas);
window.addEventListener("resize", resizeCanvas);

/* フレーム一覧を読み込む */
fetch("frames.json")
  .then((response) => response.json())
  .then((frames) => {
    frames.forEach((file) => {
      const option = document.createElement("option");
      option.value = `frames/${file}`;
      option.textContent = file.replace(".png", "");
      frameSelect.appendChild(option);
    });
  });

/* 画像読み込み */
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      redraw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* フレーム選択 */
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

/* ピンチ距離 */
function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ピンチ中心 */
function getCenter(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  };
}

/* タッチ開始 */
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

/* タッチ移動 */
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();

  /* ピンチズーム */
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

  /* ドラッグ移動 */
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

/* タッチ終了 */
canvas.addEventListener("touchend", () => {
  isDragging = false;
});

/* 描画処理（カットなし） */
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (baseImage) {
    const drawW = baseImage.width * scale;
    const drawH = baseImage.height * scale;

    ctx.drawImage(baseImage, offsetX, offsetY, drawW, drawH);
  }

  if (frameImage) {
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  }
}

/* 高解像度保存 */
function saveHighRes() {
  if (!baseImage) return;

  const scaleFactor = 3; // ← 高解像度倍率

  const saveCanvas = document.createElement("canvas");
  saveCanvas.width = canvas.width * scaleFactor;
  saveCanvas.height = canvas.height * scaleFactor;
  const sctx = saveCanvas.getContext("2d");

  // 背景白
  sctx.fillStyle = "#ffffff";
  sctx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);

  // 画像描画（ズーム・移動を反映）
  const drawW = baseImage.width * scale * scaleFactor;
  const drawH = baseImage.height * scale * scaleFactor;

  const x = offsetX * scaleFactor;
  const y = offsetY * scaleFactor;

  sctx.drawImage(baseImage, x, y, drawW, drawH);

  // フレーム描画
  if (frameImage) {
    sctx.drawImage(frameImage, 0, 0, saveCanvas.width, saveCanvas.height);
  }

  // 保存
  const link = document.createElement("a");
  link.download = "framelab_highres.png";
  link.href = saveCanvas.toDataURL("image/png");
  link.click();
}

/* 保存ボタン */
document.getElementById("saveBtn").addEventListener("click", saveHighRes);

/* リセット */
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
