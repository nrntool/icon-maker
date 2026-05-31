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
    baseImage.onload = () => {
      draw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// フレーム変更
frameSelect.addEventListener("change", () => {
  if (!frameSelect.value) return;

  frameImage = new Image();
  frameImage.onload = () => {
    draw();
  };
  frameImage.onerror = () => {
    console.log("フレーム画像が読み込めません:", frameSelect.value);
  };
  frameImage.src = frameSelect.value;
});

// 描画
function draw() {
  if (!baseImage) return;

  canvas.width = baseImage.width;
  canvas.height = baseImage.height;

  ctx.drawImage(baseImage, 0, 0);

  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  }
}

// 保存
document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "framed.png";
  link.href = canvas.toDataURL();
  link.click();
});
