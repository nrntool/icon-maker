const imageInput = document.getElementById("imageInput");
const frameSelect = document.getElementById("frameSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let baseImage = null;
let frameImage = null;

const frameFiles = ["01_yoyaku.png"]; // framesフォルダ内のファイル名

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

let imgX = 0;
let imgY = 0;
let imgScale = 1;

let vx = 0;
let vy = 0;
let lastMoveTime = 0;

imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    baseImage = new Image();
    baseImage.onload = () => {
      const { w, h } = getCanvasDisplaySize();

      const innerScale = 0.80;
      const innerW = w * innerScale;
      const innerH = h * innerScale;
      const innerX = (w - innerW) / 2;
      const innerY = (h - innerH) / 2;

      const scaleFit = Math.min(innerW / baseImage.width, innerH / baseImage.height);
      imgScale = scaleFit;

      const centerX = innerX + innerW / 2;
      const centerY = innerY + innerH / 2;

      imgX = centerX - (baseImage.width * imgScale) / 2;
      imgY = centerY - (baseImage.height * imgScale) / 2;

      draw();
    };
    baseImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

frameSelect.addEventListener("change", () => {
  if (!frameSelect.value) return;

  frameImage = new Image();
  frameImage.onload = () => draw();
  frameImage.src = frameSelect.value;
});

function getCanvasDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.width };
}

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
    ctx.translate(imgX, imgY);
    ctx.scale(imgScale, imgScale);
    ctx.drawImage(baseImage, 0, 0);
    ctx.restore();
  }

  ctx.restore();

  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, w, h);
  }
}

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

canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    isDragging = true;
    startX = t.clientX - imgX;
    startY = t.clientY - imgY;
    lastMoveTime = performance.now();
  }
});

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

function startInertia() {
  let lastTime = performance.now();

  function animate() {
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;

    const friction = 0.002;
    vx *= (1 - friction * dt);
    vy *= (1 - friction * dt);

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
   ★ 正方形・高解像度・フレーム込み・外側グレー保存
----------------------------------------- */
document.getElementById("saveBtn").addEventListener("click", () => {
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

  sctx.translate(imgX * scaleFactor, imgY * scaleFactor);
  sctx.scale(imgScale * scaleFactor, imgScale * scaleFactor);
  sctx.drawImage(baseImage, 0, 0);

  sctx.restore();

  if (frameImage && frameImage.complete) {
    sctx.drawImage(frameImage, 0, 0, baseSize * scaleFactor, baseSize * scaleFactor);
  }

  const link = document.createElement("a");
  link.download = "framed_square.png";
  link.href = saveCanvas.toDataURL("image/png");
  link.click();
});

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
