// 要素取得
const imageInput = document.getElementById('imageInput');
const frameSelect = document.getElementById('frameSelect');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

let baseImage = null;
let frameImage = null;

// ===============================
// フレームリスト（今は1種類、将来増やせる）
// ===============================
const frames = [
  { label: "予約フレーム", file: "01_yoyaku.png" }
  // 将来追加するならここに書くだけ
  // { label: "新フレーム", file: "02_new.png" }
];

function initFrameList() {
  frameSelect.innerHTML = '<option value="">選択してください</option>';
  frames.forEach(frame => {
    const opt = document.createElement('option');
    opt.value = frame.file;
    opt.textContent = frame.label;
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
  const fileName = e.target.value;
  if (!fileName) {
    frameImage = null;
    drawCanvas();
    return;
  }

  frameImage = new Image();
  frameImage.onload = drawCanvas;
  frameImage.src = `frames/${fileName}`;
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
