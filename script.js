export default {
  async fetch(request, env) {
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    const REPO = "nrntool/icon-maker";
    const BRANCH = "main";
    const url = new URL(request.url);

    async function getAdminPassword(env) {
      return await env.PASSWORD_KV.get("adminPassword");
    }

    // ================================
    // ▼ 管理画面（Cookie方式）
    // ================================
    if (url.pathname === "/admin") {
      const ADMIN_PASSWORD = await getAdminPassword(env);
      const pass = url.searchParams.get("pass");

      const cookie = request.headers.get("Cookie") || "";
      const saved = cookie.split("; ").find(v => v.startsWith("fl_admin="));
      const cookiePass = saved ? decodeURIComponent(saved.split("=")[1]) : null;

      // ▼ クエリにパスがある → Cookie発行してURLを綺麗にする
      if (pass) {
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/admin",
            "Set-Cookie": `fl_admin=${pass}; Path=/; HttpOnly; Secure; SameSite=Lax`
          }
        });
      }

      const finalPass = cookiePass;

      // ▼ Cookie が無い → ログイン画面
      if (!finalPass) {
        return new Response(LOGIN_HTML, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      // ▼ パスワード不一致
      if (finalPass !== ADMIN_PASSWORD) {
        return new Response(
          LOGIN_HTML.replace(
            `<div id="msg"></div>`,
            `<div id="msg">パスワードが違います</div>`
          ),
          {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          }
        );
      }

      // ▼ 管理画面表示
      return new Response(ADMIN_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // ================================
    // ▼ パスワード変更画面
    // ================================
    if (url.pathname === "/change") {
      return new Response(CHANGE_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // ================================
    // ▼ CSS / JS
    // ================================
    if (url.pathname === "/admin.css") {
      return new Response(ADMIN_CSS, {
        status: 200,
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    if (url.pathname === "/admin.js") {
      return new Response(ADMIN_JS, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // ================================
    // ▼ パスワード変更 API（KV版）
    // ================================
    if (url.pathname === "/change-password") {
      const body = await request.json();
      const { currentPassword, newPassword } = body;

      const savedPw = await env.PASSWORD_KV.get("adminPassword");

      if (!savedPw) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: "KV にパスワードが設定されていません。" }
        }), { status: 400 });
      }

      if (currentPassword !== savedPw) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: "現在のパスワードが違います。" }
        }), { status: 400 });
      }

      await env.PASSWORD_KV.put("adminPassword", newPassword);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Set-Cookie": `fl_admin=${newPassword}; Path=/; HttpOnly; Secure; SameSite=Lax`
        }
      });
    }

    // ================================
    // ▼ ログアウト API（Cookie削除）
    // ================================
    if (url.pathname === "/logout") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Set-Cookie": "fl_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });
    }

    // ================================
    // ▼ CORS
    // ================================
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ================================
    // ▼ API：一覧
    // ================================
    if (request.method === "GET" && url.searchParams.get("mode") === "list") {
      return handleList(REPO, BRANCH, GITHUB_TOKEN);
    }

    // ================================
    // ▼ API：アップロード
    // ================================
    if (request.method === "POST") {
      return handleUpload(request, GITHUB_TOKEN, REPO, BRANCH);
    }

    // ================================
    // ▼ API：削除
    // ================================
    if (request.method === "DELETE") {
      return handleDelete(request, GITHUB_TOKEN, REPO, BRANCH);
    }

    return jsonError("Method Not Allowed", 405);
  },
};

/* ================================
   管理画面 HTML
================================ */
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FrameLab 管理画面</title>
  <link rel="stylesheet" href="/admin.css" />
</head>

<body>

  <div class="admin-banner">管理画面</div>

  <div class="card-wrapper">

    <div class="card-links">
      <span id="logoutLink" class="card-link">[ログアウト]</span>
      <span id="changePwLink" class="card-link">[パスワード変更]</span>
    </div>

    <div id="modeSelect" class="app-card">
      <h2 class="mode-title">操作を選択</h2>
      <p class="subtext">フレームを追加するか、削除するか選んでください。</p>

      <div class="mode-buttons">
        <button id="addModeBtn" class="mode-btn">フレームを追加</button>
        <button id="deleteModeBtn" class="mode-btn">フレームを削除</button>
      </div>
    </div>

    <div id="addModeCard" class="app-card" style="display:none;">
      <h2 class="mode-title">フレーム追加モード</h2>
      <section class="notice">
        <h2>ご利用にあたって</h2>
        <p>
          ・PC/スマートフォンどちらからでも利用できます。<br>
          ・フレームの内側のみを透過した画像を登録してください。<br>
          ・反映に時間がかかる場合があります。（最長5分程度）
        </p>
      </section>

      <label><span class="step-badge">1</span>画像を選択</label>
      <input type="file" id="frameInput" accept="image/*" />

      <div id="previewBox">
        <img id="previewImage" src="" alt="プレビュー" />
      </div>

      <label><span class="step-badge">2</span>フレーム名を入力</label>
      <input type="text" id="frameName" placeholder="例：予約バトル" />

      <div id="result"></div>

      <div class="upload-actions">
        <button id="backToSelectFromAdd" class="back-btn">← 戻る</button>
        <button id="uploadBtn" class="upload-btn-main">アップロード</button>
      </div>
    </div>

    <div id="deleteModeCard" class="app-card" style="display:none;">
      <h2 class="mode-title">フレーム削除モード</h2>
      <section class="notice">
        <h2>ご利用にあたって</h2>
        <p>
          ・PC/スマートフォンどちらからでも利用できます。<br>
          ・削除したいフレームにチェックをいれてください。
        </p>
      </section>

      <div id="frameList" class="frame-list"></div>

      <div class="delete-actions">
        <button id="backToSelectFromDelete" class="back-btn">← 戻る</button>
        <button id="deleteSelectedBtn" class="delete-btn-main">選択削除</button>
      </div>
    </div>

  </div>

  <script src="/admin.js"></script>
