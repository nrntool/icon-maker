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

/* -----------------------------------------
   ラベル生成
----------------------------------------- */
function makeLabelFromFilename(filename) {
  return filename
    .replace(/^\d+_?/, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/_/g, " ");
}

/* -----------------------------------------
   フレーム読み込み
----------------------------------------- */
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
   画像の状態（位置・拡大率）
----------------------------------------- */
let imgX = 0;
let imgY = 0;
let imgScale = 1;

/* -----------------------------------------
   写真読み込み
----------------------------------------- */
imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      imgX = 0;
      imgY = 0;
      imgScale = 1;
      draw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* -----------------------------------------
   フレーム変更
----------------------------------------- */
frameSelect.addEventListener("change", () => {
  if (!frameSelect.value) return;

  frameImage = new Image();
  frameImage.onload = () => draw();
  frameImage.src = frameSelect.value;
});

/* -----------------------------------------
   キャンバスサイズ取得
----------------------------------------- */
function getCanvasDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.width };
}

/* -----------------------------------------
   描画（マスク＋スムーズ操作対応）
----------------------------------------- */
function draw() {
  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  // ★ フレーム内側の描画領域（80%）
  const innerScale = 0.80;
  const innerW = w * innerScale;
  const innerH = h * innerScale;
  const innerX = (w - innerW) / 2;
  const innerY = (h - innerH) / 2;

  // ★ マスク開始（フレーム内側だけ描画）
  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerW, innerH);
  ctx.clip();

  // ★ ユーザー画像（位置＋拡大率）
  if (baseImage) {
    ctx.save();
    ctx.translate(imgX, imgY);
    ctx.scale(imgScale, imgScale);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

  ctx.restore(); // マスク解除

  // ★ フレームを最前面に描画
  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, w, h);
  }
}

/* -----------------------------------------
   ドラッグ移動（PC）
----------------------------------------- */
let isDragging = false;
let startX, startY;

canvas.addEventListener("mousedown", e => {
  isDragging = true;
  startX = e.clientX - imgX;
  startY = e.clientY - imgY;
});

canvas.addEventListener("mousemove", e => {
  if (!isDragging) return;
  imgX = e.clientX - startX;
  imgY = e.clientY - startY;
  draw();
});

canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mouseleave", () => isDragging = false);

/* -----------------------------------------
   ドラッグ移動（スマホ）
----------------------------------------- */
canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    isDragging = true;
    startX = t.clientX - imgX;
    startY = t.clientY - imgY;
  }
});

canvas.addEventListener("touchmove", e => {
  if (e.touches.length === 1 && isDragging) {
    const t = e.touches[0];
    imgX = t.clientX - startX;
    imgY = t.clientY - startY;
    draw();
  }
});

canvas.addEventListener("touchend", () => isDragging = false);

/* -----------------------------------------
   拡大縮小（PCホイール）
----------------------------------------- */
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  imgScale = Math.max(0.1, imgScale + delta);
  draw();
});

/* -----------------------------------------
   ピンチ拡大縮小（スマホ）
----------------------------------------- */
let lastDist = null;

canvas.addEventListener("touchmove", e => {
  if (e.touches.length === 2) {
    const [t1, t2] = e.touches;
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    if (lastDist !== null) {
      const delta = (dist - lastDist) * 0.005;
      imgScale = Math.max(0.1, imgScale + delta);
      draw();
    }
    lastDist = dist;
  }
});

canvas.addEventListener("touchend", () => {
  lastDist = null;
});

/* -----------------------------------------
   保存
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "framed.png";
  link.href = canvas.toDataURL();
  link.click();
});

/* -----------------------------------------
   リセット
----------------------------------------- */
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;
  imgX = 0;
  imgY = 0;
  imgScale = 1;

  imageInput.value = "";
  frameSelect.value = "";

  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
});
