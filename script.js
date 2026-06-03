const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* -----------------------------------------
   高DPI対応：CSS座標で統一
----------------------------------------- */
function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.width * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();
window.addEventListener("resize", () => {
  setupCanvas();
  draw();
});

/* -----------------------------------------
   フレーム一覧
----------------------------------------- */
const frameFiles = ["01_yoyaku.png"];
function makeLabelFromFilename(filename) {
  return filename.replace(/^\d+_?/, "").replace(/\.[^/.]+$/, "").replace(/_/g, " ");
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
   変換パラメータ
----------------------------------------- */
let posX = 0, posY = 0, scale = 1, angle = 0;
let targetPosX = 0, targetPosY = 0, targetScale = 1, targetAngle = 0;
const smooth = 0.15;
const MIN_SCALE = 0.2, MAX_SCALE = 6.0;

/* -----------------------------------------
   描画
----------------------------------------- */
function draw() {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width, h = rect.width;
  ctx.clearRect(0, 0, w, h);

  const innerScale = 0.80;
  const innerW = w * innerScale, innerH = h * innerScale;
  const innerX = (w - innerW) / 2, innerY = (h - innerH) / 2;

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
  if (frameImage && frameImage.complete) ctx.drawImage(frameImage, 0, 0, w, h);
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
      const rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.width;
      const innerScale = 0.80;
      const innerW = w * innerScale, innerH = h * innerScale;
      const innerX = (w - innerW) / 2, innerY = (h - innerH) / 2;
      const scaleFit = Math.min(innerW / baseImage.width, innerH / baseImage.height);
      scale = targetScale = scaleFit;
      const centerX = innerX + innerW / 2, centerY = innerY + innerH / 2;
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
   タッチ座標変換
----------------------------------------- */
function getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

/* -----------------------------------------
   タッチ操作（移動＋ズーム＋回転）
----------------------------------------- */
let lastDist = null, lastAngle = null, lastCx = null, lastCy = null;
let isDraggingTouch = false, touchDragOffsetX = 0, touchDragOffsetY = 0;

canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    const t = getTouchPos(e.touches[0]);
    isDraggingTouch = true;
    touchDragOffsetX = t.x - targetPosX;
    touchDragOffsetY = t.y - targetPosY;
  }
  if (e.touches.length === 2) {
    const p1 = getTouchPos(e.touches[0]), p2 = getTouchPos(e.touches[1]);
    const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    lastCx = cx; lastCy = cy; lastDist = dist; lastAngle = ang;
    isDraggingTouch = false;
  }
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  if (e.touches.length === 1 && isDraggingTouch) {
    const t = getTouchPos(e.touches[0]);
    targetPosX = t.x - touchDragOffsetX;
    targetPosY = t.y - touchDragOffsetY;
  }
  if (e.touches.length === 2) {
    const p1 = getTouchPos(e.touches[0]), p2 = getTouchPos(e.touches[1]);
    const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    if (lastDist !== null) {
      const scaleRatio = dist / lastDist;
      let newScale = targetScale * scaleRatio;
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      const appliedRatio = newScale / targetScale;
      targetScale = newScale;
      targetPosX = cx - (cx - targetPosX) * appliedRatio;
      targetPosY = cy - (cy - targetPosY) * appliedRatio;
    }
    if (lastAngle !== null) targetAngle += ang - lastAngle;
    if (lastCx !== null) {
      targetPosX += cx - lastCx;
      targetPosY += cy - lastCy;
    }
    lastCx = cx; lastCy = cy; lastDist = dist; lastAngle = ang;
  }
}, { passive: false });

canvas.addEventListener("touchend", e => {
  if (e.touches.length === 0) {
    isDraggingTouch = false;
    lastDist = lastAngle = lastCx = lastCy = null;
  }
}, { passive: false });

/* -----------------------------------------
   ホイールズーム（PC）
----------------------------------------- */
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  let newScale = targetScale + delta;
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
  const scaleRatio = newScale / targetScale;
  targetScale = newScale;
  targetPosX = cx - (cx - targetPosX) * scaleRatio;
  targetPosY = cy - (cy - targetPosY) * scaleRatio;
}, { passive: false });

/* -----------------------------------------
   アニメーション
----------------------------------------- */
function animate() {
  pos
