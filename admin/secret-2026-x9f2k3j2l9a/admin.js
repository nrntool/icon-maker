// ================================
// FrameLab 管理パネル用 admin.js
// ================================

// Cloudflare Worker のエンドポイントURL（あなたが作ったものに置き換える）
const WORKER_ENDPOINT = "https://your-worker-name.workers.dev/upload-frame";

// アップロードボタンと結果表示要素
const uploadBtn = document.getElementById("uploadBtn");
const frameInput = document.getElementById("frameInput");
const resultBox = document.getElementById("result");

// ファイルをBase64に変換する関数
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// アップロード処理
uploadBtn.addEventListener("click", async () => {
  const file = frameInput.files[0];
  if (!file) {
    resultBox.textContent = "⚠ ファイルが選択されていません。";
    return;
  }

  resultBox.textContent = "⏳ アップロード中...";

  try {
    // ファイルをBase64化
    const base64Data = await toBase64(file);

    // Cloudflare Worker に送信
    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        content: base64Data
      })
    });

    const data = await response.json();

    if (response.ok) {
      resultBox.textContent = `✅ アップロード完了！\nGitHub に保存されました。\nURL: ${data.url}`;
    } else {
      resultBox.textContent = `❌ エラー: ${data.message || "アップロードに失敗しました。"}`;
    }
  } catch (err) {
    console.error(err);
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }
});
