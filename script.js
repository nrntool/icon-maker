// ================================
// FrameLab 完全安定版（GitHub API 不使用）
// ================================

const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ▼ ローカル frames フォルダからフレーム一覧を読み込む
function loadFramesLocal() {
  const frames = [
    "frames/フレーム1.png",
    "frames/フレーム2.png",
    "frames/フレーム3.png"
  ];

  frameSelect.innerHTML = '<option value="">選択してください</option>';

  frames.forEach(path => {
    const name = path.split("/").pop().replace(".png", "");
    const option = document.createElement("option");
    option.value = path;
    option.textContent = name;
    frameSelect.appendChild(option);
  });
}

// ▼ Canvas サイズ調整
function resizeCanvas() {
  const size = canvas.clientWidth;
  if (size === 0) return;
  canvas.width = size;
  canvas.height = size;
  redraw();
}

window.addEventListener("DOMContentLoaded", () => {
  loadFramesLocal();
  setTimeout(resizeCanvas, 50);
});

window.addEventListener("resize", () => {
  setTimeout(resizeCanvas, 50);
});

let baseImage = null;
let frameImage = null;

let scale = 1;
let minScale = 0.3;
let maxScale = 4;

let offsetX = 0;
let offsetY = 0;

// ▼ 画像読み込み
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = baseImage.width;
      const ih = baseImage.height;

      const fitScale = Math.min(cw / iw, ch / ih);
      scale = fitScale;
      minScale = fitScale * 0.3;

      offsetX = cw / 2 - (iw * scale) / 2;
      offsetY = ch / 2 - (ih * scale) / 2;

      redraw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ▼ フレーム選択
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

// ▼ 描画
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (baseImage) {
    const drawW = baseImage.width * scale;
    const drawH = baseImage.height * scale;
    ctx.drawImage(baseImage, offsetX, offsetY, drawW, drawH);
  }

  if (frameImage) {
    const cw = canvas.width;
    const ch = canvas.height;
    const size = Math.min(cw, ch);
    const x = (cw - size) / 2;
    const y = (ch - size) / 2;
    ctx.drawImage(frameImage, x, y, size, size);
  }
}

// ▼ 保存処理
function saveHighRes() {
  if (!baseImage) {
    alert("画像が選択されていません。");
    return;
  }

  const scaleFactor = 3;
  const saveCanvas = document.createElement("canvas");
  saveCanvas.width = canvas.width * scaleFactor;
  saveCanvas.height = canvas.height * scaleFactor;
  const sctx = saveCanvas.getContext("2d");

  sctx.fillStyle = "#ffffff";
  sctx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);

  const drawW = baseImage.width * scale * scaleFactor;
  const drawH = baseImage.height * scale * scaleFactor;
  const x = offsetX * scaleFactor;
  const y = offsetY * scaleFactor;

  sctx.drawImage(baseImage, x, y, drawW, drawH);

  if (frameImage) {
    const cw = saveCanvas.width;
    const ch = saveCanvas.height;
    const size = Math.min(cw, ch);
    const fx = (cw - size) / 2;
    const fy = (ch - size) / 2;
    sctx.drawImage(frameImage, fx, fy, size, size);
  }

  const link = document.createElement("a");
  link.download = "framelab.png";
  link.href = saveCanvas.toDataURL("image/png");
  link.click();
}

document.getElementById("saveBtn").addEventListener("click", saveHighRes);
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  imageInput.value = "";
  frameSelect.value = "";
  redraw();
});
