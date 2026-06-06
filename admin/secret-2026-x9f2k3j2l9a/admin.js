// ================================
// FrameLab 管理パネル用 admin.js（最終完全版）
// ================================

// Cloudflare Worker のエンドポイントURL
const WORKER_ENDPOINT = "https://framelab-uploader.narun091525-b98.workers.dev";

// UI 要素
const uploadBtn = document.getElementById("uploadBtn");
const frameInput = document.getElementById("frameInput");
const frameNameInput = document.getElementById("frameName"); // ★ 追加
const resultBox = document.getElementById("result");

// ファイルを Base64（ヘッダー付き）に変換
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data:image/png;base64,xxxx
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// アップロード処理
uploadBtn.addEventListener("click", async () => {
  const file = frameInput.files[0];
  const frameName = frameNameInput.value.trim(); // ★ 入力されたフレーム名

  // ▼ 入力チェック
  if (!frameName) {
    resultBox.textContent = "⚠ フレーム名を入力してください。";
    return;
  }
  if (!file) {
    resultBox.textContent = "⚠ ファイルが選択されていません。";
    return;
  }

  resultBox.textContent = "⏳ アップロード中...";

  try {
    // Base64（ヘッダー付き）に変換
    const base64Data = await toBase64(file);

    // Cloudflare Worker に送信
    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: `${frameName}.png`, // ★ 入力した名前で保存
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
    } else {
      resultBox.textContent = `❌ エラー: ${data.message || "アップロードに失敗しました。"}`;
    }
  } catch (err) {
    console.error(err);
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }
});
