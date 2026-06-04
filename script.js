const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* ズーム関連 */
let scale = 1;
let minScale = 1;
let maxScale = 3;
let lastDist = 0;

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
      scale = 1; // 初期化
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

/* ピンチ距離を計算 */
function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ピンチズーム */
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    lastDist = getDistance(e.touches);
  }
});

canvas.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();

    const dist = getDistance(e.touches);
    const delta = (dist - lastDist) * 0.005; // ズーム感度
    scale += delta;

    scale = Math.max(minScale, Math.min(maxScale, scale));
    lastDist = dist;

    redraw();
  }
});

/* 描画処理（中央トリミング＋ズーム） */
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (baseImage) {
    const imgAspect = baseImage.width / baseImage.height;
    const canvasAspect = canvas.width / canvas.height;

    let sx, sy, sWidth, sHeight;

    if (imgAspect > canvasAspect) {
      // 横長 → 左右カット
      sHeight = baseImage.height;
      sWidth = baseImage.height * canvasAspect;
      sx = (baseImage.width - sWidth) / 2;
      sy = 0;
    } else {
      // 縦長 → 上下カット
      sWidth = baseImage.width;
      sHeight = baseImage.width / canvasAspect;
      sx = 0;
      sy = (baseImage.height - sHeight) / 2;
    }

    const drawW = canvas.width * scale;
    const drawH = canvas.height * scale;
    const offsetX = (canvas.width - drawW) / 2;
    const offsetY = (canvas.height - drawH) / 2;

    ctx.drawImage(baseImage, sx, sy, sWidth, sHeight, offsetX, offsetY, drawW, drawH);
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
  imageInput.value = "";
  frameSelect.value = "";
  redraw();
});
