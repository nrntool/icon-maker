// ================================
// FrameLab 完全安定版（GitHub API 直接読み込み）
// ================================

const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ▼ GitHub APIからフレーム一覧を取得
async function loadFramesFromGitHub() {
  const repo = "framesynth/icon-maker";
  const apiUrl = `https://api.github.com/repos/${repo}/contents/frames`;

  try {
    const response = await fetch(apiUrl, { cache: "no-cache" });
    const data = await response.json();

    if (!Array.isArray(data)) throw new Error("GitHub API response invalid");

    frameSelect.innerHTML = '<option value="">選択してください</option>';

    data.forEach(item => {
      if (item.name.endsWith(".png")) {
        const option = document.createElement("option");
        option.value = item.download_url;
        option.textContent = item.name.replace(".png", "");
        frameSelect.appendChild(option);
      }
    });
  } catch (err) {
    console.warn("GitHub API 読み込みエラー:", err);
    frameSelect.innerHTML = `
      <option value="">読み込み失敗（ローカルフォールバック）</option>
    `;
    // フォールバック：ローカル frames フォルダを直接参照
    const fallbackFrames = [
      "frames/フレーム1.png",
      "frames/テスト1.png"
    ];
    fallbackFrames.forEach(path => {
      const name = path.split("/").pop().replace(".png", "");
      const option = document.createElement("option");
      option.value = path;
      option.textContent = name;
      frameSelect.appendChild(option);
    });
  }
}

// ▼ Canvas サイズ調整
function resizeCanvas() {
  const size = canvas.clientWidth;
  if (!size) return;
  canvas.width = size;
  canvas.height = size;
  redraw();
}

window.addEventListener("DOMContentLoaded", () => {
  loadFramesFromGitHub();
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
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
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
    sctx.drawImage(frameImage, 0, 0, saveCanvas.width, saveCanvas.height);
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
