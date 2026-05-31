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

// 描画
function draw() {
  if (baseImage) {
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    ctx.drawImage(baseImage, 0, 0);
  } else if (frameImage && frameImage.complete) {
    canvas.width = frameImage.naturalWidth;
    canvas.height = frameImage.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    return;
  }

  if (!frameImage || !frameImage.complete) return;

  const fw = frameImage.naturalWidth;
  const fh = frameImage.naturalHeight;

  let scale = 1;
  if (baseImage) {
    scale = Math.min(canvas.width / fw, canvas.height / fh);
  }

  const drawW = fw * scale;
  const drawH = fh * scale;

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

// ★ リセット
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;

  imageInput.value = "";
  frameSelect.value = "";

  canvas.width = 600;
  canvas.height = 600;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
