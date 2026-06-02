/* ============================================================
   FrameLab – フレーム全表示・透過保存版
============================================================ */

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
   現在値と目標値を分離
----------------------------------------- */
let imgX = 0, imgY = 0;
let targetX = 0, targetY = 0;

let imgScale = 1;
let targetScale = 1;

const smooth = 0.15;

/* -----------------------------------------
   キャンバスサイズ（正方形）
----------------------------------------- */
function getCanvasDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  const size = rect.width;
  return { w: size, h: size };
}

/* -----------------------------------------
   描画（フレーム全表示）
----------------------------------------- */
function draw() {
  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  // 背景画像はキャンバス全体に描画
  if (baseImage) {
    ctx.save();
    ctx.translate(imgX, imgY);
    ctx.scale(imgScale, imgScale);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

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
  const reader = new FileReader();

  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      const { w, h } = getCanvasDisplaySize();

      const scaleFit = Math.min(w / baseImage.width, h / baseImage.height);
      imgScale = targetScale = scaleFit;

      const centerX = w / 2;
      const centerY = h / 2;

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
   タッチ操作（ピンチ中心ズーム対応）
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
   ホイールズーム（PC）
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
  targetX = cx - (cx - targetX) * scaleRatio;
  targetY = cy - (cy - targetY) * scaleRatio;
});

/* -----------------------------------------
   毎フレーム補間
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
   保存（透過PNG・フレーム全表示）
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
  const { w } = getCanvasDisplaySize();

  const saveCanvas = document.createElement("canvas");
  saveCanvas.width = w;
  saveCanvas.height = w;
  const sctx = saveCanvas.getContext("2d");

  // 背景透過（fillRectなし）
  sctx.save();
  sctx.translate(imgX, imgY);
  sctx.scale(imgScale, imgScale);
  sctx.drawImage(baseImage, 0, 0);
  sctx.restore();

  if (frameImage && frameImage.complete) {
    sctx.drawImage(frameImage, 0, 0, w, w);
  }

  const link = document.createElement("a");
  link.download = "framed_transparent.png";
  link.href = saveCanvas.toDataURL("image/png");
  link.click();
});

/* -----------------------------------------
   リセット（全部消える）
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
