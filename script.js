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

// メンバー登録処理の追加 ★★★ ここから新規追加 ★★★
document.getElementById("registerForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const api_url = API_URL; 
  const form = e.target;
  const messageElement = document.getElementById("registerMessage");
  
  const formData = new FormData(form);
  formData.append("action", "register"); // GAS側で登録処理を識別するためのアクション
  
  messageElement.textContent = "登録中...";

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
      messageElement.textContent = "メンバー登録が完了しました！";
      form.reset();
      // 登録成功後、ホーム画面へ遷移
      setTimeout(() => {
        navigate("home");
        messageElement.textContent = ""; // メッセージをクリア
      }, 1500); 
      
    } else {
      messageElement.textContent = data.message || "登録中にエラーが発生しました。";
    }

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    console.error("fetchエラー:", err);
  }
});
// ★★★ 新規追加ここまで ★★★


// メンバー一覧取得 (登録順/IDでソートし、描画高速化を適用)
async function loadMembers(){
  const api_url = API_URL; 
  
  try{
    // GASからメンバーデータを取得
    const res = await fetch(api_url);
    const members = await res.json();
    let membersArray = Array.isArray(members) ? members : []; // 配列でない場合の安全策
    
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = ""; 

    // ★★★ 修正箇所: メンバーデータを登録順（id）順にソートする ★★★
    membersArray.sort((a, b) => {
      // 登録順（id）を数値として比較する
      // (a.id || 9999) の部分は、GASから取得した登録順のキー名に置き換えてください
      const orderA = parseInt(a.id, 10) || 9999; 
      const orderB = parseInt(b.id, 10) || 9999; 
      
      // 昇順 (小さい方が前)
      return orderA - orderB;
    });
    // ★★★ ソート処理はここまで ★★★

    // ★★★ 描画高速化の鍵: DocumentFragmentを作成 ★★★
    const fragment = document.createDocumentFragment(); 

    const DEFAULT_IMAGE_PATH = 'images/member/00.png';

    if (membersArray.length > 0) {
      membersArray.forEach(m=>{ // ソート済みの membersArray を使用
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

// ページロード時にログイン状態確認とイベント設定
window.addEventListener("load", () => {
  // ★★★ 修正・追加箇所: 初期表示時の制御 ★★★
  const hamburgerButton = document.getElementById("hamburger");
  const menuRegister = document.getElementById("menuRegister");

  if(localStorage.getItem("loggedIn") === "true"){
    document.getElementById("login").classList.remove("active");
    document.getElementById("home").classList.add("active");
    hamburgerButton.style.display = "block";
    menuRegister.style.display = "block";
  } else {
    // 未ログインならログイン画面を active に設定
    document.getElementById("login").classList.add("active");
    document.getElementById("home").classList.remove("active"); 
    // 未ログイン時はハンバーガーメニューを非表示に
    hamburgerButton.style.display = "none"; 
    menuRegister.style.display = "none";
  }
  
  // ★★★ 追加箇所: ハンバーガーメニューのイベントリスナーを設定 ★★★
  hamburgerButton.addEventListener("click", toggleMenu);
  document.getElementById("overlay").addEventListener("click", closeMenu);
});
