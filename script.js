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
  const hamburger = document.getElementById('hamburger');
  
  // ハンバーガーメニューとメニュー項目全体の表示/非表示を切り替え
  hamburger.style.display = loggedIn ? 'block' : 'none';
  membersBtn.style.display = loggedIn ? 'block' : 'none';
  logoutBtn.style.display = loggedIn ? 'block' : 'none';
  homeBtn.style.display = loggedIn ? 'block' : 'none';
  
  // 登録ボタンは開発用として常に非表示（必要なら'block'に変更）
  // document.getElementById('menuRegister').style.display = loggedIn ? 'block' : 'none';
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
      messageElement.innerText = "ログイン成功！";
      e.target.reset();
      
      isLoggedIn = true; 
      updateMenuVisibility(true); 
      navigate('home');   
      loadMembers();    
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

// メンバー一覧取得
async function loadMembers(){
  try{
    const res = await fetch(API_URL);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = "";

    // データが配列か確認
    if (Array.isArray(members)) {
      members.forEach(m=>{
        // 画像パスは/images/{nickname}.jpgと仮定
        const imagePath = `/images/${m.nickname}.jpg`; 
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.number || ''}</td>
          <td>${m.nickname || ''}</td>
          <td>${m.position || ''}</td>
          <td><img src="${imagePath}" class="member-img" alt="${m.nickname || '画像'}"></td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      // エラーオブジェクトが返された場合
      console.error("メンバー取得エラー（GAS側）:", members.message);
      tbody.innerHTML = `<tr><td colspan="4">メンバーデータの取得に失敗しました: ${members.message || 'データ形式エラー'}</td></tr>`;
    }
  } catch(err){
    console.error("メンバー取得通信エラー:", err);
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = `<tr><td colspan="4">ネットワーク通信エラーが発生しました。</td></tr>`;
  }
}


// 登録フォーム送信
document.getElementById("registerForm").addEventListener("submit", async e=>{
  e.preventDefault();
  
  const number = e.target.number.value;
  const nickname = e.target.nickname.value;
  const position = e.target.position.value;
  const file = document.getElementById("fileInput").files[0];

  if (!file) {
    alert("画像ファイルを選択してください。");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async function(){
    const base64Data = reader.result.split(",")[1];
    const formData = new FormData();
    formData.append("action", "register"); 
    formData.append("number", number);
    formData.append("nickname", nickname);
    formData.append("position", position);
    formData.append("fileData", base64Data);
    formData.append("fileName", file.name);
    formData.append("fileType", file.type); 

    try{
      const res = await fetch(API_URL, {method:"POST", body:formData});
      const text = await res.text();
      alert(text);
      e.target.reset();
      showPage('members');
      loadMembers();
    } catch(err){
      alert("登録エラー: "+err);
    }
  };
  reader.readAsDataURL(file);
});

// 初回起動時
document.addEventListener("DOMContentLoaded", () => {
  updateMenuVisibility(false); // 初期はログアウト状態
  showPage('login'); // ログイン画面を表示
});
