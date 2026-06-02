const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* -----------------------------------------
   フレーム一覧
----------------------------------------- */
const frameFiles = ["01_yoyaku.png"];

function makeLabelFromFilename(filename) {
  return filename
    .replace(/^\d+_?/, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/_/g, " ");
}

function loadFrames() {
  frameFiles.forEach(filename => {
    const path = `./frames/${filename}`;
    const option = document.createElement("option");
    option.value = path;
    option.textContent = makeLabelFromFilename(filename);
    frameSelect.appendChild(option);
  });
}
loadFrames();

/* -----------------------------------------
   変換パラメータ（位置・拡大・回転）
----------------------------------------- */
let posX = 0;
let posY = 0;
let scale = 1;
let angle = 0;

let targetPosX = 0;
let targetPosY = 0;
let targetScale = 1;
let targetAngle = 0;

const smooth = 0.15;

const MIN_SCALE = 0.2;
const MAX_SCALE = 6.0;

/* -----------------------------------------
   キャンバスサイズ（正方形）
----------------------------------------- */
function getCanvasDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  const size = rect.width;
  return { w: size, h: size };
}

/* -----------------------------------------
   描画
----------------------------------------- */
function draw() {
  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  const innerScale = 0.80;
  const innerW = w * innerScale;
  const innerH = h * innerScale;
  const innerX = (w - innerW) / 2;
  const innerY = (h - innerH) / 2;

  // 画像は内側だけに描画
  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerW, innerH);
  ctx.clip();

  if (baseImage) {
    ctx.save();
    ctx.translate(posX, posY);
    ctx.scale(scale, scale);
    ctx.rotate(angle);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

  ctx.restore();

  // フレームはキャンバス全体に描画
  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, w, h);
  }
}

/* -----------------------------------------
   画像読み込み
----------------------------------------- */
imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      const { w, h } = getCanvasDisplaySize();

      const innerScale = 0.80;
      const innerW = w * innerScale;
      const innerH = h * innerScale;
      const innerX = (w - innerW) / 2;
      const innerY = (h - innerH) / 2;

      const scaleFit = Math.min(innerW / baseImage.width, innerH / baseImage.height);

      scale = targetScale = scaleFit;

      const centerX = innerX + innerW / 2;
      const centerY = innerY + innerH / 2;

      posX = targetPosX = centerX - (baseImage.width * scale) / 2;
      posY = targetPosY = centerY - (baseImage.height * scale) / 2;

      angle = targetAngle = 0;

      draw();
    };
    baseImage.src = reader.result;
  };

  reader.readAsDataURL(file);
});

/* -----------------------------------------
   フレーム読み込み
----------------------------------------- */
frameSelect.addEventListener("change", () => {
  if (!frameSelect.value) return;

  frameImage = new Image();
  frameImage.onload = () => draw();
  frameImage.src = frameSelect.value;
});

/* -----------------------------------------
   マウス操作（PC）
----------------------------------------- */
let isDraggingMouse = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

canvas.addEventListener("mousedown", e => {
  isDraggingMouse = true;
  dragOffsetX = e.clientX - targetPosX;
  dragOffsetY = e.clientY - targetPosY;
});

canvas.addEventListener("mousemove", e => {
  if (!isDraggingMouse) return;
  targetPosX = e.clientX - dragOffsetX;
  targetPosY = e.clientY - dragOffsetY;
});

canvas.addEventListener("mouseup", () => {
  isDraggingMouse = false;
});

canvas.addEventListener("mouseleave", () => {
  isDraggingMouse = false;
});

/* -----------------------------------------
   タッチ操作（移動＋ズーム＋回転）
----------------------------------------- */
let lastDist = null;
let lastAngle = null;
let lastCx = null;
let lastCy = null;

let isDraggingTouch = false;
let touchDragOffsetX = 0;
let touchDragOffsetY = 0;

function getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    isDraggingTouch = true;
    touchDragOffsetX = t.clientX - targetPosX;
    touchDragOffsetY = t.clientY - targetPosY;
  }

  if (e.touches.length === 2) {
    const [t1, t2] = e.touches;
    const cx = (t1.clientX + t2.clientX) / 2;
    const cy = (t1.clientY + t2.clientY) / 2;
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const ang = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

    lastCx = cx;
    lastCy = cy;
    lastDist = dist;
    lastAngle = ang;
    isDraggingTouch = false;
  }
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();

  if (e.touches.length === 1 && isDraggingTouch) {
    const t = e.touches[0];
    targetPosX = t.clientX - touchDragOffsetX;
    targetPosY = t.clientY - touchDragOffsetY;
  }

  if (e.touches.length === 2) {
    const [t1, t2] = e.touches;

    const cx = (t1.clientX + t2.clientX) / 2;
    const cy = (t1.clientY + t2.clientY) / 2;

    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const ang = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

    if (lastDist !== null) {
      const scaleRatio = dist / lastDist;
      let newScale = targetScale * scaleRatio;
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      const appliedRatio = newScale / targetScale;

      targetScale = newScale;

      // ズーム中心を2本指の中心に保つ
      targetPosX = cx - (cx - targetPosX) * appliedRatio;
      targetPosY = cy - (cy - targetPosY) * appliedRatio;
    }

    if (lastAngle !== null) {
      const diff = ang - lastAngle;
      targetAngle += diff;
    }

    if (lastCx !== null) {
      targetPosX += cx - lastCx;
      targetPosY += cy - lastCy;
    }

    lastCx = cx;
    lastCy = cy;
    lastDist = dist;
    lastAngle = ang;
  }
}, { passive: false });

canvas.addEventListener("touchend", e => {
  if (e.touches.length === 0) {
    isDraggingTouch = false;
    lastDist = null;
    lastAngle = null;
    lastCx = null;
    lastCy = null;
  }
}, { passive: false });

/* -----------------------------------------
   ホイールズーム（PC）
----------------------------------------- */
canvas.addEventListener("wheel", e => {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  let newScale = targetScale + delta;
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

  const scaleRatio = newScale / targetScale;
  targetScale = newScale;

  targetPosX = cx - (cx - targetPosX) * scaleRatio;
  targetPosY = cy - (cy - targetPosY) * scaleRatio;
}, { passive: false });

/* -----------------------------------------
   アニメーション（追従補間のみ）
----------------------------------------- */
function animate() {
  posX += (targetPosX - posX) * smooth;
  posY += (targetPosY - posY) * smooth;
  scale += (targetScale - scale) * smooth;
  angle += (targetAngle - angle) * smooth;

  draw();
  requestAnimationFrame(animate);
}
animate();

/* -----------------------------------------
   保存（正方形・高解像度）
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
  if (!baseImage) return;

  const { w } = getCanvasDisplaySize();

  const baseSize = w;
  const scaleFactor = 3;

  const innerScale = 0.80;
  const innerW = baseSize * innerScale;
  const innerH = baseSize * innerScale;
  const innerX = (baseSize - innerW) / 2;
  const innerY = (baseSize - innerH) / 2;

  const saveCanvas = document.createElement("canvas");
  saveCanvas.width = baseSize * scaleFactor;
  saveCanvas.height = baseSize * scaleFactor;
  const sctx = saveCanvas.getContext("2d");

  // 背景色を付けたくない場合はこの2行を消す
  sctx.fillStyle = "#cccccc";
  sctx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);

  sctx.save();
  sctx.beginPath();
  sctx.rect(innerX * scaleFactor, innerY * scaleFactor, innerW * scaleFactor, innerH * scaleFactor);
  sctx.clip();

  sctx.translate(posX * scaleFactor, posY * scaleFactor);
  sctx.scale(scale * scaleFactor, scale * scaleFactor);
  sctx.rotate(angle);
  sctx.drawImage(baseImage, 0, 0);

  sctx.restore();

  if (frameImage && frameImage.complete) {
    sctx.drawImage(frameImage, 0, 0, baseSize * scaleFactor, baseSize * scaleFactor);
  }

  const link = document.createElement("a");
  link.download = "framed_square.png";
  link.href = saveCanvas.toDataURL("image/png");
  link.click();
});

/* -----------------------------------------
   リセット
----------------------------------------- */
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;

  posX = targetPosX = 0;
  posY = targetPosY = 0;
  scale = targetScale = 1;
  angle = targetAngle = 0;

  imageInput.value = "";
  frameSelect.value = "";

  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
});
