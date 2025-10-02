// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbz4DdRaX8u7PYwQxMnHYc7VYd8YHTWdd3D2hLGuaZ_B2osJ5WA0dulRISg9R17C3k5U/exec";

// ログイン状態を管理するための変数 (localStorageを使うため、この変数は必須ではない)
let isLoggedIn = false;

// ログイン処理（ニックネームと背番号で認証）
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const api_url = API_URL; 
  
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
      
      // ログイン成功時のUI更新
      document.getElementById("hamburger").style.display = "block"; // ハンバーガーメニューを表示
      document.getElementById("menuRegister").style.display = "block"; // 登録メニューも表示
      
      navigate("home"); // ログイン成功でホーム画面へ遷移
      localStorage.setItem("loggedIn", "true"); // ログイン状態を保存
      
    } else {
      messageElement.textContent = data.message || "ログインIDまたはパスワードが違います。";
    }

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    console.error("fetchエラー:", err);
  }
});

// メンバー一覧取得 (★描画高速化を適用)
async function loadMembers(){
  const api_url = API_URL; 
  
  try{
    // GASからメンバーデータを取得
    const res = await fetch(api_url);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = ""; 

    // ★★★ 高速化の鍵: DocumentFragmentを作成 ★★★
    const fragment = document.createDocumentFragment(); 

    const DEFAULT_IMAGE_PATH = 'images/member/00.png';

    if (Array.isArray(members)) {
      members.forEach(m=>{
        const memberNumber = m.number || '00'; 
        const primaryImagePath = `images/member/${memberNumber}.png`;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.number || ''}</td>
          <td>${m.nickname || ''}</td>
          <td>${m.position || ''}</td>
          <td>
            <img src="${primaryImagePath}" 
                 class="member-img" 
                 alt="${m.nickname || '画像'}"
                 onerror="this.onerror=null; this.src='${DEFAULT_IMAGE_PATH}';" 
            >
          </td>
        `;
        // fragmentに<tr>要素を追加 (ここでは描画は発生しない)
        fragment.appendChild(tr); 
      });

      // ★★★ 最終描画: Fragment全体を一度だけtbodyに追加し、描画を1回にまとめる ★★★
      tbody.appendChild(fragment);

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
    // 全ページの active クラスを削除
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    // 選択されたページに active クラスを付与
    document.getElementById(page).classList.add("active");
    if (page === 'members') {
        loadMembers(); // メンバーリストの高速描画
    }
    // ページ遷移時にもメニューを閉じる
    closeMenu(); 
}

// ------------------------------------
// メニュー開閉操作 (CSSの 'open' クラスと連動)
// ------------------------------------
function toggleMenu(){
  document.getElementById("sideMenu").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("open"); 
}
function closeMenu(){
  document.getElementById("sideMenu").classList.remove("open");
  document.getElementById("overlay").classList.remove("open"); 
}

// ログアウト
function logout(){
  navigate("login");
  document.getElementById("hamburger").style.display = "none";
  document.getElementById("menuRegister").style.display = "none"; 
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("role");
}

// ページロード時にログイン状態確認
window.addEventListener("load", () => {
  if(localStorage.getItem("loggedIn") === "true"){
    document.getElementById("login").classList.remove("active");
    document.getElementById("home").classList.add("active");
    document.getElementById("hamburger").style.display = "block";
    document.getElementById("menuRegister").style.display = "block";
  } else {
    // 未ログインならログイン画面を active に設定
    document.getElementById("login").classList.add("active");
    document.getElementById("home").classList.remove("active"); 
  }
});
