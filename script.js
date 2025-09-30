// ログイン状態を管理するための変数
let isLoggedIn = false;

// ページ切り替え関数
function showPage(id){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // ログイン画面に戻る際はメッセージをクリア
  if(id === 'login') {
    document.getElementById("loginMessage").innerText = "";
  }
}

// ナビゲーションメニューからの遷移 (メニューを閉じてからページ移動)
function navigate(id) {
  closeMenu();
  showPage(id);
}

// ハンバーガーメニューの開閉
function toggleMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");
  sideMenu.classList.toggle('open');
  overlay.classList.toggle('visible');
}

// メニューを閉じる
function closeMenu() {
  document.getElementById("sideMenu").classList.remove('open');
  document.getElementById("overlay").classList.remove('visible');
}

// ログイン状態に応じてメニュー項目を制御する関数
function updateMenuVisibility(loggedIn) {
  const membersBtn = document.getElementById('menuMembers');
  const logoutBtn = document.getElementById('menuLogout');
  const homeBtn = document.getElementById('menuHome');
  const loginPage = document.getElementById('login');

  if (loggedIn) {
    membersBtn.style.display = 'block';
    logoutBtn.style.display = 'block';
    homeBtn.style.display = 'block';
    document.getElementById('hamburger').style.display = 'block';
    loginPage.style.display = 'none';
  } else {
    membersBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
    homeBtn.style.display = 'none';
    document.getElementById('hamburger').style.display = 'none';
    loginPage.style.display = 'block';
  }
}

// 💡 ログイン処理
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const nickname = e.target.login_nickname.value;
  const number = e.target.login_number.value;
  const messageElement = document.getElementById("loginMessage");
  messageElement.innerText = "認証中...";

  try {
    const formData = new FormData();
    formData.append("action", "login"); 
    formData.append("nickname", nickname);
    formData.append("number", number);

    const res = await fetch(API_URL, { method: "POST", body: formData });
    const result = await res.json();

    if (result.status === "success") {
      messageElement.innerText = "ログイン成功！ HOME画面へ移動します。";
      e.target.reset();
      
      isLoggedIn = true; // 状態を更新
      updateMenuVisibility(true); // メニュー表示を更新
      navigate('home');   // HOME画面へ遷移
      loadMembers();    // メンバー一覧データを取得
    } else {
      messageElement.innerText = "ログインIDまたはパスワードが間違っています。";
    }
  } catch (err) {
    console.error("ログインエラー:", err);
    messageElement.innerText = "通信エラーが発生しました。";
  }
});

// 💡 ログアウト処理
function logout() {
  isLoggedIn = false;
  updateMenuVisibility(false);
  closeMenu();
  showPage('login'); // ログイン画面に戻る
  alert("ログアウトしました。");
}

// メンバー一覧取得 (以前のロジックを維持)
async function loadMembers(){
  try{
    const res = await fetch(API_URL);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = "";
    members.forEach(m=>{
      // ファイル名はニックネーム + ".jpg" と仮定
      const imagePath = `/images/${m.nickname}.jpg`; 
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.number}</td>
        <td>${m.nickname}</td>
        <td>${m.position}</td>
        <td><img src="${imagePath}" class="member-img" alt="${m.nickname}"></td>
      `;
      tbody.appendChild(tr);
    });
  } catch(err){
    console.error("メンバー取得エラー:", err);
  }
}


// 登録フォーム送信 (以前のロジックを維持)
document.getElementById("registerForm").addEventListener("submit", async e=>{
  e.preventDefault();
  // ... (登録処理ロジックは省略 - 前の回答を参照) ...
  alert("登録機能のロジックは前の回答を参照し、Apps Script側で実装してください。");
});

// 初回起動時
document.addEventListener("DOMContentLoaded", () => {
  updateMenuVisibility(false); // 初期はログアウト状態 (ログイン画面のみ表示)
  showPage('login');
});
