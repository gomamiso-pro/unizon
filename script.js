// Google Apps Script のURL
const API_URL = "https://script.google.com/macros/s/AKfycbzOLanX8jppDuHpXkfjmuKOu2WbNKscyTGkMYFLI7_jbJaHAUx_lwipmxO339QJ6KSX/exec";

// ログイン状態を管理する変数
let isLoggedIn = false;

// loggerオブジェクトの定義は削除

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
    // logger.log("GASからの応答:", text); // 削除

    let data = {};
    try { data = JSON.parse(text); } 
    catch { 
      messageElement.textContent = "サーバーから不正な応答がありました。"; 
      return; 
    }

    if (data.status === "success") {
      messageElement.textContent = "ログイン成功！";
      // hamburgerとmenuRegisterが存在することを確認してから表示
      const hamburger = document.getElementById("hamburger");
      const menuRegister = document.getElementById("menuRegister");
      if (hamburger) hamburger.style.display = "block";
      if (menuRegister) menuRegister.style.display = "block";
      navigate("home");
      localStorage.setItem("loggedIn", "true");
      e.target.reset();
    } else {
      messageElement.textContent = data.message || "ログインIDまたはパスワードが違います。";
    }

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    // logger.error("fetchエラー:", err); // 削除
  }
});

// --------------------
// メンバー一覧取得
// --------------------
async function loadMembers() {
  try {
    const res = await fetch(API_URL);
    const members = await res.json();
    // logger.log("取得したメンバー一覧:", members); // 削除

    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = "";

    // 以前の解析で有効だった相対パスに戻します
    const DEFAULT_IMAGE_URL = 'images/member/00.png';

    if (Array.isArray(members)) {
      // ソート
      members.sort((a, b) => (parseInt(a.orderNo, 10) || 0) - (parseInt(b.orderNo, 10) || 0));

      members.forEach((m, i) => {
        // GASから取得したURL（m.image）をそのまま使用するか、デフォルト画像を使用
        const memberImageUrl = m.image || DEFAULT_IMAGE_URL;

        // コンソール出力も残しておくと便利です
        // logger.log(`メンバー: ${m.nickname || m.number} | memberImageUrlの値:`, memberImageUrl); // 削除
        
        // ★★★ Drive画像インジケーター表示ロジック 修正済み ★★★
        const isDriveLink = memberImageUrl.includes('uc?id=') || memberImageUrl.includes('drive.google.com');

        let driveImageIndicator = '';
        if (isDriveLink) {
            // Driveリンクの場合、URLを小さな画像としても表示 (未定義変数'member'を'm'に修正し、memberImageUrlを使用)
            driveImageIndicator = `
                <div style="border: 2px solid #2ecc71; border-radius: 4px; overflow: hidden; width: 20px; height: 20px; margin-left: 5px; flex-shrink: 0;" title="Google Drive Link">
                    <img src="${memberImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" 
                         onerror="this.onerror=null;this.src='${DEFAULT_IMAGE_URL}';">
                </div>
            `;
        }
        
        // テキストインジケーターは残します
        const driveTextIndicator = isDriveLink 
            ? '<span style="color:#2ecc71; font-weight: bold;">✅ Drive URL</span>'
            : '<span style="color:#e74c3c;">❌ Default Path</span>';
        // ★★★ Drive画像インジケーター表示ロジック 終了 ★★★

        const tr = document.createElement("tr");
        tr.dataset.memberData = JSON.stringify(m);

        // ダブルクリック・ダブルタップで編集
        tr.addEventListener('dblclick', () => navigateToEdit(m));
        tr.addEventListener('touchend', (event) => {
          const now = new Date().getTime();
          const lastTouch = tr.dataset.lastTouch || 0;
          const delta = now - lastTouch;
          // ダブルタップ判定（300ms以内）
          if (delta < 300 && delta > 0) {
            event.preventDefault();
            navigateToEdit(m);
          }
          tr.dataset.lastTouch = now;
        });

        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>
            <div style="display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">
                <img src="${memberImageUrl}" class="member-img" alt="${m.nickname || '画像'}"
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%;"
                     onerror="this.onerror=null;this.src='${DEFAULT_IMAGE_URL}';">
                
                ${driveImageIndicator}
            </div>
            
            <p style="text-align:center;margin:0;">${m.nickname || ''}</p>
            
            <small style="display:block; text-align:center; font-size: 0.7em; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;" title="${memberImageUrl}">
                ${driveTextIndicator}
            </small>
            </td>
          <td>${m.number || ''}</td>
          <td>${m.position || ''}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="4">メンバーデータの取得に失敗しました: ${members.message || 'データ形式エラー'}</td></tr>`;
      // logger.error("メンバー取得エラー（GAS側）:", members.message); // 削除
    }

  } catch (err) {
    // logger.error("メンバー取得通信エラー:", err); // 削除
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
  const file = fileInput ? fileInput.files[0] : null;

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
    // JPEGは拡張子をjpgに統一（GAS側と合わせる）
    if (ext.toLowerCase() === '.jpeg') ext = '.jpg';
    fileName = `${number}${ext}`;
    fileType = file.type;

    const reader = new FileReader();
    reader.onloadend = async function() {
      // Data URLのヘッダ部分（"data:image/png;base64,"など）を除去
      base64Data = reader.result.split(',')[1]; 
      await sendRegistration(number, nickname, position, base64Data, fileName, fileType, messageElement, form);
    };
    reader.readAsDataURL(file);
  } else {
    // ファイルがない場合も、既存データの編集や、画像なしの新規登録として送信
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
    try { 
      result = JSON.parse(text); 
    } 
    catch { 
      // JSONパース失敗時、responseTextが空でないか確認
      if (text.includes("success")) {
          messageElement.textContent = "処理成功！";
      } else {
          messageElement.textContent = "サーバーから不正な応答がありました。"; 
      }
      form.reset();
      // 登録・編集後はメンバーリストを再読み込み
      loadMembers(); 
      return; 
    }

    messageElement.textContent = result.status === "success" 
        ? (result.message || "登録/編集が完了しました！") 
        : (result.message || "処理に失敗しました。");
    form.reset();
    // 登録・編集後はメンバーリストを再読み込み
    loadMembers();

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    // logger.error("fetchエラー:", err); // 削除
  }
}

// --------------------
// ページ遷移
// --------------------
function navigate(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const targetPage = document.getElementById(page);
  if (targetPage) targetPage.classList.add("active");

  if (page === 'members') loadMembers();

  if (page === 'register') {
    const editData = localStorage.getItem('editMemberData');
    const header = document.getElementById('registerHeader');
    const numberInput = document.getElementById('numberInput');
    const registerForm = document.getElementById('registerForm');

    if (editData && registerForm && numberInput) {
      const member = JSON.parse(editData);
      numberInput.value = member.number || '';
      registerForm.nickname.value = member.nickname || '';
      registerForm.position.value = member.position || '';
      if (header) header.textContent = 'メンバー編集';
      // 編集時は背番号（キー）の変更を不可にする
      numberInput.disabled = true;
      localStorage.removeItem('editMemberData');
    } else if (registerForm && numberInput) {
      registerForm.reset();
      if (header) header.textContent = 'メンバー登録';
      // 新規登録時は背番号の変更を可能にする
      numberInput.disabled = false;
    }
  }

  closeMenu();
}

// --------------------
// メニュー操作
// --------------------
function toggleMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");
  if (sideMenu) sideMenu.classList.toggle("open");
  if (overlay) overlay.classList.toggle("open");
}
function closeMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");
  if (sideMenu) sideMenu.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
}

// --------------------
// ログアウト
// --------------------
function logout() {
  navigate("login");
  const hamburger = document.getElementById("hamburger");
  const menuRegister = document.getElementById("menuRegister");
  if (hamburger) hamburger.style.display = "none";
  if (menuRegister) menuRegister.style.display = "none";
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("role"); // roleもあればクリア
}

// --------------------
// ページロード時ログイン確認
// --------------------
window.addEventListener("load", () => {
  const loginPage = document.getElementById("login");
  const homePage = document.getElementById("home");
  const hamburger = document.getElementById("hamburger");
  const menuRegister = document.getElementById("menuRegister");

  if (localStorage.getItem("loggedIn") === "true") {
    if (loginPage) loginPage.classList.remove("active");
    if (homePage) homePage.classList.add("active");
    if (hamburger) hamburger.style.display = "block";
    if (menuRegister) menuRegister.style.display = "block";
  }
});

// DOMContentLoaded後にイベントリスナーをセット
document.addEventListener('DOMContentLoaded', () => {
    // このブロックは、元のコードには含まれていましたが、特に追加の処理は定義されていません。
});
