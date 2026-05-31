const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* -----------------------------------------
   ★ フレーム一覧（ここに PNG を追加するだけ）
----------------------------------------- */
const frameFiles = [
  "01_yoyaku_battle.png"
];

/* -----------------------------------------
   ★ ファイル名 → ラベル変換
----------------------------------------- */
function makeLabelFromFilename(filename) {
  return filename
    .replace(/^\d+_?/, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/_/g, " ");
}

/* -----------------------------------------
   ★ フレーム読み込み
----------------------------------------- */
function loadFrames() {
  frameFiles.forEach(filename => {
    const path = `frames/${filename}`;
    const option = document.createElement("option");
    option.value = path;
    option.textContent = makeLabelFromFilename(filename);
    frameSelect.appendChild(option);
  });
}

loadFrames();

/* -----------------------------------------
   ★ 写真読み込み
----------------------------------------- */
imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => draw();
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* -----------------------------------------
   ★ フレーム変更
----------------------------------------- */
frameSelect.addEventListener("change", () => {
  if (!frameSelect.value) return;

  frameImage = new Image();
  frameImage.onload = () => draw();
  frameImage.src = frameSelect.value;
});

/* -----------------------------------------
   ★ 描画（スマホ最適化）
----------------------------------------- */
function getCanvasDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.width };
}

function draw() {
  const { w, h } = getCanvasDisplaySize();

  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  if (baseImage) {
    const scale = Math.min(w / baseImage.width, h / baseImage.height);
    const bw = baseImage.width * scale;
    const bh = baseImage.height * scale;
    ctx.drawImage(baseImage, (w - bw) / 2, (h - bh) / 2, bw, bh);
  }

  if (frameImage && frameImage.complete) {
    const scale = Math.min(w / frameImage.naturalWidth, h / frameImage.naturalHeight);
    const fw = frameImage.naturalWidth * scale;
    const fh = frameImage.naturalHeight * scale;
    ctx.drawImage(frameImage, (w - fw) / 2, (h - fh) / 2, fw, fh);
  }
}

/* -----------------------------------------
   ★ 保存
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "framed.png";
  link.href = canvas.toDataURL();
  link.click();
});

/* -----------------------------------------
   ★ リセット
----------------------------------------- */
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;

  imageInput.value = "";
  frameSelect.value = "";

  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
});
