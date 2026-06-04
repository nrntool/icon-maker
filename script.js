const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* ズーム・移動用 */
let scale = 1;
let minScale = 1;
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

/* ピンチ中心（指2本の中心） */
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

  /* ピンチズーム（指位置を中心に補正） */
  if (e.touches.length === 2) {
    const dist = getDistance(e.touches);
    const center = getCenter(e.touches);

    const delta = (dist - lastDist) * 0.005;
    const oldScale = scale;

    scale += delta;
    scale = Math.max(minScale, Math.min(maxScale, scale));

    const zoomRatio = scale / oldScale;

    const rect = canvas.getBoundingClientRect();
    const cx = center.x - rect.left;
    const cy = center.y - rect.top;

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

/* 描画処理（中央トリミングなし・カットなし） */
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

/* 保存 */
document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "framelab.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

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
