// ================================
// FrameLab 管理パネル用 admin.js（完全版）
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

// ▼ GitHub raw で存在チェック
async function checkFileExists(filename) {
  const rawUrl = `https://raw.githubusercontent.com/framesynth/icon-maker/main/frames/${filename}`;
  const res = await fetch(rawUrl, { method: "HEAD" });
  return res.ok;
}

// ▼ アップロード処理
uploadBtn.addEventListener("click", async () => {
  const file = frameInput.files[0];
  const frameName = frameNameInput.value.trim();

  if (!file) return (resultBox.textContent = "⚠ ファイルが選択されていません。");
  if (!frameName) return (resultBox.textContent = "⚠ フレーム名を入力してください。");

  const filename = `${frameName}.png`;
  const exists = await checkFileExists(filename);

  uploadFrame(file, frameName);
});

// ▼ 実際のアップロード
async function uploadFrame(file, frameName) {
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<span class="loading-spinner"></span>アップロード中…`;

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

    if (data.success) {
      const rawUrl = data.data.url;
      const userPageUrl = "https://framesynth.github.io/icon-maker/";

      resultBox.innerHTML = `
        <div class="success-box fade-in">
          <div class="success-icon">✓</div>
          <div class="success-text">
            アップロードが完了しました。<br>
            反映をご確認ください。
          </div>
        </div>

        <div class="success-links fade-in">
          <p>📁 GitHub 反映URL：</p>
          <a href="${rawUrl}" target="_blank">${rawUrl}</a>

          <p>👀 ユーザー画面：</p>
          <a href="${userPageUrl}" target="_blank">${userPageUrl}</a>

          <button id="checkReflectBtn" class="reflect-btn">反映チェック</button>
          <div id="reflectStatus"></div>
        </div>
      `;
    } else {
      resultBox.innerHTML = `❌ エラー：${data.error?.message || "不明なエラー"}`;
    }
  } catch {
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }

  uploadBtn.disabled = false;
  uploadBtn.innerHTML = "アップロード";
}

// ▼ 反映チェック
document.addEventListener("click", async (e) => {
  if (e.target.id !== "checkReflectBtn") return;

  const statusBox = document.getElementById("reflectStatus");
  statusBox.textContent = "⏳ チェック中…";

  const rawUrl = document.querySelector("#result a").href;

  try {
    const res = await fetch(rawUrl + "?t=" + Date.now(), {
      method: "HEAD",
      cache: "no-store"
    });

    if (res.status === 200) {
      statusBox.innerHTML = `✅ 反映されています。`;
      statusBox.style.color = "#0a8a0a";
    } else {
      statusBox.innerHTML = `⌛ まだ反映されていません（${res.status}）`;
      statusBox.style.color = "#b8860b";
    }
  } catch {
    statusBox.innerHTML = `⚠ チェック中にエラーが発生しました`;
    statusBox.style.color = "#c0392b";
  }
});

// ================================
// ▼ 削除モード（チェック式・複数削除対応）
// ================================
async function loadFrameList() {
  const repo = "framesynth/icon-maker";
  const url = `https://api.github.com/repos/${repo}/contents/frames?t=${Date.now()}`;

  const listBox = document.getElementById("frameList");
  listBox.innerHTML = "読み込み中…";

  try {
    const res = await fetch(url);
    const data = await res.json();

    listBox.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      listBox.innerHTML = "現在、削除できるフレームはありません。";
      return;
    }

    data.forEach(item => {
      if (!item.name.endsWith(".png")) return;

      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/frames/${item.name}`;

      const div = document.createElement("div");
      div.className = "frame-item";

      div.innerHTML = `
        <input type="checkbox" class="frame-checkbox" data-name="${item.name}">
        <img src="${rawUrl}" class="frame-thumb">
        <div class="frame-name">${item.name}</div>
      `;

      listBox.appendChild(div);
    });

  } catch {
    listBox.innerHTML = "⚠ フレーム一覧の取得に失敗しました。通信状況を確認してください。";
  }
}

// ▼ 複数削除ボタン
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
