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

// ▼ サムネイル表示
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

      // ▼ アップロード後に一覧を更新
      loadFrameList();

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

// ▼ フレーム一覧読み込み
async function loadFrameList() {
  const repo = "framesynth/icon-maker";
  const url = `https://api.github.com/repos/${repo}/contents/frames?t=${Date.now()}`;

  const listBox = document.getElementById("frameList");
  listBox.innerHTML = "読み込み中…";

  try {
    const res = await fetch(url);
    const data = await res.json();

    listBox.innerHTML = "";

    data.forEach(item => {
      if (!item.name.endsWith(".png")) return;

      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/frames/${item.name}`;

      const div = document.createElement("div");
      div.className = "frame-item";

      div.innerHTML = `
        <img src="${rawUrl}" class="frame-thumb">
        <div>${item.name}</div>
        <button class="delete-btn" data-name="${item.name}">削除</button>
      `;

      listBox.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    listBox.innerHTML = "読み込みに失敗しました。";
  }
}

// ▼ 削除処理
document.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("delete-btn")) return;

  const filename = e.target.dataset.name;

  if (!confirm(`${filename} を削除しますか？`)) return;

  e.target.textContent = "削除中…";
  e.target.disabled = true;

  try {
    const res = await fetch(WORKER_ENDPOINT, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });

    const data = await res.json();

    if (res.ok) {
      e.target.parentElement.remove();
    } else {
      alert("削除に失敗しました: " + data.message);
    }

  } catch (err) {
    console.error(err);
    alert("通信エラーが発生しました");
  }
});

// ▼ 初期ロード
window.addEventListener("DOMContentLoaded", loadFrameList);
