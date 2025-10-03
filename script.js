// Google Apps Script のURL
const API_URL = "https://script.google.com/macros/s/AKfycbwaChrXugws6UgEoxfcwiJCVaj_G7EKN8OG-e7Nsm0cKqs6QIf-jJbTqK5maz4jz57h/exec";

// ログイン状態を管理する変数
let isLoggedIn = false;

// --------------------
// ログイン処理
// --------------------
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const nickname = e.target.login_nickname.value;
  const number = e.target.login_number.value;
  const messageElement = document.getElementById("loginMessage");

  const formData = new FormData();
  formData.append("action", "login"); 
  formData.append("nickname", nickname);
  formData.append("number", number);

  messageElement.textContent = "認証中...";

  try {
    const res = await fetch(API_URL, { method: "POST", body: formData });
    const text = await res.text();
    console.log("GASからの応答:", text);

    let data = {};
    try { data = JSON.parse(text); } 
    catch { 
      messageElement.textContent = "サーバーから不正な応答がありました。"; 
      return; 
    }

    if (data.status === "success") {
      messageElement.textContent = "ログイン成功！";
      document.getElementById("hamburger").style.display = "block";
      document.getElementById("menuRegister").style.display = "block";
      navigate("home");
      localStorage.setItem("loggedIn", "true");
      e.target.reset();
    } else {
      messageElement.textContent = data.message || "ログインIDまたはパスワードが違います。";
    }

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    console.error("fetchエラー:", err);
  }
});

