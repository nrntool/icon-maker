// ================================
// FrameLab 管理パネル用 admin.js（日本語名対応・ランダム保存版）
// ================================

const WORKER_ENDPOINT = "https://framelab-uploader.narun091525-b98.workers.dev";

// ▼ モード切り替え要素
const addModeBtn = document.getElementById("addModeBtn");
const deleteModeBtn = document.getElementById("deleteModeBtn");
const addModeCard = document.getElementById("addModeCard");
const deleteModeCard = document.getElementById("deleteModeCard");
const modeSelect = document.getElementById("modeSelect");

// ▼ 戻るボタン
const backToSelectFromAdd = document.getElementById("backToSelectFromAdd");
const backToSelectFromDelete = document.getElementById("backToSelectFromDelete");

// ▼ フェード表示
function showCard(card) {
  card.style.display = "block";
  requestAnimationFrame(() => card.classList.add("show"));
}

function hideCard(card) {
  card.classList.remove("show");
  setTimeout(() => (card.style.display = "none"), 300);
}

// ▼ モード切り替え
addModeBtn.onclick = () => {
  hideCard(modeSelect);
  hideCard(deleteModeCard);
  showCard(addModeCard);
};

deleteModeBtn.onclick = () => {
  hideCard(modeSelect);
  hideCard(addModeCard);
  showCard(deleteModeCard);
  loadFrameList();
};

backToSelectFromAdd.onclick = () => {
  hideCard(addModeCard);
  showCard(modeSelect);
};

backToSelectFromDelete.onclick = () => {
  hideCard(deleteModeCard);
  showCard(modeSelect);
};

// ================================
// ▼ 追加モード
// ================================
const uploadBtn = document.getElementById("uploadBtn");
const frameInput = document.getElementById("frameInput");
const frameNameInput = document.getElementById("frameName");
const resultBox = document.getElementById("result");
const previewBox = document.getElementById("previewBox");
const previewImage = document.getElementById("previewImage");

// Base64 変換
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ▼ プレビュー
frameInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) {
    previewBox.style.display = "none";
    previewImage.src = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    previewImage.src = reader.result;
    previewBox.style.display = "block";
    previewImage.classList.add("show");
  };
  reader.readAsDataURL(file);
};

// ▼ アップロード処理（日本語名OK・GitHub保存名はランダム）
uploadBtn.onclick = async () => {
  const file = frameInput.files[0];
  const frameDisplayName = frameNameInput.value.trim(); // ← 日本語名

  if (!file) return (resultBox.textContent = "⚠ ファイルが選択されていません。");
  if (!frameDisplayName) return (resultBox.textContent = "⚠ フレーム名を入力してください。");

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<span class="loading-spinner"></span>アップロード中…`;

  try {
    const base64Data = await toBase64(file);

    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frameDisplayName, // ← 日本語名を送信
        content: base64Data
      })
    });

    const data = await response.json();

    if (data.success) {
      resultBox.innerHTML = `
        <div class="success-box fade-in">
          <div class="success-icon">✓</div>
          <div class="success-text">
            「${frameDisplayName}」のアップロードが完了しました。
          </div>
        </div>
      `;
    } else {
      resultBox.innerHTML = `<div class="error-box fade-in">❌ エラー：${data.error.message}</div>`;
    }
  } catch {
    resultBox.innerHTML = `<div class="error-box fade-in">⚠ 通信エラーが発生しました。</div>`;
  }

  uploadBtn.disabled = false;
  uploadBtn.innerHTML = "アップロード";
};

// ================================
// ▼ 削除モード
// ================================
async function loadFrameList() {
  const repo = "framesynth/icon-maker";
  const url = `https://api.github.com/repos/${repo}/contents/frames?t=${Date.now()}`;

  const listBox = document.getElementById("frameList");
  listBox.textContent = "読み込み中…";

  try {
    const res = await fetch(url);
    const data = await res.json();

    listBox.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      listBox.textContent = "現在、削除できるフレームはありません。";
      return;
    }

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

  } catch {
    listBox.textContent = "⚠ フレーム一覧の取得に失敗しました。通信状況を確認してください。";
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

    if (data.success) {
      e.target.parentElement.remove();
    } else {
      alert(`削除に失敗しました：${data.error.message}`);
    }
  } catch {
    alert("通信エラーが発生しました");
  }
});
