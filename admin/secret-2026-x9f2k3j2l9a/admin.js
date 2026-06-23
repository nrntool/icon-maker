// ================================
// FrameLab 管理パネル admin.js（完全版）
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
addModeBtn.addEventListener("click", () => {
  hideCard(modeSelect);
  hideCard(deleteModeCard);
  showCard(addModeCard);
});

deleteModeBtn.addEventListener("click", () => {
  hideCard(modeSelect);
  hideCard(addModeCard);
  showCard(deleteModeCard);
  loadFrameList();
});

backToSelectFromAdd.addEventListener("click", () => {
  hideCard(addModeCard);
  showCard(modeSelect);
});

backToSelectFromDelete.addEventListener("click", () => {
  hideCard(deleteModeCard);
  showCard(modeSelect);
});

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
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ▼ プレビュー
frameInput.addEventListener("change", (e) => {
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
});

// ▼ ランダム英数字ファイル名生成
function randomFilename() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let name = "";
  for (let i = 0; i < 12; i++) name += chars[Math.floor(Math.random() * chars.length)];
  return name + ".png";
}

// ================================
// ▼ 自動反映チェックループ（4段階表示）
// ================================
async function startReflectCheck(randomName, frameName) {
  const statusBox = document.getElementById("reflectStatus");
  statusBox.textContent = "⏳ 反映確認中…"; // アップロード直後

  async function check() {
    try {
      const listRes = await fetch(WORKER_ENDPOINT + "?mode=list&t=" + Date.now());
      const listData = await listRes.json();

      const found = listData.data.frames.find(f => f.filename === randomName);

      // ▼ 完全反映後
      if (found && found.displayName === frameName) {
        statusBox.innerHTML = "✅ 反映されました";
        statusBox.style.color = "#0a8a0a";
        return;
      }

      // ▼ GitHub 反映中
      statusBox.innerHTML = "⌛ 反映待ち中…（自動チェック中）";
      statusBox.style.color = "#b8860b";

      setTimeout(check, 2000); // 2秒後に再チェック

    } catch {
      // ▼ 一時的な通信エラー
      statusBox.innerHTML = "⚠ 一時的な通信エラー。再試行しています…";
      statusBox.style.color = "#c0392b";

      setTimeout(check, 3000); // 3秒後に再試行
    }
  }

  check(); // 最初のチェック開始
}

// ================================
// ▼ アップロード処理
// ================================
uploadBtn.addEventListener("click", async () => {
  const file = frameInput.files[0];
  const frameName = frameNameInput.value.trim();

  if (!file) return (resultBox.textContent = "⚠ ファイルが選択されていません。");
  if (!frameName) return (resultBox.textContent = "⚠ フレーム名を入力してください。");

  uploadFrame(file, frameName);
});

// ▼ 実際のアップロード
async function uploadFrame(file, frameName) {
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<span class="loading-spinner"></span>アップロード中…`;

  try {
    const base64Data = await toBase64(file);
    const randomName = randomFilename();

    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: randomName,
        displayName: frameName,
        content: base64Data
      })
    });

    const data = await response.json();

    if (data.success) {
      const rawUrl = data.data.url;
      const userPageUrl = "https://framesynth.github.io/icon-maker/";

      resultBox.innerHTML = `
        <div class="success-box fade-in">
          <div class="success-icon">✓</div>
          <div class="success-text">
            アップロードが完了しました。<br>
            GitHub反映を確認しています…
          </div>
        </div>

        <div class="success-links fade-in">
          <p>📁 GitHub 反映URL：</p>
          <a href="${rawUrl}" target="_blank">${rawUrl}</a>

          <p>👀 ユーザー画面：</p>
          <a href="${userPageUrl}" target="_blank">${userPageUrl}</a>

          <div id="reflectStatus"></div>
        </div>
      `;

      // ▼ 自動反映チェック開始
      startReflectCheck(randomName, frameName);

    } else {
      resultBox.innerHTML = `❌ エラー：${data.error?.message || "不明なエラー"}`;
    }
  } catch {
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }

  uploadBtn.disabled = false;
  uploadBtn.innerHTML = "アップロード";
}

// ================================
// ▼ 削除モード（日本語名対応）
// ================================
async function loadFrameList() {
  const url = WORKER_ENDPOINT + "?mode=list&t=" + Date.now();
  const listBox = document.getElementById("frameList");

  listBox.innerHTML = "読み込み中…";

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || !data.data.frames.length) {
      listBox.innerHTML = "現在、削除できるフレームはありません。";
      return;
    }

    listBox.innerHTML = "";

    data.data.frames.forEach(item => {
      const div = document.createElement("div");
      div.className = "frame-item";

      div.innerHTML = `
        <input type="checkbox" class="frame-checkbox" data-name="${item.filename}">
        <img src="${item.url}" class="frame-thumb">
        <div class="frame-name">${item.displayName || item.filename}</div>
      `;

      listBox.appendChild(div);
    });

  } catch {
    listBox.innerHTML = "⚠ フレーム一覧の取得に失敗しました。";
  }
}

// ▼ 複数削除
document.getElementById("deleteSelectedBtn")?.addEventListener("click", async () => {
  const checked = [...document.querySelectorAll(".frame-checkbox:checked")];
  if (checked.length === 0) {
    alert("削除するフレームを選択してください。");
    return;
  }

  if (!confirm(`${checked.length} 件のフレームを削除しますか？`)) return;

  for (const checkbox of checked) {
    const filename = checkbox.dataset.name;

    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });

      const data = await res.json();

      if (data.success) {
        checkbox.closest(".frame-item").remove();
      } else {
        alert(`削除失敗: ${filename} (${data.error.message})`);
      }
    } catch {
      alert(`通信エラー: ${filename}`);
    }
  }

  alert("削除が完了しました。");
});