// --------------------
// メンバー一覧取得
// --------------------
async function loadMembers() {
  try {
    const res = await fetch(API_URL);
    const members = await res.json();
    console.log("取得したメンバー一覧:", members);

    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = "";

    const DEFAULT_IMAGE_URL = 'images/member/00.png';

    if (Array.isArray(members)) {
      // ソート
      members.sort((a, b) => (parseInt(a.orderNo, 10) || 0) - (parseInt(b.orderNo, 10) || 0));

      members.forEach((m, i) => {
        // let に変更して再代入可能に
        let memberImageUrl = m.image || DEFAULT_IMAGE_URL;

        // Google Drive のリンクを直接表示用に変換
        if (memberImageUrl.includes("drive.google.com/file/d/")) {
          const fileIdMatch = memberImageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (fileIdMatch) memberImageUrl = `https://drive.google.com/uc?id=${fileIdMatch[1]}`;
        }

        const tr = document.createElement("tr");
        tr.dataset.memberData = JSON.stringify(m);

        // ダブルクリック・ダブルタップで編集
        tr.addEventListener('dblclick', () => navigateToEdit(m));
        tr.addEventListener('touchend', (event) => {
          const now = new Date().getTime();
          const lastTouch = tr.dataset.lastTouch || 0;
          const delta = now - lastTouch;
          if (delta < 300 && delta > 0) {
            event.preventDefault();
            navigateToEdit(m);
          }
          tr.dataset.lastTouch = now;
        });

        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>
            <img src="${memberImageUrl}" class="member-img" alt="${m.nickname || '画像'}"
                 style="display:block;margin:0 auto 5px;"
                 onerror="this.onerror=null;this.src='${DEFAULT_IMAGE_URL}';">
            <p style="text-align:center;margin:0;">${m.nickname || ''}</p>
          </td>
          <td>${m.number || ''}</td>
          <td>${m.position || ''}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="4">メンバーデータの取得に失敗しました: ${members.message || 'データ形式エラー'}</td></tr>`;
      console.error("メンバー取得エラー（GAS側）:", members.message);
    }

  } catch (err) {
    console.error("メンバー取得通信エラー:", err);
    document.getElementById("memberTable").innerHTML = `<tr><td colspan="4">ネットワーク通信エラーが発生しました。</td></tr>`;
  }
}

// --------------------
// メンバー編集用ナビゲート
// --------------------
function navigateToEdit(memberData) {
  localStorage.setItem('editMemberData', JSON.stringify(memberData));
  navigate('register');
}

// --------------------
// メンバー登録/編集
// --------------------
document.getElementById("registerForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const form = e.target;
  const messageElement = document.getElementById("registerMessage");
  messageElement.textContent = "処理中...";

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  const number = form.number.value;
  const nickname = form.nickname.value;
  const position = form.position.value;

  if (!number || !nickname) {
    messageElement.textContent = "エラー: 背番号とニックネームは必須です。";
    return;
  }

  let base64Data = "", fileName = "", fileType = "";

  if (file) {
    const originalName = file.name;
    let ext = originalName.slice(originalName.lastIndexOf('.'));
    if (ext.toLowerCase() === '.jpeg') ext = '.jpg';
    fileName = `${number}${ext}`;
    fileType = file.type;

    const reader = new FileReader();
    reader.onloadend = async function() {
      base64Data = reader.result.split(',')[1];
      await sendRegistration(number, nickname, position, base64Data, fileName, fileType, messageElement, form);
    };
    reader.readAsDataURL(file);
  } else {
    await sendRegistration(number, nickname, position, base64Data, fileName, fileType, messageElement, form);
  }
});

// --------------------
// 登録/編集送信
// --------------------
async function sendRegistration(number, nickname, position, base64Data, fileName, fileType, messageElement, form) {
  const formData = new FormData();
  formData.append("action", "register");
  formData.append("number", number);
  formData.append("nickname", nickname);
  formData.append("position", position);
  formData.append("fileData", base64Data);
  formData.append("fileName", fileName);
  formData.append("fileType", fileType);

  try {
    const res = await fetch(API_URL, { method: "POST", body: formData });
    const text = await res.text();

    let result = {};
    try { result = JSON.parse(text); } 
    catch { 
      messageElement.textContent = text.includes("success") ? "処理成功！" : "サーバーから不正な応答がありました。"; 
      form.reset();
      return; 
    }

    messageElement.textContent = result.status === "success" ? (result.message || "登録/編集が完了しました！") : (result.message || "処理に失敗しました。");
    form.reset();

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    console.error("fetchエラー:", err);
  }
}

// --------------------
// ページ遷移
// --------------------
function navigate(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(page).classList.add("active");

  if (page === 'members') loadMembers();

  if (page === 'register') {
    const editData = localStorage.getItem('editMemberData');
    const header = document.getElementById('registerHeader');

    if (editData) {
      const member = JSON.parse(editData);
      document.getElementById('numberInput').value = member.number || '';
      document.getElementById('registerForm').nickname.value = member.nickname || '';
      document.getElementById('registerForm').position.value = member.position || '';
      if (header) header.textContent = 'メンバー編集';
      document.getElementById('numberInput').disabled = true;
      localStorage.removeItem('editMemberData');
    } else {
      document.getElementById('registerForm').reset();
      if (header) header.textContent = 'メンバー登録';
      document.getElementById('numberInput').disabled = false;
    }
  }

  closeMenu();
}

// --------------------
// メニュー操作
// --------------------
function toggleMenu() {
  document.getElementById("sideMenu").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("open");
}
function closeMenu() {
  document.getElementById("sideMenu").classList.remove("open");
  document.getElementById("overlay").classList.remove("open");
}

// --------------------
// ログアウト
// --------------------
function logout() {
  navigate("login");
  document.getElementById("hamburger").style.display = "none";
  document.getElementById("menuRegister").style.display = "none";
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("role");
}

// --------------------
// ページロード時ログイン確認
// --------------------
window.addEventListener("load", () => {
  if (localStorage.getItem("loggedIn") === "true") {
    document.getElementById("login").classList.remove("active");
    document.getElementById("home").classList.add("active");
    document.getElementById("hamburger").style.display = "block";
    document.getElementById("menuRegister").style.display = "block";
  }
});
