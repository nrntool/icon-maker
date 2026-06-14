// ================================
// FrameLab 管理パネル admin.js（CSS同期版・完全統合）
// ================================

const WORKER_ENDPOINT = "https://framelab-uploader.narun091525-b98.workers.dev";

// ▼ DOM
const modeSelect = document.getElementById("modeSelect");
const addModeCard = document.getElementById("addModeCard");
const deleteModeCard = document.getElementById("deleteModeCard");

const addModeBtn = document.getElementById("addModeBtn");
const deleteModeBtn = document.getElementById("deleteModeBtn");

const backToSelectFromAdd = document.getElementById("backToSelectFromAdd");
const backToSelectFromDelete = document.getElementById("backToSelectFromDelete");

const frameInput = document.getElementById("frameInput");
const frameNameInput = document.getElementById("frameName");
const uploadBtn = document.getElementById("uploadBtn");

const previewBox = document.getElementById("previewBox");
const previewImage = document.getElementById("previewImage");

const resultBox = document.getElementById("result");

const overwriteDialog = document.getElementById("overwriteDialog");
const overwriteYes = document.getElementById("overwriteYes");
const overwriteNo = document.getElementById("overwriteNo");

const frameList = document.getElementById("frameList");

// ================================
// カード切り替え（CSS の fade/show と同期）
// ================================
function showCard(card) {
  card.style.display = "block";
  requestAnimationFrame(() => card.classList.add("show"));
}

function hideCard(card) {
  card.classList.remove("show");
  setTimeout(() => (card.style.display = "none"), 250);
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
// プレビュー（CSS と完全同期）
// ================================
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

    // CSS の fade-in と同期
    previewImage.classList.remove("show");
    requestAnimationFrame(() => previewImage.classList.add("show"));
  };
  reader.readAsDataURL(file);
});

// ================================
// Base64 変換
// ================================
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ================================
// GitHub に同名ファイルがあるか確認
// ================================
async function checkFileExists(filename) {
  const repo = "framesynth/icon-maker";
  const url = `https://api.github.com/repos/${repo}/contents/frames/${filename}`;
  const res = await fetch(url);
  return res.ok;
}

// ================================
// アップロード処理
// ================================
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

  const filename = `${frameName}.png`;

  // 上書きチェック
  const exists = await checkFileExists(filename);

  if (exists) {
    overwriteDialog.style.display = "flex";
    overwriteYes.onclick = () => {
      overwriteDialog.style.display = "none";
      uploadFrame(file, frameName);
    };
    overwriteNo.onclick = () => {
      overwriteDialog.style.display = "none";
    };
    return;
  }

  uploadFrame(file, frameName);
});

// ================================
// 実際のアップロード処理
// ================================
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
        ${data.data.overwrite ? "🔄 上書き完了！" : "✅ アップロード完了！"}<br><br>

        📁 GitHub 反映URL：<br>
        <a href="${rawUrl}" target="_blank">${rawUrl}</a><br><br>

        👀 ユーザー画面で確認：<br>
        <a href="${userPageUrl}" target="_blank">${userPageUrl}</a><br><br>

        <button id="checkReflectBtn">反映チェック</button>
        <div id="reflectStatus"></div>
      `;
    } else {
      resultBox.textContent = `❌ エラー: ${data.error.message}`;
    }
  } catch {
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }

  uploadBtn.disabled = false;
  uploadBtn.innerHTML = "アップロード";
}

// ================================
// 反映チェック
// ================================
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
// 削除モード：一覧読み込み
// ================================
async function loadFrameList() {
  const repo = "framesynth/icon-maker";
  const url = `https://api.github.com/repos/${repo}/contents/frames?t=${Date.now()}`;

  frameList.innerHTML = "読み込み中…";

  try {
    const res = await fetch(url);
    const data = await res.json();

    frameList.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      frameList.innerHTML = "現在、削除できるフレームはありません。";
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

      frameList.appendChild(div);
    });

  } catch {
    frameList.innerHTML = "現在、削除できるフレームはありません。";
  }
}

// ================================
// 削除処理
// ================================
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