</body>
</html>`;

/* ================================
   管理画面 CSS
================================ */
const ADMIN_CSS = `

:root {
  --accent-blue: #6a8fc0;
  --accent-light: #7fa0d0;
  --text-main: #4a5f85;
  --glass: rgba(255,255,255,0.72);
  --glass-soft: rgba(255,255,255,0.65);
  --shadow-main: rgba(90,125,168,0.15);
  --shadow-light: rgba(90,125,168,0.08);
  --radius-card: 18px;
  --radius-btn: 12px;
  --radius-input: 10px;
}

html, body, button, input, select, label, p, h1, h2, h3, div, span {
  font-family: "Noto Sans JP", "Segoe UI", "Helvetica Neue", sans-serif;
  font-weight: 400;
  letter-spacing: 0.02em;
}

body {
  margin: 0;
  background: radial-gradient(circle at top, #e8ecf5 0%, #f4f6fb 45%, #f2f3f8 100%);
  color: #222;
  text-align: center;
  line-height: 1.8;
}

.notice {
  margin: 1.2em auto;
  text-align: left;
}

.notice h2 {
  font-size: 0.95em;
  font-weight: 600;
  color: #4a5f85;
  border-bottom: 2px solid rgba(90,125,168,0.35);
  display: inline-block;
  padding-bottom: 2px;
  margin-bottom: 0.3em;
}

.notice p {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(90,125,168,0.12);
  font-size: 0.85em;
  margin-top: 0;
  padding: 0.9em;
}

.fade-in {
  opacity: 0;
  transform: translateY(6px);
  animation: fadeInUp 0.45s ease-out forwards;
}

@keyframes fadeInUp {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}

.admin-banner {
  background: linear-gradient(180deg, #fff, #eef2fa);
  color: var(--text-main);
  padding: 0.6em;
  font-size: 0.95em;
  font-weight: 500;
  border-radius: 0 0 16px 16px;
  margin-bottom: 1.4em;
  box-shadow: 0 2px 6px var(--shadow-light), 0 10px 30px var(--shadow-light);
}

.header-actions{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:0.6em;
  margin:0 1.2em 1.2em;
}

.app-card {
  width: 92%;
  max-width: 440px;
  margin: 2.4em auto;
  padding: 2em 1.6em;
  background: var(--glass);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-card);
  border: 1px solid rgba(90,125,168,0.25);
  box-shadow: 0 4px 14px var(--shadow-main), 0 18px 40px var(--shadow-light);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.app-card:hover {
  transform: none;
  box-shadow: 0 6px 18px var(--shadow-main), 0 22px 50px var(--shadow-light);
}

.card-wrapper {
  position: relative;
  width: fit-content;
  margin: 0 auto;
  min-height: 480px;
}

.card-links {
  position: absolute;
  top: 0.8em;
  right: 1.5em;
  display: flex;
  gap: 0.8em;
  z-index: 9999;
  pointer-events: auto;
}

.card-link {
  color: var(--text-main);
  font-size: 0.85em;
  font-weight: 400;
  color: #4a5f85;
  cursor: pointer;
  transition: color 0.35s ease, opacity 0.35s ease;
}

.card-link:hover {
  color: var(--accent-blue);
  opacity: 0.85;
}

@media (prefers-color-scheme: dark) {
  .card-link {
    color: #d0d4e4;
  }
  .card-link:hover {
    color: #8fb2e0;
  }
}

.mode-title {
  font-family: "Playfair Display", "Noto Sans JP", serif;
  font-size: 1.48em;
  font-weight: 600;
  color: var(--text-main);
  margin-top: 1.4em;
  margin-bottom: 0.3em;
  line-height: 1.4;
}

.subtext {
  font-size: 0.9em;
  color: #6b7a99;
  margin-top: 0.2em;
  margin-bottom: 1.2em;
  line-height: 1.8;
}

.mode-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.8em;
  margin: 2.4em 0 1.6em;
  flex-wrap: wrap;
}

.mode-btn,
#uploadBtn,
.back-btn,
.delete-btn-main,
.upload-btn-main,
.change-btn {
  border-radius: var(--radius-btn);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 500;
  font-size: 0.95em;
  letter-spacing: 0.03em;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.mode-btn,
#uploadBtn,
.back-btn,
.delete-btn-main,
.upload-btn-main {
  width: 180px;
  height: 54px;
}

.mode-btn,
#uploadBtn,
.change-btn {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-light));
  color: #fff;
  border: 1px solid rgba(255,255,255,0.4);
  box-shadow: 0 4px 10px var(--shadow-main), inset 0 0 18px rgba(255,255,255,0.25);
}

