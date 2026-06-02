/* ============================================================
   FrameLab – ibisPaint風 3軸統合慣性エンジン（柔らかいバウンス入り）
============================================================ */

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

function makeLabelFromFilename(filename) {
  return filename
    .replace(/^\d+_?/, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/_/g, " ");
}

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
   変換パラメータ
----------------------------------------- */
let imgX = 0, imgY = 0;
let targetX = 0, targetY = 0;

let imgScale = 1;
let targetScale = 1;

let rotation = 0;
let targetRotation = 0;

const smooth = 0.15;

/* -----------------------------------------
   制限値
----------------------------------------- */
const MIN_SCALE = 0.2;
const MAX_SCALE = 6.0;

/* -----------------------------------------
   統合慣性エンジン
----------------------------------------- */
let moveVX = 0;
let moveVY = 0;

let pinchVelocity = 0;
let rotationVelocity = 0;

let lastMoveTime = 0;
let lastScale = 1;
let lastAngle = null;

let lastCx = null;
let lastCy = null;
let lastDist = null;

let isDragging = false;
let isPinching = false;

/* -----------------------------------------
   キャンバスサイズ（正方形）
----------------------------------------- */
function getCanvasDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  const size = rect.width;
  return { w: size, h: size };
}

/* -----------------------------------------
   描画（回転は画像中心固定）
----------------------------------------- */
function draw() {
  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  const innerScale = 0.80;
  const innerW = w * innerScale;
  const innerH = h * innerScale;
  const innerX = (w - innerW) / 2;
  const innerY = (h - innerH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerW, innerH);
  ctx.clip();

  if (baseImage) {
    ctx.save();

    const imgCenterX = imgX + (baseImage.width * imgScale) / 2;
    const imgCenterY = imgY + (baseImage.height * imgScale) / 2;

    ctx.translate(imgCenterX, imgCenterY);
    ctx.rotate(rotation);
    ctx.scale(imgScale, imgScale);

    ctx.drawImage(baseImage, -baseImage.width / 2, -baseImage.height / 2);

    ctx.restore();
  }

  ctx.restore();

  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, w, h);
  }
}

/* -----------------------------------------
   タッチ操作（移動＋ズーム＋回転）
----------------------------------------- */
function getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    const pos = getTouchPos(e.touches[0]);
    isDragging = true;
    startX = pos.x - targetX;
    startY = pos.y - targetY;
    lastMoveTime = performance.now();
  }
});

canvas.addEventListener("touchmove", e => {
  if (e.touches.length === 1 && isDragging) {
    e.preventDefault();

    const pos = getTouchPos(e.touches[0]);
    const now = performance.now();
    const dt = now - lastMoveTime || 16;

    const newX = pos.x - startX;
    const newY = pos.y - startY;

    moveVX = (newX - targetX) / dt;
    moveVY = (newY - targetY) / dt;

    targetX = newX;
    targetY = newY;

    lastMoveTime = now;
  }

  if (e.touches.length === 2) {
    e.preventDefault();

    const [t1, t2] = e.touches;

    const cx = (t1.clientX + t2.clientX) / 2;
    const cy = (t1.clientY + t2.clientY) / 2;

    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

    if (lastDist !== null && lastAngle !== null) {

      /* --- ズーム --- */
      const scaleRatio = dist / lastDist;
      targetScale *= scaleRatio;
      targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

      pinchVelocity = targetScale - lastScale;
      lastScale = targetScale;

      /* --- 回転（ズーム中は弱体化） --- */
      const zoomSpeedForRot = Math.abs(pinchVelocity);
      const rotWeak = 1 - Math.min(zoomSpeedForRot * 0.9, 0.45);

      const angleDiff = angle - lastAngle;
      const normalized = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

      targetRotation += normalized * rotWeak;
      rotationVelocity = normalized * rotWeak;

      /* --- 移動（ピンチ中心移動） --- */
      const moveX = cx - lastCx;
      const moveY = cy - lastCy;
      targetX += moveX;
      targetY += moveY;

      /* --- ピンチ中心ズーム補正 --- */
      targetX = cx - (cx - targetX) * scaleRatio;
      targetY = cy - (cy - targetY) * scaleRatio;

      /* --- 中心吸着補正（軽量版） --- */
      if (baseImage) {
        const centerX = imgX + (baseImage.width * imgScale) / 2;
        const centerY = imgY + (baseImage.height * imgScale) / 2;

        const dx = cx - centerX;
        const dy = cy - centerY;
        const distToCenter = Math.hypot(dx, dy);

        const { w, h } = getCanvasDisplaySize();
        const diag = Math.hypot(w, h);

        let attract = 0.035 * (distToCenter / diag);
        const zoomSpeed = Math.abs(pinchVelocity);
        attract += Math.min(zoomSpeed * 0.8, 0.06);

        const rotSpeed = Math.abs(rotationVelocity);
        attract *= 1 - Math.min(rotSpeed * 1.2, 0.55);

        targetX += (centerX - targetX) * attract;
        targetY += (centerY - targetY) * attract;
      }
    }

    lastDist = dist;
    lastCx = cx;
    lastCy = cy;
    lastAngle = angle;

    isPinching = true;
  }
}, { passive: false });

canvas.addEventListener("touchend", () => {
  isDragging = false;
  isPinching = false;

  lastDist = null;
  lastAngle = null;
});

