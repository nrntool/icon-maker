const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* -----------------------------------------
   高DPI対応（あなたのCSSに完全フィット）
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
   フレーム一覧（ここに追加するだけでOK）
----------------------------------------- */
const frameFiles = [
  "01_yoyaku.png",
  "02_test.png"
];

function loadFrames() {
  frameFiles.forEach(filename => {
    const option = document.createElement("option");
    option.value = `./frames/${filename}`;
    option.textContent = filename;
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
const MIN_SCALE = 0.2;
const MAX_SCALE = 6.0;

/* -----------------------------------------
   描画（画面表示）
----------------------------------------- */
function draw() {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;

  ctx.clearRect(0, 0, w, w);

  // 写真（フレームの透明部分から見える）
  if (baseImage) {
    ctx.save();
    ctx.translate(posX, posY);
    ctx.scale(scale, scale);
    ctx.rotate(angle);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

  // フレーム（外側不透明・内側透明）
  if (frameImage) {
    ctx.drawImage(frameImage, 0, 0, w, w);
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
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;

      // 写真をフレーム内側にフィットさせる
      const scaleFit = w / baseImage.width;
      scale = targetScale = scaleFit;

      posX = targetPosX = (w - baseImage.width * scale) / 2;
      posY = targetPosY = (w - baseImage.height * scale) / 2;

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
  frameImage = new Image();
  frameImage.onload = () => draw();
  frameImage.src = frameSelect.value;
});

/* -----------------------------------------
   マウス操作（移動・ズーム）
----------------------------------------- */
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

canvas.addEventListener("mousedown", e => {
  dragging = true;
  const p = getCanvasPos(e);
  dragOffsetX = p.x - targetPosX;
  dragOffsetY = p.y - targetPosY;
});

canvas.addEventListener("mousemove", e => {
  if (!dragging) return;
  const p = getCanvasPos(e);
  targetPosX = p.x - dragOffsetX;
  targetPosY = p.y - dragOffsetY;
});

canvas.addEventListener("mouseup", () => dragging = false);
canvas.addEventListener("mouseleave", () => dragging = false);

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  let newScale = targetScale + delta;
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

  const ratio = newScale / targetScale;
  targetScale = newScale;

  targetPosX = cx - (cx - targetPosX) * ratio;
  targetPosY = cy - (cy - targetPosY) * ratio;
});

/* -----------------------------------------
   アニメーション
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
   保存（フレームの透明部分にだけ写真が見える）
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
  if (!baseImage || !frameImage) return;

  const fw = frameImage.width;
  const fh = frameImage.height;
  const scaleFactor = 3;

  const saveCanvas = document.createElement("canvas");
  saveCanvas.width = fw * scaleFactor;
  saveCanvas.height = fh * scaleFactor;
  const sctx = saveCanvas.getContext("2d");

  // 写真
  sctx.save();
  sctx.translate(posX * scaleFactor, posY * scaleFactor);
  sctx.scale(scale * scaleFactor, scale * scaleFactor);
  sctx.rotate(angle);
  sctx.drawImage(baseImage, 0, 0);
  sctx.restore();

  // フレーム
  sctx.drawImage(frameImage, 0, 0, fw * scaleFactor, fh * scaleFactor);

  const link = document.createElement("a");
  link.download = "framed.png";
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
  setupCanvas();
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.width);
});
