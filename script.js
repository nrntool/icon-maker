const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* -----------------------------------------
   高DPI対応 + 正方形内部解像度
----------------------------------------- */
function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.width * dpr; // 正方形固定
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();
window.addEventListener("resize", () => {
  setupCanvas();
  draw();
});

/* -----------------------------------------
   frames.json 読み込み
----------------------------------------- */
async function loadFrames() {
  try {
    const res = await fetch("./frames.json");
    const frameFiles = await res.json();

    frameFiles.forEach(filename => {
      const option = document.createElement("option");
      option.value = `./frames/${filename}`;
      option.textContent = filename.replace(".png", "");
      frameSelect.appendChild(option);
    });

  } catch (err) {
    console.error("フレーム読み込み失敗:", err);
  }
}
loadFrames();

/* -----------------------------------------
   描画パラメータ
----------------------------------------- */
let posX = 0, posY = 0, scale = 1, angle = 0;
let targetPosX = 0, targetPosY = 0, targetScale = 1, targetAngle = 0;

const smooth = 0.15;

/* -----------------------------------------
   描画
----------------------------------------- */
function draw() {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.width;

  ctx.clearRect(0, 0, w, h);

  if (baseImage) {
    ctx.save();
    ctx.translate(posX, posY);
    ctx.scale(scale, scale);
    ctx.rotate(angle);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

  if (frameImage) {
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
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;

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
   保存（正方形・画面と完全一致）
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
  if (!baseImage || !frameImage) return;

  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.width;

  const saveCanvas = document.createElement("canvas");
  saveCanvas.width = w;
  saveCanvas.height = h;
  const sctx = saveCanvas.getContext("2d");

  sctx.clearRect(0, 0, w, h);

  // 画面と同じ変形を再現
  sctx.save();
  sctx.translate(posX, posY);
  sctx.scale(scale, scale);
  sctx.rotate(angle);
  sctx.drawImage(baseImage, 0, 0);
  sctx.restore();

  // フレーム描画
  sctx.drawImage(frameImage, 0, 0, w, h);

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
  draw();
});