/* -----------------------------------------
   ホイールズーム（PC）
----------------------------------------- */
canvas.addEventListener("wheel", e => {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  const newScale = targetScale + delta;

  const scaleRatio = newScale / targetScale;

  targetScale = newScale;
  targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

  targetX = cx - (cx - targetX) * scaleRatio;
  targetY = cy - (cy - targetY) * scaleRatio;
});

/* -----------------------------------------
   統合慣性アニメーション
----------------------------------------- */
function animate() {

  if (!isDragging && !isPinching) {

    moveVX *= 0.92;
    moveVY *= 0.92;
    targetX += moveVX * 16;
    targetY += moveVY * 16;

    pinchVelocity *= 0.90;
    targetScale += pinchVelocity;
    targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

    rotationVelocity *= 0.90;
    targetRotation += rotationVelocity;
  }

  /* --- 回転スナップ（45°対応＋減速・軽量版） --- */
  {
    const snapAngles = [
      0,
      Math.PI / 4,
      Math.PI / 2,
      Math.PI * 3 / 4,
      Math.PI,
      Math.PI * 5 / 4,
      Math.PI * 3 / 2,
      Math.PI * 7 / 4
    ];

    const rotSpeed = Math.abs(rotationVelocity);

    if (rotSpeed < 0.02) {

      let norm = targetRotation % (Math.PI * 2);
      if (norm < 0) norm += Math.PI * 2;

      let nearest = null;
      let minDiff = Infinity;

      for (const a of snapAngles) {
        const diff = Math.abs(norm - a);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = a;
        }
      }

      if (minDiff < 0.17) {

        const snapStrength = 0.18;
        targetRotation += (nearest - norm) * snapStrength;

        const slowDown = 1 - (minDiff / 0.17);
        rotationVelocity *= (0.55 + 0.45 * (1 - slowDown));
      }
    }
  }

  /* --- 柔らかいバウンス（ibisPaint式） --- */
  {
    const { w, h } = getCanvasDisplaySize();

    const innerScale = 0.80;
    const innerW = w * innerScale;
    const innerH = h * innerScale;
    const innerX = (w - innerW) / 2;
    const innerY = (h - innerH) / 2;

    const imgW = baseImage.width * imgScale;
    const imgH = baseImage.height * imgScale;

    const bounce = 0.12;

    if (imgX > innerX) {
      const over = imgX - innerX;
      targetX -= over * bounce;
    }

    if (imgX + imgW < innerX + innerW) {
      const over = (innerX + innerW) - (imgX + imgW);
      targetX += over * bounce;
    }

    if (imgY > innerY) {
      const over = imgY - innerY;
      targetY -= over * bounce;
    }

    if (imgY + imgH < innerY + innerH) {
      const over = (innerY + innerH) - (imgY + imgH);
      targetY += over * bounce;
    }
  }

  /* --- 補間 --- */
  imgScale += (targetScale - imgScale) * smooth;
  imgX += (targetX - imgX) * smooth;
  imgY += (targetY - imgY) * smooth;
  rotation += (targetRotation - rotation) * smooth;

  draw();
  requestAnimationFrame(animate);
}
animate();

/* -----------------------------------------
   保存（正方形・高解像度）
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
  if (!baseImage) return;

  const { w } = getCanvasDisplaySize();

  const baseSize = w;
  const scaleFactor = 3;

  const innerScale = 0.80;
  const innerW = baseSize * innerScale;
  const innerH = baseSize * innerScale;
  const innerX = (baseSize - innerW) / 2;
  const innerY = (baseSize - innerH) / 2;

  const saveCanvas = document.createElement("canvas");
  saveCanvas.width = baseSize * scaleFactor;
  saveCanvas.height = baseSize * scaleFactor;
  const sctx = saveCanvas.getContext("2d");

  sctx.fillStyle = "#cccccc";
  sctx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);

  sctx.save();
  sctx.beginPath();
  sctx.rect(innerX * scaleFactor, innerY * scaleFactor, innerW * scaleFactor, innerH * scaleFactor);
  sctx.clip();

  if (baseImage) {
    const imgCenterX = imgX * scaleFactor + (baseImage.width * imgScale * scaleFactor) / 2;
    const imgCenterY = imgY * scaleFactor + (baseImage.height * imgScale * scaleFactor) / 2;

    sctx.save();
    sctx.translate(imgCenterX, imgCenterY);
    sctx.rotate(rotation);
    sctx.scale(imgScale * scaleFactor, imgScale * scaleFactor);
    sctx.drawImage(baseImage, -baseImage.width / 2, -baseImage.height / 2);
    sctx.restore();
  }

  if (frameImage && frameImage.complete) {
    sctx.drawImage(frameImage, 0, 0, baseSize * scaleFactor, baseSize * scaleFactor);
  }

  const link = document.createElement("a");
  link.download = "framed_square.png";
  link.href = saveCanvas.toDataURL("image/png");
  link.click();
});

/* -----------------------------------------
   リセット
----------------------------------------- */
document.getElementById("resetBtn").addEventListener("click", () => {
  baseImage = null;
  frameImage = null;

  imgX = targetX = 0;
  imgY = targetY = 0;
  imgScale = targetScale = 1;
  rotation = targetRotation = 0;

  moveVX = moveVY = 0;
  pinchVelocity = 0;
  rotationVelocity = 0;

  imageInput.value = "";
  frameSelect.value = "";

  const { w, h } = getCanvasDisplaySize();
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
});
