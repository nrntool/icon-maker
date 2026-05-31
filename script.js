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
// フレームリスト
// ===============================
const frames = [
  "01_yoyaku.png",
  "02_sakura.png",
  "03_gold.png",
  "04_black.png"
];

function initFrameList() {
  frameSelect.innerHTML = '<option value="">選択してください</option>';
  frames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name.replace('.png', '');
    frameSelect.appendChild(opt);
  });
}
initFrameList();

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

  canvas.width = baseImage.width;
  canvas.height = baseImage.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseImage, 0, 0);

  if (frameImage) {
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
  }
}

// ===============================
// 保存
// ===============================
saveBtn.addEventListener('click', () => {
  if (!baseImage) return;
  const link = document.createElement('a');
  link.download = 'framelab.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// ===============================
// リセット
// ===============================
resetBtn.addEventListener('click', () => {
  baseImage = null;
  frameImage = null;
  imageInput.value = "";
  frameSelect.value = "";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
