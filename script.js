const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

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
  })
  .catch((error) => console.error("フレーム一覧の読み込みに失敗しました:", error));

/* 画像読み込み */
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = redraw;
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

/* 描画処理 */
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (baseImage) {
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
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
  imageInput.value = "";
  frameSelect.value = "";
  redraw();
});
