// ===============================
// 画像・フレーム管理
// ===============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

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
// 画像読み込み
// ===============================
document.getElementById("imageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      resetTransform();
      draw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ===============================
// フレーム読み込み
// ===============================
const frameSelect = document.getElementById("frameSelect");

// フレーム一覧（必要に応じて追加）
const frameFiles = [
  "frames/frame1.png",
  "frames/frame2.png",
  "frames/frame3.png"
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
// 変形リセット
// ===============================
function resetTransform() {
  imgScale = 1;
  imgOffsetX = 0;
  imgOffsetY = 0;
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
      imgScale = Math.max(0.3, Math.min(imgScale, 5)); // ズーム制限
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
  resetTransform();
  draw();
});
