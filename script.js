// ===============================
// 基本セット
// ===============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 600;
canvas.height = 600;

let baseImage = null;
let frameImage = null;

// ===============================
// 画像読み込み（フィットのみ）
// ===============================
document.getElementById("imageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      draw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ===============================
// フレーム読み込み（絶対パス）
// ===============================
const frameSelect = document.getElementById("frameSelect");

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
// 描画（拡大縮小なし）
// ===============================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (baseImage) {
    // 画像をキャンバスにフィットさせて描画
    const scale = Math.min(
      canvas.width / baseImage.width,
      canvas.height / baseImage.height
    );

    const x = (canvas.width - baseImage.width * scale) / 2;
    const y = (canvas.height - baseImage.height * scale) / 2;

    ctx.drawImage(
      baseImage,
      x, y,
      baseImage.width * scale,
      baseImage.height * scale
    );
  }

  if (frameImage) {
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  }
}

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
  draw();
});
