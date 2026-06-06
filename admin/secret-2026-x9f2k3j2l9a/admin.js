// ================================
// FrameLab 管理パネル用 admin.js（完全版）
// ================================

const WORKER_ENDPOINT = "https://framelab-uploader.narun091525-b98.workers.dev";

const uploadBtn = document.getElementById("uploadBtn");
const frameInput = document.getElementById("frameInput");
const frameNameInput = document.getElementById("frameName");
const resultBox = document.getElementById("result");
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
    previewImage.style.display = "none";
    previewImage.src = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    previewImage.src = reader.result;
    previewImage.style.display = "block";
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

  // ▼ ローディング開始
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
        GitHub に保存されました。<br>
        <a href="${data.url}" target="_blank">${data.url}</a>
      `;

      // ▼ ボタン光る
      uploadBtn.classList.add("upload-glow");

      // ▼ 入力欄アニメーション
      previewImage.classList.add("reset-anim");
      frameNameInput.classList.add("reset-anim");
      frameInput.classList.add("reset-anim");

      // ▼ アニメーション終了後にリセット
      setTimeout(() => {
        frameNameInput.value = "";
        frameInput.value = "";
        previewImage.src = "";
        previewImage.style.display = "none";

        previewImage.classList.remove("reset-anim");
        frameNameInput.classList.remove("reset-anim");
        frameInput.classList.remove("reset-anim");

        uploadBtn.classList.remove("upload-glow");

        // 一覧を更新
        loadFrameList();
      }, 600);
    } else {
      resultBox.textContent = `❌ エラー: ${data.message || "アップロードに失敗しました。"}`;
    }
  } catch (err) {
    console.error(err);
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }

  // ▼ ローディング解除
  uploadBtn.disabled = false;
  uploadBtn.classList.remove("loading");
  uploadBtn.innerHTML = "アップロード";
});

// ================================
// ▼ フレーム一覧を読み込む
// ================================
async function loadFrameList() {
  const listBox = document.getElementById("frameList");
  listBox.textContent = "読み込み中…";

  try {
    const res = await fetch("https://api.github.com/repos/framesynth/icon-maker/contents/frames");
    const data = await res.json();

    listBox.innerHTML = "";

    data.forEach(item => {
      if (!item.name.endsWith(".png")) return;

      const row = document.createElement("div");
      row.className = "frame-item";

      row.innerHTML = `
        <span>${item.name}</span>
        <button class="delete-btn" data-name="${item.name}">削除</button>
      `;

      listBox.appendChild(row);
    });

    // 削除ボタンにイベント付与
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteFrame(btn.dataset.name));
    });

  } catch (err) {
    listBox.textContent = "読み込みエラー";
  }
}

// ================================
// ▼ フレーム削除処理
// ================================
async function deleteFrame(filename) {
  if (!confirm(`${filename} を削除しますか？`)) return;

  const res = await fetch(WORKER_ENDPOINT, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename })
  });

  const data = await res.json();

  if (res.ok) {
    alert("削除しました");
    loadFrameList();
  } else {
    alert("削除に失敗しました");
  }
}

// 初回読み込み
loadFrameList();
