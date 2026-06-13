// ================================
// FrameLab 管理画面 admin.js（完全版）
// ================================

// DOM取得
const modeSelect = document.getElementById("modeSelect");
const addModeCard = document.getElementById("addModeCard");
const deleteModeCard = document.getElementById("deleteModeCard");

const addModeBtn = document.getElementById("addModeBtn");
const deleteModeBtn = document.getElementById("deleteModeBtn");

const backToSelectFromAdd = document.getElementById("backToSelectFromAdd");
const backToSelectFromDelete = document.getElementById("backToSelectFromDelete");

const frameInput = document.getElementById("frameInput");
const previewBox = document.getElementById("previewBox");
const previewImage = document.getElementById("previewImage");

const frameName = document.getElementById("frameName");
const uploadBtn = document.getElementById("uploadBtn");
const resultBox = document.getElementById("result");

const overwriteDialog = document.getElementById("overwriteDialog");
const overwriteYes = document.getElementById("overwriteYes");
const overwriteNo = document.getElementById("overwriteNo");

const frameList = document.getElementById("frameList");

let selectedFile = null;
let pendingUploadData = null;

// ================================
// モード切り替え
// ================================

function showCard(card) {
  modeSelect.style.display = "none";
  addModeCard.style.display = "none";
  deleteModeCard.style.display = "none";

  card.classList.add("fade");
  card.style.display = "block";

  setTimeout(() => {
    card.classList.add("show");
  }, 10);
}

addModeBtn.onclick = () => showCard(addModeCard);
deleteModeBtn.onclick = () => {
  loadFrameList();
  showCard(deleteModeCard);
};

backToSelectFromAdd.onclick = () => location.reload();
backToSelectFromDelete.onclick = () => location.reload();

// ================================
// プレビュー表示
// ================================

frameInput.addEventListener("change", () => {
  selectedFile = frameInput.files[0];
  if (!selectedFile) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    previewBox.style.display = "block";

    setTimeout(() => {
      previewImage.classList.add("show");
    }, 10);
  };
  reader.readAsDataURL(selectedFile);
});

// ================================
// アップロード処理
// ================================

uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    showError("画像が選択されていません。");
    return;
  }
  if (!frameName.value.trim()) {
    showError("フレーム名を入力してください。");
    return;
  }

  uploadBtn.classList.add("loading");
  uploadBtn.innerHTML = `<span class="loading-spinner"></span> アップロード中...`;

  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("name", frameName.value.trim());

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();

  uploadBtn.classList.remove("loading");
  uploadBtn.textContent = "アップロード";

  if (!data.success) {
    if (data.error.message.includes("sha")) {
      pendingUploadData = formData;
      showOverwriteDialog();
    } else {
      showError(`エラー: ${data.error.message}`);
    }
    return;
  }

  if (data.data.overwrite) {
    showSuccess("既存のフレームを上書きしました。<br>ユーザー画面で反映をご確認いただけます。");
  } else {
    showSuccess("アップロードが完了しました。<br>ユーザー画面で反映をご確認いただけます。");
  }
});

// ================================
// 上書き確認ダイアログ
// ================================

function showOverwriteDialog() {
  overwriteDialog.style.display = "flex";
}

overwriteNo.onclick = () => {
  overwriteDialog.style.display = "none";
  pendingUploadData = null;
};

overwriteYes.onclick = async () => {
  if (!pendingUploadData) return;

  overwriteDialog.style.display = "none";

  uploadBtn.classList.add("loading");
  uploadBtn.innerHTML = `<span class="loading-spinner"></span> 上書き中...`;

  const res = await fetch("/upload?overwrite=true", {
    method: "POST",
    body: pendingUploadData
  });
  const data = await res.json();

  uploadBtn.classList.remove("loading");
  uploadBtn.textContent = "アップロード";

  if (!data.success) {
    showError(`エラー: ${data.error.message}`);
    return;
  }

  showSuccess("既存のフレームを上書きしました。<br>ユーザー画面で反映をご確認いただけます。");
  pendingUploadData = null;
};

// ================================
// 成功・エラー表示（高級版）
// ================================

function showError(message) {
  resultBox.innerHTML = `
    <div class="error-box">
      <div class="error-icon">!</div>
      <div>${message}</div>
    </div>
  `;
}

function showSuccess(message) {
  resultBox.innerHTML = `
    <div class="success-box">
      <div class="success-icon">✓</div>
      <div>${message}</div>
    </div>
  `;
}

// ================================
// 削除モード：一覧取得
// ================================

async function loadFrameList() {
  frameList.innerHTML = "読み込み中...";

  const res = await fetch("/list");
  const data = await res.json();

  if (!data.success) {
    frameList.innerHTML = "読み込みに失敗しました。";
    return;
  }

  frameList.innerHTML = "";

  data.files.forEach((file) => {
    const item = document.createElement("div");
    item.className = "frame-item";

    item.innerHTML = `
      <img src="${file.url}" class="frame-thumb" />
      <p>${file.name}</p>
      <button class="delete-btn" data-name="${file.name}">削除</button>
    `;

    frameList.appendChild(item);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = () => deleteFrame(btn.dataset.name);
  });
}

// ================================
// 削除処理
// ================================

async function deleteFrame(name) {
  const res = await fetch(`/delete?name=${encodeURIComponent(name)}`, {
    method: "DELETE"
  });
  const data = await res.json();

  if (!data.success) {
    alert("削除に失敗しました。");
    return;
  }

  loadFrameList();
}