.delete-btn-main,
.upload-btn-main {
  background: linear-gradient(135deg, #7fa0d0, #6a8fc0);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.55);
  box-shadow:
    0 4px 10px rgba(122,150,200,0.25),
    inset 0 0 18px rgba(255,255,255,0.25);
  font-weight: 600;
  white-space: nowrap;
}

.delete-btn-main:hover,
.upload-btn-main:hover,
.change-btn:hover {
  background: linear-gradient(135deg, #8fb2e0, #7698c8);
  transform: translateY(-2px);
}

.back-btn {
  background: linear-gradient(135deg, #dfe5f7, #cfd8f0);
  color: #364766;
  border: 1px solid rgba(255,255,255,0.45);
  box-shadow:
    0 2px 8px rgba(90,125,168,0.12),
    inset 0 0 18px rgba(255,255,255,0.28);
}

.back-btn:hover {
  background: linear-gradient(135deg, #f0f3fb, #e4e9f9);
  transform: translateY(-2px);
}

.mode-btn::before,
#uploadBtn::before,
.back-btn::before,
.delete-btn-main::before,
.upload-btn-main::before,
.change-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -40%;
  width: 80%;
  height: 100%;
  background: linear-gradient(120deg, rgba(255,255,255,0.45), transparent);
  transform: skewX(-25deg);
  transition: left 0.8s ease;
}

.mode-btn:hover::before,
#uploadBtn:hover::before,
.back-btn:hover::before,
delete-btn-main:hover::before,
.upload-btn-main:hover::before,
.change-btn:hover::before {
  left: 120%;
}

label {
  display: flex;
  align-items: center;
  margin: 1.2em 0 0.6em; 
  font-size: 0.92em;
  font-weight: 500;
  color: var(--text-main);
  line-height: 1.8;
}

.step-badge {
  width: 1.6em;
  height: 1.6em;
  margin-right: 0.6em;
  font-size: 0.85em;
  font-weight: 600;
  color: var(--text-main);
  border-radius: 6px;
  border: 1px solid rgba(90,125,168,0.35);
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(6px);
}

input[type="file"],
input[type="text"] {
  width: 100%;
  max-width: 400px;
  padding: 0.75em 1em;
  font-size: 0.92em;
  background: rgba(255,255,255,0.75);
  border: 1px solid rgba(90,125,168,0.25);
  border-radius: var(--radius-input);
  box-shadow: 0 2px 6px var(--shadow-main);
  margin-bottom: 0.8em;
  transition: 0.25s ease;
}

input[type="file"]::-webkit-file-upload-button {
  margin-right: 0.6em;
  padding: 0.6em 1em;
  background: linear-gradient(135deg, #eef2ff, #dfe6fa);
  border: none;
  border-radius: 6px;
  color: #4a5f85;
  font-family: "Noto Sans JP", sans-serif;
  font-weight: 400;
  font-size: 0.9em;
  cursor: pointer;
  transition: 0.25s ease;
  box-shadow:
    0 2px 6px rgba(90,125,168,0.15),
    inset 0 0 12px rgba(255,255,255,0.25);
}

input[type="file"]::-webkit-file-upload-button:hover {
  background: linear-gradient(135deg, #e3e8ff, #d6defa);
  box-shadow:
    0 4px 10px rgba(90,125,168,0.22),
    inset 0 0 18px rgba(255,255,255,0.3);
}

#previewBox {
  margin: 0.8em 0;
  padding: 1.4em;
  background: var(--glass-soft);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  box-shadow: 0 3px 12px var(--shadow-main);
  display: none;
}

#previewImage {
  width: 100%;
  max-width: 380px;
  border-radius: 12px;
  box-shadow: 0 4px 14px var(--shadow-main);
  display: block;
  margin: 0 auto;
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

#previewImage.show {
  opacity: 1;
  transform: scale(1);
}

.frame-list {
  display: flex;
  flex-direction: column;
  gap: 1.6em;
  margin-top: 2.4em;
}

.frame-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1.4em;
  padding: 1.2em;
  background: var(--glass-soft);
  border-radius: 14px;
  box-shadow: 0 3px 10px var(--shadow-main);
  text-align: left;
  line-height: 1.8; 
}

.frame-checkbox {
  transform: scale(1.3);
  cursor: pointer;
  flex-shrink: 0;
}

.frame-thumb {
  width: 90px;
  height: 90px;
  object-fit: contain;
  border-radius: 10px;
  background: #000;
  flex-shrink: 0;
}

.frame-name {
  flex: 1;
  font-size: 0.9em;
  color: var(--text-main);
  word-break: break-all;
  line-height: 1.8; 
}

.frame-checkbox:checked + img,
.frame-checkbox:checked ~ .frame-name {
  filter: brightness(1.15);
  transform: scale(1.02);
}

.delete-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1em;
  margin-top: 2.4em; 
  flex-wrap: nowrap;
}

.delete-actions .back-btn,
.delete-actions .delete-btn-main {
  width: 45%;
  min-width: 120px;
  height: 54px;
  border-radius: 12px;
}

.upload-actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 1em;
  margin-top: 2.4em; 
  flex-wrap: nowrap;
}

