// ===============================
// 画像・フレーム管理
// ===============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// スマホ画面のピンチズームを無効化
canvas.style.touchAction = "none";

let baseImage = null;
let frameImage = null;

// キャンバス初期サイズ
canvas.width = 600;
canvas.height = 600;

// ===============================
// 画像の変形状態（移動・拡大縮小）
// ===============================
let imgScale = 1;
let imgOffsetX = 0;
let imgOffsetY = 0;

let isDragging = false;
let lastX = 0;
let lastY = 0;

let lastDist = 0; // ピンチ距離

// ===============================
// 画像読み込み（自動フィット付き）
// ===============================
document.getElementById("imageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      autoFitImage();
      draw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ===============================
// 自動フィット処理
// ===============================
function autoFitImage() {
  if (!baseImage) return;

  const imgW = baseImage.width;
  const imgH = baseImage.height;
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const scaleW = canvasW / imgW;
  const scaleH = canvasH / imgH;
  imgScale = Math.min(scaleW, scaleH);

  imgOffsetX = (canvasW - imgW * imgScale) / 2;
  imgOffsetY = (canvasH - imgH * imgScale) / 2;
}

// ===============================
// フレーム読み込み（絶対パス版）
// ===============================
const frameSelect = document.getElementById("frameSelect");

// ★ GitHub Pages の絶対パスを使用
const frameFiles = [
  "https://framesynth.github.io/icon-maker/frames/01_yoyaku.png"
];

frameFiles.forEach((file) => {
  const option = document.createElement("option");
  option.value = file;
  option.textContent = file.split("/").pop();
  frameSelect.appendChild(option);
});

frameSelect.addEventListener("change", () => {
  if (!frameSelect.value) {
    frameImage = null;
    draw();
    return;
  }

  frameImage = new Image();
  frameImage.onload = draw;
  frameImage.src = frameSelect.value;
});

// ===============================
// 描画処理
// ===============================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (baseImage) {
    ctx.save();
    ctx.translate(imgOffsetX, imgOffsetY);
    ctx.scale(imgScale, imgScale);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

  if (frameImage) {
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  }
}

// ===============================
// PC：ドラッグ移動
// ===============================
canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  imgOffsetX += e.clientX - lastX;
  imgOffsetY += e.clientY - lastY;

  lastX = e.clientX;
  lastY = e.clientY;

  draw();
});

canvas.addEventListener("mouseup", () => (isDragging = false));
canvas.addEventListener("mouseleave", () => (isDragging = false));

// ===============================
// スマホ：ドラッグ移動
// ===============================
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }
});

// ===============================
// スマホ：ドラッグ & ピンチズーム
// ===============================
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();

  // 1本指 → 移動
  if (e.touches.length === 1) {
    imgOffsetX += e.touches[0].clientX - lastX;
    imgOffsetY += e.touches[0].clientY - lastY;

    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;

    draw();
  }

  // 2本指 → ピンチズーム
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (lastDist !== 0) {
      imgScale *= dist / lastDist;
      imgScale = Math.max(0.3, Math.min(imgScale, 5));
      draw();
    }

    lastDist = dist;
  }
});

canvas.addEventListener("touchend", () => {
  lastDist = 0;
});

// ===============================
// 保存
// ===============================
document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "framelab.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// ===============================
// リセット
// ===============================
document.getElementById("resetBtn").addEventListener("click", () => {
  autoFitImage();
  draw();
});
