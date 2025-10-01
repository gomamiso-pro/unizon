// ★ Google Apps Script のURLをHTMLからこちらに移動することを推奨
// const API_URL = "https://script.google.com/macros/s/AKfycbz4DdRaX8u7PYwQxMnHYc7VYd8YHTWdd3D2hLGuaZ_B2osJ5WA0dulRISg9R17C3k5U/exec";

// ログイン状態を管理するための変数
let isLoggedIn = false;

// ログイン処理（ニックネームと背番号で認証）
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  // API_URLが未定義の場合、ここでエラーになる可能性があります。HTMLから移動してください。
  const api_url = typeof API_URL !== 'undefined' ? API_URL : 'URL_NOT_DEFINED'; 
  
  const nickname = e.target.login_nickname.value;
  const number = e.target.login_number.value;
  const messageElement = document.getElementById("loginMessage");

  const formData = new FormData();
  formData.append("action", "login"); 
  formData.append("nickname", nickname);
  formData.append("number", number);
  
  messageElement.textContent = "認証中...";

  try {
    const res = await fetch(api_url, {
      method: "POST",
      body: formData
    });

    const text = await res.text();
    console.log("GASからの応答:", text);

    let data = {};
    try { data = JSON.parse(text); } 
    catch { 
      messageElement.textContent = `サーバーから不正な応答がありました。`; 
      return; 
    }

    if (data.status === "success") {
      messageElement.textContent = "ログイン成功！";
      e.target.reset();
      
      document.getElementById("login").classList.remove("active");
      document.getElementById("home").classList.add("active");
      document.getElementById("hamburger").style.display = "block";
      
    } else {
      messageElement.textContent = data.message || "ログインIDまたはパスワードが違います。";
    }

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    console.error("fetchエラー:", err);
  }
});

// メンバー一覧取得
async function loadMembers(){
  const api_url = typeof API_URL !== 'undefined' ? API_URL : 'URL_NOT_DEFINED'; 
  
  try{
    // GASからメンバーデータを取得
    const res = await fetch(api_url);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = ""; 

    // デフォルト画像のパスを定数として定義
    const DEFAULT_IMAGE_PATH = 'images/member/00.png';

    if (Array.isArray(members)) {
      members.forEach(m=>{
        const memberNumber = m.number || '00'; 
        const imagePathJPG = `images/member/${memberNumber}.jpg`; 
        const imagePathPNG = `images/member/${memberNumber}.png`; 
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.number || ''}</td>
          <td>${m.nickname || ''}</td>
          <td>${m.position || ''}</td>
          <td>
            <img src="${imagePathJPG}" 
                 class="member-img" 
                 alt="${m.nickname || '画像'}"
                 onerror="this.onerror=function(){this.onerror=null; this.src='${DEFAULT_IMAGE_PATH}'}; this.src='${imagePathPNG}';" 
            >
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      console.error("メンバー取得エラー（GAS側）:", members.message);
      tbody.innerHTML = `<tr><td colspan="4">メンバーデータの取得に失敗しました: ${members.message || 'データ形式エラー'}</td></tr>`;
    }
  } catch(err){
    console.error("メンバー取得通信エラー:", err);
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = `<tr><td colspan="4">ネットワーク通信エラーが発生しました。</td></tr>`;
  }
}

// ページ切り替え
function navigate(page){
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(page).classList.add("active");
    if (page === 'members') {
        loadMembers();
    }
    closeMenu();
}

// ハンバーガーメニュー操作
function toggleMenu(){
  document.getElementById("sideMenu").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
}
function closeMenu(){
  document.getElementById("sideMenu").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

// ログアウト
function logout(){
  navigate("login");
  document.getElementById("hamburger").style.display = "none";
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("role");
}

// ページロード時にログイン状態確認
window.addEventListener("load", () => {
  if(localStorage.getItem("loggedIn") === "true"){
    document.getElementById("login").classList.remove("active");
    document.getElementById("home").classList.add("active");
    document.getElementById("hamburger").style.display = "block";
    document.getElementById("menuRegister").style.display = "none";
  }
});
