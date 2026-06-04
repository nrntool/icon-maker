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
      option
