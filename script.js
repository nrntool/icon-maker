const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

/* -----------------------------------------
   フレーム一覧
----------------------------------------- */
const frameFiles = ["01_yoyaku.png"];

/* -----------------------------------------
   ラベル生成
----------------------------------------- */
function makeLabelFromFilename(filename) {
  return filename
    .replace(/^\d+_?/, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/_/g, " ");
}

/* -----------------------------------------
   フレーム読み込み
----------------------------------------- */
function loadFrames() {
  frameFiles.forEach(filename => {
    const path = `./frames/${filename}`;
    const option = document.createElement("option");
    option.value = path;
    option.textContent = makeLabelFromFilename(filename);
    frameSelect.appendChild(option);
  });
}
loadFrames();

/* -----------------------------------------
   画像の状態（位置・拡大率）
----------------------------------------- */
let imgX = 0;
let imgY = 0;
let imgScale = 1;

/* -----------------------------------------
   慣性用の変数
----------------------------------------- */
let vx = 0;
let vy = 0;
let lastMoveTime = 0;

/* -----------------------------------------
   写真読み込み
----------------------------------------- */
imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      const { w, h } = getCanvasDisplaySize();

      // 初期位置
      imgX = 0;
      imgY = 0;

      // 初期スケール（フレーム内側にフィット）
      const innerScale = 0.80;
      const innerW = w * innerScale;
      const innerH = h * innerScale;
      const scaleFit = Math.min(innerW / baseImage.width, innerH / baseImage.height);
      imgScale = scaleFit;

      draw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* -----------------------------------------
   フレーム変更
----------------------------------------- */
frameSelect.addEventListener("change", () => {
  if (!frameSelect.value) return;

  frameImage = new Image();
  frameImage.onload = () => draw();
  frameImage.src = frameSelect.value;
});

/* -----------------------------------------
   キャンバスサイズ取得
----------------------------------------- */
function getCanvasDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.width };
}

/* -----------------------------------------
   描画（マスク＋スムーズ操作対応）
----------------------------------------- */
function draw() {
  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  // フレーム内側の描画領域（80%）
  const innerScale = 0.80;
  const innerW = w * innerScale;
  const innerH = h * innerScale;
  const innerX = (w - innerW) / 2;
  const innerY = (h - innerH) / 2;

  // マスク開始
  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerW, innerH);
  ctx.clip();

  // ユーザー画像
  if (baseImage) {
    ctx.save();
    ctx.translate(imgX, imgY);
    ctx.scale(imgScale, imgScale);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

  ctx.restore(); // マスク解除

  // フレームを最前面に描画
  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, w, h);
  }
}

/* -----------------------------------------
   ドラッグ移動（PC）
----------------------------------------- */
let isDragging = false;
let startX, startY;

canvas.addEventListener("mousedown", e => {
  isDragging = true;
  startX = e.clientX - imgX;
  startY = e.clientY - imgY;
  lastMoveTime = performance.now();
});

canvas.addEventListener("mousemove", e => {
  if (!isDragging) return;

  const now = performance.now();
  const dt = now - lastMoveTime;

  const newX = e.clientX - startX;
  const newY = e.clientY - startY;

  // 速度の平滑化
  const smoothing = 0.2;
  vx = vx * (1 - smoothing) + ((newX - imgX) / dt) * smoothing;
  vy = vy * (1 - smoothing) + ((newY - imgY) / dt) * smoothing;

  imgX = newX;
  imgY = newY;

  lastMoveTime = now;
  draw();
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
  startInertia();
});
canvas.addEventListener("mouseleave", () => {
  isDragging = false;
  startInertia();
});

/* -----------------------------------------
   ドラッグ移動（スマホ）
----------------------------------------- */
canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    isDragging = true;
    startX = t.clientX - imgX;
    startY = t.clientY - imgY;
    lastMoveTime = performance.now();
  }
});

/* -----------------------------------------
   ピンチズーム（スマホ）
----------------------------------------- */
let lastDist = null;

canvas.addEventListener("touchmove", e => {
  if (e.touches.length === 1 && isDragging) {
    const t = e.touches[0];

    const now = performance.now();
    const dt = now - lastMoveTime;

    const newX = t.clientX - startX;
    const newY = t.clientY - startY;

    const smoothing = 0.2;
    vx = vx * (1 - smoothing) + ((newX - imgX) / dt) * smoothing;
    vy = vy * (1 - smoothing) + ((newY - imgY) / dt) * smoothing;

    imgX = newX;
    imgY = newY;

    lastMoveTime = now;
    draw();
  }

  if (e.touches.length === 2) {
    e.preventDefault();

    const [t1, t2] = e.touches;

    const dist = Math.hypot(
      t2.clientX - t1.clientX,
      t2.clientY - t1.clientY
    );

    const cx = (t1.clientX + t2.clientX) / 2;
    const cy = (t1.clientY + t2.clientY) / 2;

    if (lastDist !== null) {
      const scaleRatio = dist / lastDist;

      const oldScale = imgScale;
      imgScale *= scaleRatio;

      imgX = cx - (cx - imgX) * scaleRatio;
      imgY = cy - (cy - imgY) * scaleRatio;

      draw();
    }

    lastDist = dist;
  }
}, { passive: false });

canvas.addEventListener("touchend", () => {
  isDragging = false;
  lastDist = null;
  startInertia();
});

/* -----------------------------------------
   拡大縮小（PCホイール）
----------------------------------------- */
canvas.addEventListener("wheel", e => {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const oldScale = imgScale;
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  imgScale = Math.max(0.1, imgScale + delta);

  const scaleRatio = imgScale / oldScale;
  imgX = cx - (cx - imgX) * scaleRatio;
  imgY = cy - (cy - imgY) * scaleRatio;

  draw();
});

/* -----------------------------------------
   慣性アニメーション（自然な減速）
----------------------------------------- */
function startInertia() {
  let lastTime = performance.now();

  function animate() {
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;

    // 減速（時間ベース）
    const friction = 0.002;
    vx *= (1 - friction * dt);
    vy *= (1 - friction * dt);

    // 最大速度制限
    const maxSpeed = 2.0;
    vx = Math.max(-maxSpeed, Math.min(maxSpeed, vx));
    vy = Math.max(-maxSpeed, Math.min(maxSpeed, vy));

    imgX += vx * dt;
    imgY += vy * dt;

    draw();

    if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/* -----------------------------------------
   保存
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "framed.png";
  link.href = canvas.toDataURL();
  link.click();
});

/* -----------------------------------------
   リセット
----------------------------------------- */
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;
  imgX = 0;
  imgY = 0;
  imgScale = 1;

  imageInput.value = "";
  frameSelect.value = "";

  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
});