.upload-actions .back-btn,
.upload-actions .upload-btn-main {
  width: 45%;
  min-width: 120px;
  height: 54px;
  border-radius: 12px;
}

.logout-btn {
  display: inline-block;
  padding: 0.75em 1.6em;
  font-size: 0.95em;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #6a8fc0, #7fa0d0);
  color: #fff;
  box-shadow:
    0 4px 10px rgba(90,125,168,0.15),
    inset 0 0 18px rgba(255,255,255,0.25);
  transition: 0.25s ease;
}

.logout-btn:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, #8fb2e0, #7698c8);
}

@media (max-width: 600px) {
  .upload-actions {
    flex-direction: row;
    gap: 0.8em;
    margin-top: 2.4em;
  }

  .upload-actions .back-btn,
  .upload-actions .upload-btn-main {
    width: 44%;
    min-width: 110px;
  }

  .header-actions{
    flex-direction:column;
    align-items:flex-end;
    gap:0.4em;
    margin:0 1em 1.4em;
  }

  .logout-btn,
  .change-btn{
    width:auto;
    padding:0.6em 1.2em;
  }
}
`;

/* ================================
   管理画面 JS（sessionStorage対応）
================================ */
const ADMIN_JS = `
const WORKER_ENDPOINT = "framelab.narun091525-b98.workers.dev";

// ▼ タブ閉じでログアウト（/admin のときだけチェック）
document.addEventListener("DOMContentLoaded", () => {
  // 「?login」ページのときはチェックしない
  if (location.pathname === "/admin" && !location.search.includes("login")) {
    if (sessionStorage.getItem("loggedIn") !== "true") {
      // ここで管理画面を描画させずにログイン画面へ
      window.location.replace("/admin?login");
    }
  }
});

// ▼ ログアウト
document.getElementById("logoutLink")?.addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" });
  sessionStorage.removeItem("loggedIn");
  location.href = "/admin?login";
});

// ▼ パスワード変更
document.getElementById("changePwLink")?.addEventListener("click", () => {
  location.href = "/change";
});

/* ================================
   日本語入力禁止
================================ */
function disableJapaneseInput(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("compositionstart", e => {
    e.preventDefault();
  });

  el.addEventListener("input", () => {
    el.value = el.value.replace(/[^\x00-\x7F]/g, "");
  });
}

disableJapaneseInput("pw");
disableJapaneseInput("currentPw");
disableJapaneseInput("newPw");

/* ================================
   パスワード表示切り替え
================================ */
document.getElementById("showCurrentPw")?.addEventListener("change", e => {
  document.getElementById("currentPw").type = e.target.checked ? "text" : "password";
});

document.getElementById("showNewPw")?.addEventListener("change", e => {
  document.getElementById("newPw").type = e.target.checked ? "text" : "password";
});

/* ================================
   モード切り替え
================================ */
const addModeBtn = document.getElementById("addModeBtn");
const deleteModeBtn = document.getElementById("deleteModeBtn");
const addModeCard = document.getElementById("addModeCard");
const deleteModeCard = document.getElementById("deleteModeCard");
const modeSelect = document.getElementById("modeSelect");
const cardLinks = document.querySelector(".card-links");

function showCard(card) {
  card.style.display = "block";
  requestAnimationFrame(() => card.classList.add("show"));
}

function hideCard(card) {
  card.classList.remove("show");
  setTimeout(() => (card.style.display = "none"), 300);
}

addModeBtn?.addEventListener("click", () => {
  cardLinks.style.display = "none";
  hideCard(modeSelect);
  hideCard(deleteModeCard);
  showCard(addModeCard);
});

deleteModeBtn?.addEventListener("click", () => {
  cardLinks.style.display = "none";
  hideCard(modeSelect);
  hideCard(addModeCard);
  showCard(deleteModeCard);
  loadFrameList();
});

document.getElementById("backToSelectFromAdd")?.addEventListener("click", () => {
  cardLinks.style.display = "flex";
  hideCard(addModeCard);
  showCard(modeSelect);
});

