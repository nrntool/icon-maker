// ================================
// FrameLab 管理パネル用 admin.js（完全版）
// ================================

const WORKER_ENDPOINT = "https://framelab-uploader.narun091525-b98.workers.dev";

const uploadBtn = document.getElementById("uploadBtn");
const frameInput = document.getElementById("frameInput");
const frameNameInput = document.getElementById("frameName");
const resultBox = document.getElementById("result");
const previewBox = document.getElementById("previewBox");
const previewImage = document.getElementById("previewImage");

// Base64 変換
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ▼ サムネイル表示（ふわっと表示）
frameInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) {
    previewBox.style.display = "none";
    previewImage.src = "";
    previewImage.classList.remove("show");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    previewImage.src = reader.result;

    previewBox.style.display = "block";
    previewImage.classList.remove("show");

    setTimeout(() => {
      previewImage.classList.add("show");
    }, 10);
  };
  reader.readAsDataURL(file);
});

// ▼ アップロード処理
uploadBtn.addEventListener("click", async () => {
  const file = frameInput.files[0];
  const frameName = frameNameInput.value.trim();

  if (!file) {
    resultBox.textContent = "⚠ ファイルが選択されていません。";
    return;
  }
  if (!frameName) {
    resultBox.textContent = "⚠ フレーム名を入力してください。";
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.classList.add("loading");
  uploadBtn.innerHTML = `<span class="loading-spinner"></span>アップロード中…`;

  resultBox.textContent = "⏳ アップロード中...";

  try {
    const base64Data = await toBase64(file);

    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: `${frameName}.png`,
        content: base64Data
      })
    });

    const data = await response.json();

    if (response.ok) {
      resultBox.innerHTML = `
        ✅ アップロード完了！<br>
        <a href="${data.url}" target="_blank">${data.url}</a>
      `;

      uploadBtn.classList.add("upload-glow");

      previewImage.classList.add("reset-anim");
      frameNameInput.classList.add("reset-anim");
      frameInput.classList.add("reset-anim");

      setTimeout(() => {
        frameNameInput.value = "";
        frameInput.value = "";
        previewImage.src = "";
        previewBox.style.display = "none";

        previewImage.classList.remove("reset-anim");
        frameNameInput.classList.remove("reset-anim");
        frameInput.classList.remove("reset-anim");

        uploadBtn.classList.remove("upload-glow");
      }, 600);
    } else {
      resultBox.textContent = `❌ エラー: ${data.message || "アップロードに失敗しました。"}`;
    }
  } catch (err) {
    console.error(err);
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }

  uploadBtn.disabled = false;
  uploadBtn.classList.remove("loading");
  uploadBtn.innerHTML = "アップロード";
});
