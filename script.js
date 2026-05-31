const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

// ★ 表示サイズ（CSSで縮小された後のサイズ）を取得
function getCanvasDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.width }; // 正方形に固定
}

// フレーム一覧を読み込む
fetch("frames/manifest.json")
  .then(res => res.json())
  .then(list => {
    list.forEach(frame => {
      const option = document.createElement("option");
      option.value = frame.path;
      option.textContent = frame.label;
      frameSelect.appendChild(option);
    });
  });

// 写真読み込み
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

// フレーム変更
frameSelect.addEventListener("change", () => {
  if (!frameSelect.value) return;

  frameImage = new Image();
  frameImage.onload = () => draw();
  frameImage.src = frameSelect.value;
});

// ★ スマホ最適化：内部描画サイズを表示サイズに合わせる
function draw() {
  const { w, h } = getCanvasDisplaySize();

  // 内部サイズを表示サイズに合わせる（ここが最重要）
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  // 写真がある場合 → フィット
  if (baseImage) {
    const scale = Math.min(w / baseImage.width, h / baseImage.height);
    const bw = baseImage.width * scale;
    const bh = baseImage.height * scale;
    const bx = (w - bw) / 2;
    const by = (h - bh) / 2;
    ctx.drawImage(baseImage, bx, by, bw, bh);
  }

  // フレームがある場合 → フィット
  if (frameImage && frameImage.complete) {
    const scale = Math.min(w / frameImage.naturalWidth, h / frameImage.naturalHeight);
    const fw = frameImage.naturalWidth * scale;
    const fh = frameImage.naturalHeight * scale;
    const fx = (w - fw) / 2;
    const fy = (h - fh) / 2;
    ctx.drawImage(frameImage, fx, fy, fw, fh);
  }
}

// 保存
document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "framed.png";
  link.href = canvas.toDataURL();
  link.click();
});

// リセット
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