document.getElementById("backToSelectFromDelete")?.addEventListener("click", () => {
  cardLinks.style.display = "flex";
  hideCard(deleteModeCard);
  showCard(modeSelect);
});

/* ================================
   Add Mode
================================ */
const uploadBtn = document.getElementById("uploadBtn");
const frameInput = document.getElementById("frameInput");
const frameNameInput = document.getElementById("frameName");
const resultBox = document.getElementById("result");
const previewBox = document.getElementById("previewBox");
const previewImage = document.getElementById("previewImage");

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

frameInput?.addEventListener("change", (e) => {
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

function randomFilename() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let name = "";
  for (let i = 0; i < 12; i++) name += chars[Math.floor(Math.random() * chars.length)];
  return name + ".png";
}

uploadBtn?.addEventListener("click", async () => {
  const file = frameInput.files[0];
  const frameName = frameNameInput.value.trim();

  if (!file) return (resultBox.textContent = "⚠ ファイルが選択されていません。");
  if (!frameName) return (resultBox.textContent = "⚠ フレーム名を入力してください。");

  uploadFrame(file, frameName);
});

async function uploadFrame(file, frameName) {
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = \`<span class="loading-spinner"></span>アップロード中…\`;

  try {
    const base64Data = await toBase64(file);
    const randomName = randomFilename();

    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: randomName,
        displayName: frameName,
        content: base64Data,
      })
    });
    
    const data = await response.json();

    if (data.success) {
      const rawUrl = data.data.url;
      const userUrl = "https://nrntool.github.io/icon-maker/";

      resultBox.innerHTML = \`
        <div class="success-box fade-in">
          <div class="success-icon">✓</div>
          <div class="success-text">
            アップロードが完了しました。<br>
            反映をご確認ください。
          </div>
        </div>

        <div class="success-links fade-in">
          <p>【GitHub 反映URL】</p>
          <a href="\${rawUrl}" target="_blank">\${rawUrl}</a>

          <p>【ユーザー画面】</p>
          <a href="\${userUrl}" target="_blank">\${userUrl}</a>

          <button id="checkReflectBtn" class="reflect-btn">反映チェック</button>
          <div id="reflectStatus"></div>
        </div>
      \`;
    } else {
      resultBox.innerHTML = \`❌ エラー：\${data.error?.message || "不明なエラー"}\`;
    }
  } catch {
    resultBox.textContent = "⚠ 通信エラーが発生しました。";
  }

  uploadBtn.disabled = false;
  uploadBtn.innerHTML = "アップロード";
}

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
      statusBox.innerHTML = \`✅ 反映されています。\`;
      statusBox.style.color = "#0a8a0a";
    } else {
      statusBox.innerHTML = \`⌛ まだ反映されていません（\${res.status}）\`;
      statusBox.style.color = "#b8860b";
    }
  } catch {
    statusBox.innerHTML = \`⚠ チェック中にエラーが発生しました\`;
    statusBox.style.color = "#c0392b";
  }
});

/* ================================
   Delete Mode
================================ */
async function loadFrameList() {
  const url = WORKER_ENDPOINT + "?mode=list&t=" + Date.now();
  const listBox = document.getElementById("frameList");

  listBox.innerHTML = "Loading…";

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

      div.innerHTML = \`
        <input type="checkbox" class="frame-checkbox" data-name="\${item.filename}">
        <img src="\${item.url}" class="frame-thumb">
        <div class="frame-name">\${item.displayName || item.filename}</div>
      \`;

      listBox.appendChild(div);
    });

  } catch {
    listBox.innerHTML = "⚠ フレーム一覧の取得に失敗しました。";
  }
}

document.getElementById("deleteSelectedBtn")?.addEventListener("click", async () => {
  const checked = [...document.querySelectorAll(".frame-checkbox:checked")];
  if (checked.length === 0) {
    alert("削除するフレームを選択してください。");
    return;
  }

  if (!confirm(\`\${checked.length} 件のフレームを削除しますか？\`)) return;

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
        alert(\`削除失敗: \${filename} (\${data.error.message})\`);
      }
    } catch {
      alert(\`通信エラー: \${filename}\`);
    }
  }

  alert("削除が完了しました。");
});

document.body.style.opacity = "0";
document.body.style.transition = "opacity 0.6s ease";
window.onload = () => { document.body.style.opacity = "1"; };

// ログイン成功時に呼び出す
function setLoggedIn() {
  sessionStorage.setItem("loggedIn", "true");
}
`;

/* ================================
   LOGIN_HTML
================================ */
const LOGIN_HTML =`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FrameLab 管理ログイン</title>

<style>
body{
  margin:0;
  padding:0;
  font-family:"Noto Sans JP","Segoe UI";
  background:radial-gradient(circle at top,#e8ecf5,#f4f6fb,#f2f3f8);
  text-align:center;
}
.logo{
  font-family:"Playfair Display";
  font-size:2em;
  font-weight:600;
  color:#4a5f85;
  margin-top:1.4em;
  margin-bottom:0.4em;
}
.card{
  width:90%;
  max-width:420px;
  margin:2em auto;
  padding:2.2em 1.8em;
  background:rgba(255,255,255,0.72);
  backdrop-filter:blur(16px);
  border-radius:18px;
  border:1px solid rgba(90,125,168,0.25);
  box-shadow:0 4px 14px rgba(90,125,168,0.15),0 18px 40px rgba(90,125,168,0.08);
  opacity:0;
  transform:translateY(10px);
  animation:fadeIn 0.6s ease-out forwards;
}
@keyframes fadeIn{
  0%{opacity:0;transform:translateY(10px);}
  100%{opacity:1;transform:translateY(0);}
}
.title{
  font-family:"Playfair Display";
  font-size:1.6em;
  font-weight:600;
  color:#4a5f85;
  margin-bottom:0.8em;
}
.sub{
  font-size:0.9em;
  color:#6b7a99;
  margin-bottom:1.8em;
}

.input{
  width:70%;
  padding:0.9em 1em;
  font-size:1em;
  border-radius:10px;
  border:1px solid rgba(90,125,168,0.25);
  background:rgba(255,255,255,0.75);
  box-shadow:0 2px 6px rgba(90,125,168,0.15);
  box-sizing:border-box;
  margin:0.6em auto;
}

.pw-wrap{
  display:block;
  position:relative;
}

.pw-toggle{
  display:block;
  margin-top:0.4em;
  font-size:0.9em;
  color:#4a5f85;
  user-select:none;
}
.pw-toggle input{
  margin-right:0.3em;
}

.btn{
  padding:0.9em;
  border-radius:12px;
  font-weight:600;
  background:linear-gradient(135deg,#6a8fc0,#7fa0d0);
  color:#fff;
  border:none;
  box-shadow:0 4px 10px rgba(90,125,168,0.15),inset 0 0 18px rgba(255,255,255,0.25);
  cursor:pointer;
  transition:0.25s ease;
  width:70%;
  margin:1em auto 0;
}
.btn:hover{
  transform:translateY(-2px);
  background:linear-gradient(135deg,#8fb2e0,#7698c8);
}

#msg{
  margin-top:1em;
  font-size:0.9em;
  color:#c0392b;
}

</style>
</head>

<body>

<div class="logo">FrameLab</div>

<div class="card">
  <div class="title">管理画面ログイン</div>
  <div class="sub">パスワードを入力してください</div>

  <div class="pw-wrap">
    <input
      id="pw"
      class="input"
      type="password"
      placeholder="パスワード"
      inputmode="latin"
      style="ime-mode: disabled;"
      autocomplete="current-password"
    >
    <label class="pw-toggle">
      <input type="checkbox" id="showPw"> パスワードを表示する
    </label>
  </div>

  <button class="btn" onclick="login()">ログイン</button>
  <div id="msg"></div>
</div>

<script>
function login(){
  const pw=document.getElementById("pw").value;
  const msg=document.getElementById("msg");

  if(!pw){
    msg.innerText="パスワードを入力してください";
    return;
  }

  document.cookie="fl_admin="+encodeURIComponent(pw)+";path=/";
  sessionStorage.setItem("loggedIn","true");
  location.href="/admin?pass="+encodeURIComponent(pw);
}

/* ▼ チェックボックス */
document.getElementById("showPw").addEventListener("change",e=>{
  document.getElementById("pw").type=e.target.checked?"text":"password";
});
</script>
<script src="/admin.js"></script>
</body>
</html>
`;

/* ================================
   CHANGE_HTML
================================ */
const CHANGE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FrameLab パスワード変更</title>
<style>

body{
  margin:0;
  padding:0;
  font-family:"Noto Sans JP","Segoe UI";
  background:radial-gradient(circle at top,#e8ecf5,#f4f6fb,#f2f3f8);
  text-align:center;
}
.logo{
  font-family:"Playfair Display";
  font-size:2em;
  font-weight:600;
  color:#4a5f85;
  margin-top:1.4em;
  margin-bottom:0.4em;
}
.card{
  width:90%;
  max-width:420px;
  margin:2em auto;
  padding:2.2em 1.8em;
  background:rgba(255,255,255,0.72);
  backdrop-filter:blur(16px);
  border-radius:18px;
  border:1px solid rgba(90,125,168,0.25);
  box-shadow:0 4px 14px rgba(90,125,168,0.15),0 18px 40px rgba(90,125,168,0.08);
  opacity:0;
  transform:translateY(10px);
  animation:fadeIn 0.6s ease-out forwards;
}
@keyframes fadeIn{
  0%{opacity:0;transform:translateY(10px);}
  100%{opacity:1;transform:translateY(0);}
}
.title{
  font-family:"Playfair Display";
  font-size:1.6em;
  font-weight:600;
  color:#4a5f85;
  margin-bottom:0.8em;
}
.sub{
  font-size:0.9em;
  color:#6b7a99;
  margin-bottom:1.8em;
}

.input, .btn{
  display:block;
  width:70%;
  margin:0.6em auto;
}
.input{
  padding:0.9em 1em;
  font-size:1em;
  border-radius:10px;
  border:1px solid rgba(90,125,168,0.25);
  background:rgba(255,255,255,0.75);
  box-shadow:0 2px 6px rgba(90,125,168,0.15);
  box-sizing:border-box;
}

.btn{
  padding:0.9em;
  border-radius:12px;
  font-weight:600;
  background:linear-gradient(135deg,#6a8fc0,#7fa0d0);
  color:#fff;
  border:none;
  box-shadow:0 4px 10px rgba(90,125,168,0.15),inset 0 0 18px rgba(255,255,255,0.25);
  cursor:pointer;
  transition:0.25s ease;
}
.btn:hover{
  transform:translateY(-2px);
  background:linear-gradient(135deg,#8fb2e0,#7698c8);
}

#msg{
  margin-top:1em;
  font-size:0.9em;
  color:#6b7a99;
}

.pw-wrap{
  display:block;
  position:relative;
}
.pw-toggle{
  display:block;
  margin-top:0.4em;
  font-size:0.9em;
  color:#4a5f85;
  user-select:none;
}
.pw-toggle input{
  margin-right:0.3em;
}

</style>
</head>

<body>
<div class="logo">FrameLab</div>

<div class="card">
  <div class="title">パスワード変更</div>
  <div class="sub">現在のパスワードと新しいパスワードを入力してください</div>

  <div class="pw-wrap">
    <input
      id="currentPw"
      class="input"
      type="password"
      placeholder="現在のパスワード"
      inputmode="latin"
      style="ime-mode: disabled;"
      autocomplete="current-password"
    >
    <label class="pw-toggle">
      <input type="checkbox" id="showCurrentPw"> パスワードを表示する
    </label>
  </div>

  <div class="pw-wrap">
    <input
      id="newPw"
      class="input"
      type="password"
      placeholder="新しいパスワード"
      inputmode="latin"
      style="ime-mode: disabled;"
      autocomplete="new-password"
    >
    <label class="pw-toggle">
      <input type="checkbox" id="showNewPw"> パスワードを表示する
    </label>
  </div>

  <button class="btn" onclick="changePw()">変更する</button>
  <button class="btn" onclick="backToAdmin()">管理画面に戻る</button>

  <div id="msg"></div>
</div>

<script>
async function changePw(){
  const currentPw=document.getElementById("currentPw").value;
  const newPw=document.getElementById("newPw").value;
  const msg=document.getElementById("msg");

  if(!currentPw || !newPw){
    msg.style.color="#c0392b";
    msg.innerText="現在のパスワードと新しいパスワードを入力してください";
    return;
  }

  msg.style.color="#6b7a99";
  msg.innerText="変更処理中…";

  try{
    const res=await fetch("/change-password",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({currentPassword:currentPw,newPassword:newPw})
    });

    const data=await res.json();
    if(data.success){
      msg.style.color="#0a8a0a";
      msg.innerText="パスワードを変更しました。再ログインしてください。";
      sessionStorage.removeItem("loggedIn");
    }else{
      msg.style.color="#c0392b";
      msg.innerText=data.error?.message || "変更に失敗しました";
    }
  }catch(e){
    msg.style.color="#c0392b";
    msg.innerText="通信エラーが発生しました";
  }
}

function backToAdmin(){
  location.href="/admin";
}

/* ▼ チェックボックス */
document.getElementById("showCurrentPw").addEventListener("change",e=>{
  document.getElementById("currentPw").type=e.target.checked?"text":"password";
});
document.getElementById("showNewPw").addEventListener("change",e=>{
  document.getElementById("newPw").type=e.target.checked?"text":"password";
});
</script>
<script src="/admin.js"></script>
</body>
</html>
`;

/* ================================
   CORS
================================ */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://nrntool.github.io",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}


/* ================================
   Base64 → UTF-8 デコード
================================ */
function decodeBase64Utf8(base64) {
  try {
    const decoder =
      typeof TextDecoder !== "undefined"
        ? new TextDecoder("utf-8")
        : new (require("util").TextDecoder)("utf-8");

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return decoder.decode(bytes);
  } catch (err) {
    console.error("Base64 decode error:", err);
    return "";
  }
}

/* ================================
   GitHub API リトライ付き fetch
================================ */
async function githubFetch(url, options, retry = 2) {
  let lastError;
  for (let i = 0; i <= retry; i++) {
    const res = await fetch(url, options);
    if (res.status >= 500) {
      lastError = res;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }
    return res;
  }
  return lastError;
}

/* ================================
   GET：フレーム一覧取得
================================ */
async function handleList(repo, branch, token) {
  const apiUrl = `https://api.github.com/repos/${repo}/contents/frames?ref=${branch}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "FrameLab-Uploader",
      },
    });

    const data = await res.json();
    if (!Array.isArray(data)) {
      return jsonError("一覧取得に失敗しました", 500);
    }

    // ▼ displayName.json を探す
    const metaFile = data.find((f) => f.name === "displayName.json");
    let meta = {};

    if (metaFile) {
      const metaApiRes = await fetch(
        `https://api.github.com/repos/${repo}/contents/frames/displayName.json?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "FrameLab-Uploader",
          },
        }
      );

      if (metaApiRes.ok) {
        const metaApiData = await metaApiRes.json();
        const decoded = decodeBase64Utf8(metaApiData.content);
        meta = JSON.parse(decoded);
      }
    }

    const frames = data
      .filter((item) => item.name.endsWith(".png"))
      .map((item) => ({
        filename: item.name,
        displayName: meta[item.name] || item.name.replace(".png", ""),
        url: `https://raw.githubusercontent.com/${repo}/${branch}/frames/${item.name}`,
      }));
    return jsonSuccess({ frames });
  } catch (err) {
    console.error(err);
    return jsonError("サーバーエラー（LIST）", 500);
  }
}

