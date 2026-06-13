// ================================
// FrameLab 管理パネル用 admin.js（最終完成版）
// ================================

const WORKER_ENDPOINT = "https://framelab-uploader.narun091525-b98.workers.dev";

// ▼ モード切り替え
const addModeBtn = document.getElementById("addModeBtn");
const deleteModeBtn = document.getElementById("deleteModeBtn");
const addModeCard = document.getElementById("addModeCard");
const deleteModeCard = document.getElementById("deleteModeCard");
const modeSelect = document.getElementById("modeSelect");

addModeBtn.addEventListener("click", () => {
  modeSelect.style.display = "none";
  addModeCard.style.display = "block";
  deleteModeCard.style.display = "none";
});

deleteModeBtn.addEventListener("click", () => {
  modeSelect.style.display = "none";
  addModeCard.style.display = "none";
  deleteModeCard.style.display = "block";
  loadFrameList();
});

// ▼ 追加モード（アップロード処理）
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

// ▼ プレビュー表示
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

    if (response.ok) {
      const rawUrl = data.url;
      const userPageUrl = "https://framesynth.github.io/icon-maker/";

      resultBox.innerHTML = `
        ✅ アップロード完了！<br><br>

        📁 GitHub 反映URL：<br>
        <a href="${rawUrl}" target="_blank">${rawUrl}</a><br><br>

        👀 ユーザー画面で確認：<br>
        <a href="${userPageUrl}" target="_blank">${userPageUrl}</a><br><br>

        <button id="checkReflectBtn">反映チェック</button>
        <div id="reflectStatus"></div>
      `;

      // 入力リセット
      frameNameInput.value = "";
      frameInput.value = "";
      previewImage.src = "";
      previewBox.style.display = "none";

    } else {
      resultBox.textContent = `❌ エラー: ${data.message}`;
    }
  } catch (err) {
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }

  uploadBtn.disabled = false;
  uploadBtn.innerHTML = "アップロード";
});

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
      statusBox.innerHTML = `✅ 反映されています！`;
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

// ▼ 削除モード（一覧読み込み）
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

  } catch {
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

    if (res.ok) {
      e.target.parentElement.remove();
    } else {
      alert("削除に失敗しました");
    }
  } catch {
    alert("通信エラーが発生しました");
  }
});

