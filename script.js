// ===============================
// 要素取得
// ===============================
const imageInput = document.getElementById('imageInput');
const frameSelect = document.getElementById('frameSelect');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

let baseImage = null;
let frameImage = null;

// ===============================
// 画像選択
// ===============================
imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = drawCanvas;
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ===============================
// フレーム選択
// ===============================
frameSelect.addEventListener('change', e => {
  const frameName = e.target.value;
  if (!frameName) {
    frameImage = null;
    drawCanvas();
    return;
  }

  frameImage = new Image();
  frameImage.onload = drawCanvas;
  frameImage.src = `frames/${frameName}`;
});

// ===============================
// キャンバス描画
// ===============================
function drawCanvas() {
  if (!baseImage) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // キャンバスを画像サイズに合わせる
  canvas.width = baseImage.width;
  canvas.height = baseImage.height;

  // 元画像
  ctx.drawImage(baseImage, 0, 0);

  // フレーム
  if (frameImage) {
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  }
}

// ===============================
// 保存ボタン
// ===============================
saveBtn.addEventListener('click', () => {
  if (!baseImage) return;

  const link = document.createElement('a');
  link.download = 'framelab.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// ===============================
// リセットボタン
// ===============================
resetBtn.addEventListener('click', () => {
  baseImage = null;
  frameImage = null;
  imageInput.value = "";
  frameSelect.value = "";

  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