/* ================================
   POST：アップロード
================================ */
async function handleUpload(request, token, repo, branch) {
  try {
    const { filename, displayName, content } = await request.json();
    const base64 = content.split(",")[1] || content;
    const path = `frames/${filename}`;

    const uploadRes = await githubFetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "FrameLab-Uploader",
        },
        body: JSON.stringify({
          message: `Add frame: ${filename}`,
          content: base64,
          branch,
        }),
      }
    );

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      return jsonError(uploadData.message || "PNG アップロードに失敗しました", 500);
    }

    const metaUrl = `https://api.github.com/repos/${repo}/contents/frames/displayName.json?ref=${branch}`;
    let meta = {};
    let metaSha = null;

    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "FrameLab-Uploader",
      },
    });

    if (metaRes.ok) {
      const metaData = await metaRes.json();
      metaSha = metaData.sha;
      const decoded = decodeBase64Utf8(metaData.content);
      meta = JSON.parse(decoded);
    }

    meta[filename] = displayName;

    const metaContent = JSON.stringify(meta, null, 2);
    const encodedMeta = btoa(unescape(encodeURIComponent(metaContent)));

    const bodyData = {
      message: metaSha
        ? `Update displayName: ${filename}`
        : "Create displayName.json",
      content: encodedMeta,
      branch,
    };

    if (metaSha) bodyData.sha = metaSha;

    const metaPutRes = await githubFetch(
      `https://api.github.com/repos/${repo}/contents/frames/displayName.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "FrameLab-Uploader",
        },
        body: JSON.stringify(bodyData),
      }
    );

    if (!metaPutRes.ok) {
      const errData = await metaPutRes.json();
      return jsonError(errData.message || "displayName.json 更新に失敗しました", 500);
    }

    const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/frames/${filename}`;
    return jsonSuccess({ url: rawUrl, status: "ok" });

  } catch (err) {
    console.error(err);
    return jsonError("サーバーエラー（POST）", 500);
  }
}

