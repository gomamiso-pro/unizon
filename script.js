// =============================
// UNIZON Softball Team - main.js
// =============================

// -----------------------------
// DOM Elements
// -----------------------------
const hamburger = document.getElementById("hamburger");
const sideMenu = document.getElementById("sideMenu");
const overlay = document.getElementById("overlay");
const menuItems = document.querySelectorAll("#sideMenu .menu-item");
const pages = document.querySelectorAll(".page");
const membersTableBody = document.querySelector("#members tbody");

// -----------------------------
// サイドメニュー開閉
// -----------------------------
hamburger.addEventListener("click", () => {
  sideMenu.classList.toggle("open");
  overlay.classList.toggle("open");
});

overlay.addEventListener("click", () => {
  sideMenu.classList.remove("open");
  overlay.classList.remove("open");
});

// メニュークリックでページ切替
menuItems.forEach(item => {
  item.addEventListener("click", () => {
    const target = item.dataset.target;
    pages.forEach(p => p.classList.remove("active"));
    const page = document.getElementById(target);
    if (page) page.classList.add("active");

    sideMenu.classList.remove("open");
    overlay.classList.remove("open");

    if (target === "members") loadMembers();
  });
});

// -----------------------------
// メンバー一覧取得
// -----------------------------
function loadMembers() {
  fetch("YOUR_GAS_WEBAPP_URL") // ← ここを GAS WebApp URL に置き換え
    .then(res => res.json())
    .then(data => {
      membersTableBody.innerHTML = ""; // 既存行をクリア

      data.forEach(m => {
        // 画像 URL の取得と変換（Drive共有リンク対応）
        let memberImageUrl = m.image?.trim() || "images/default.png"; // デフォルト画像
        if (memberImageUrl.includes("drive.google.com/file/d/")) {
          const fileIdMatch = memberImageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (fileIdMatch) {
            memberImageUrl = `https://drive.google.com/uc?id=${fileIdMatch[1]}`;
          }
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${m.orderNo || ""}</td>
          <td>
            <img src="${memberImageUrl}" class="member-img" alt="${m.nickname || ''}">
            <div>${m.nickname || ""}</div>
          </td>
          <td>${m.number || ""}</td>
          <td>${m.position || ""}</td>
        `;
        membersTableBody.appendChild(tr);
      });
    })
    .catch(err => console.error("メンバー取得エラー:", err));
}

// -----------------------------
// ログイン処理
// -----------------------------
const loginForm = document.querySelector("#login form");
if (loginForm) {
  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    const nickname = loginForm.querySelector("input[name='nickname']").value.trim();
    const number = loginForm.querySelector("input[name='number']").value.trim();

    if (!nickname || !number) {
      showError("IDと背番号を入力してください");
      return;
    }

    fetch("YOUR_GAS_WEBAPP_URL?action=login&nickname=" + encodeURIComponent(nickname) + "&number=" + encodeURIComponent(number), {
      method: "POST"
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          // ログイン成功
          pages.forEach(p => p.classList.remove("active"));
          document.getElementById("members").classList.add("active");
          loadMembers();
        } else {
          showError(res.message);
        }
      })
      .catch(err => console.error("ログインエラー:", err));
  });
}

function showError(msg) {
  const el = document.querySelector(".error-message");
  if (el) el.textContent = msg;
}

// -----------------------------
// 初期表示
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // 初期ページをログインにする場合
  if (document.getElementById("login")) {
    pages.forEach(p => p.classList.remove("active"));
    document.getElementById("login").classList.add("active");
  }
});
