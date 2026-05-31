const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

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

// 画像読み込み
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

// 描画（どんな画像サイズでも中央フィット）
function draw() {
  if (!baseImage) return;

  // キャンバスを写真サイズに合わせる
  canvas.width = baseImage.width;
  canvas.height = baseImage.height;

  // 写真を描画
  ctx.drawImage(baseImage, 0, 0);

  // フレームが読み込まれていない場合は終了
  if (!frameImage || !frameImage.complete) return;

  // フレームの元サイズ
  const fw = frameImage.width;
  const fh = frameImage.height;

  // 写真の短辺に合わせてスケール
  const scale = Math.min(canvas.width / fw, canvas.height / fh);

  const drawW = fw * scale;
  const drawH = fh * scale;

  // 中央に配置
  const dx = (canvas.width - drawW) / 2;
  const dy = (canvas.height - drawH) / 2;

  ctx.drawImage(frameImage, dx, dy, drawW, drawH);
}

// 保存
document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "framed.png";
  link.href = canvas.toDataURL();
  link.click();
});
