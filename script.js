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
   ibisPaint風：現在値と目標値を分離
----------------------------------------- */
let imgX = 0, imgY = 0;
let targetX = 0, targetY = 0;

let imgScale = 1;
let targetScale = 1;

const smooth = 0.15;

/* ★ ズーム制限（自然） */
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

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerW, innerH);
  ctx.clip();

  if (baseImage) {
    ctx.save();
    ctx.translate(imgX, imgY);
    ctx.scale(imgScale, imgScale);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

  ctx.restore();

  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, w, h);
  }
}

/* -----------------------------------------
   画像読み込み
----------------------------------------- */
imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
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

      imgScale = targetScale = scaleFit;

      const centerX = innerX + innerW / 2;
      const centerY = innerY + innerH / 2;

      imgX = targetX = centerX - (baseImage.width * imgScale) / 2;
      imgY = targetY = centerY - (baseImage.height * imgScale) / 2;

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
   ドラッグ
----------------------------------------- */
let isDragging = false;
let startX = 0, startY = 0;

function getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

canvas.addEventListener("mousedown", e => {
  isDragging = true;
  startX = e.clientX - targetX;
  startY = e.clientY - targetY;
});

canvas.addEventListener("mousemove", e => {
  if (!isDragging) return;
  targetX = e.clientX - startX;
  targetY = e.clientY - startY;
});

canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mouseleave", () => isDragging = false);

/* -----------------------------------------
   タッチ操作（ピンチ中心ズーム＋制限）
----------------------------------------- */
let lastDist = null;

canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    const pos = getTouchPos(e.touches[0]);
    isDragging = true;
    startX = pos.x - targetX;
    startY = pos.y - targetY;
  }
});

canvas.addEventListener("touchmove", e => {
  if (e.touches.length === 1 && isDragging) {
    e.preventDefault();
    const pos = getTouchPos(e.touches[0]);
    targetX = pos.x - startX;
    targetY = pos.y - startY;
  }

  if (e.touches.length === 2) {
    e.preventDefault();

    const [t1, t2] = e.touches;
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const cx = (t1.clientX + t2.clientX) / 2;
    const cy = (t1.clientY + t2.clientY) / 2;

    if (lastDist !== null) {
      const scaleRatio = dist / lastDist;

      targetScale *= scaleRatio;

      /* ★ ズーム制限（自然） */
      targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

      targetX = cx - (cx - targetX) * scaleRatio;
      targetY = cy - (cy - targetY) * scaleRatio;
    }

    lastDist = dist;
  }
}, { passive: false });

canvas.addEventListener("touchend", () => {
  isDragging = false;
  lastDist = null;
});

/* -----------------------------------------
   ホイールズーム（PC）＋制限
----------------------------------------- */
canvas.addEventListener("wheel", e => {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  const newScale = targetScale + delta;

  const scaleRatio = newScale / targetScale;

  targetScale = newScale;

  /* ★ ズーム制限（自然） */
  targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

  targetX = cx - (cx - targetX) * scaleRatio;
  targetY = cy - (cy - targetY) * scaleRatio;
});

/* -----------------------------------------
   毎フレーム補間（ibisPaint風）
----------------------------------------- */
function animate() {
  imgScale += (targetScale - imgScale) * smooth;
  imgX += (targetX - imgX) * smooth;
  imgY += (targetY - imgY) * smooth;

  draw();
  requestAnimationFrame(animate);
}
animate();

/* -----------------------------------------
   保存（正方形・高解像度）
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
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

  sctx.fillStyle = "#cccccc";
  sctx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);

  sctx.save();
  sctx.beginPath();
  sctx.rect(innerX * scaleFactor, innerY * scaleFactor, innerW * scaleFactor, innerH * scaleFactor);
  sctx.clip();

  sctx.translate(imgX * scaleFactor, imgY * scaleFactor);
  sctx.scale(imgScale * scaleFactor, imgScale * scaleFactor);
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

  imgX = targetX = 0;
  imgY = targetY = 0;
  imgScale = targetScale = 1;

  imageInput.value = "";
  frameSelect.value = "";

  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
});