/* ================================
   DELETE：削除
================================ */
async function handleDelete(request, token, repo, branch) {
  try {
    const { filename } = await request.json();
    const path = `frames/${filename}`;

    const metaUrl = `https://api.github.com/repos/${repo}/contents/frames/displayName.json?ref=${branch}`;
    let meta = {};
    let metaSha = null;

    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "FrameLab-Uploader",
      },
    });

    if (metaRes.ok) {
      const metaData = await metaRes.json();
      metaSha = metaData.sha;
      const decoded = decodeBase64Utf8(metaData.content);
      meta = JSON.parse(decoded);
    }

    delete meta[filename];

    const metaContent = JSON.stringify(meta, null, 2);
    const encodedMeta = btoa(unescape(encodeURIComponent(metaContent)));

    const bodyData = {
      message: `Delete displayName: ${filename}`,
      content: encodedMeta,
      branch,
    };

    if (metaSha) bodyData.sha = metaSha;

    await githubFetch(
      `https://api.github.com/repos/${repo}/contents/frames/displayName.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "FrameLab-Uploader",
        },
        body: JSON.stringify(bodyData),
      }
    );

    const getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "FrameLab-Uploader",
        },
      }
    );

    if (getRes.status === 404) {
      return jsonError("ファイルが存在しません", 404);
    }

    const fileData = await getRes.json();
    const sha = fileData.sha;

    const delRes = await githubFetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "FrameLab-Uploader",
        },
        body: JSON.stringify({
          message: `Delete frame: ${filename}`,
          sha,
          branch,
        }),
      }
    );

    if (!delRes.ok) {
      const delData = await delRes.json();
      return jsonError(delData.message || "削除に失敗しました", 500);
    }

    return jsonSuccess({ message: "削除完了" });
  } catch (err) {
    console.error(err);
    return jsonError("サーバーエラー（DELETE）", 500);
  }
}

/* ================================
   共通レスポンス
================================ */
function jsonSuccess(data) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { message } }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}
