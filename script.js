// ログイン状態を管理するための変数
let isLoggedIn = false;

// ★ Google Apps Script のURLはHTMLに記載されているため、ここでは省略 ★
// const API_URL = "https://script.google.com/macros/s/AKfycbz4DdRaX8u7PYwQxMnHYc7VYd8YHTWdd3D2hLGuaZ_B2osJ5WA0dulRISg9R17C3k5U/exec";

// ログイン処理（ニックネームと背番号で認証）
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  // 入力値を取得
  const nickname = e.target.login_nickname.value;
  const number = e.target.login_number.value;
  const messageElement = document.getElementById("loginMessage");

  // 1. GASへ送るための FormData を作成
  const formData = new FormData();
  formData.append("action", "login"); 
  formData.append("nickname", nickname);
  formData.append("number", number);
  
  messageElement.textContent = "認証中...";

  try {
    // 2. fetchでPOST送信
    const res = await fetch(API_URL, {
      method: "POST",
      body: formData
    });

    const text = await res.text();
    console.log("GASからの応答:", text);

    // 応答をJSONとしてパース
    let data = {};
    try { data = JSON.parse(text); } 
    catch { 
      messageElement.textContent = `サーバーから不正な応答がありました。`; 
      return; 
    }

    // 3. 認証結果の判定
    if (data.status === "success") {
      messageElement.textContent = "ログイン成功！";
      e.target.reset(); // フォームをリセット
      
      // ★ 成功時の処理 ★
      // 画面切り替えとハンバーガーメニュー表示
      document.getElementById("login").classList.remove("active");
      document.getElementById("home").classList.add("active");
      document.getElementById("hamburger").style.display = "block";
      
      // 【修正点1】ログイン成功時（Home表示時）の loadMembers() 呼び出しを削除

    } else {
      // 失敗時の処理
      messageElement.textContent = data.message || "ログインIDまたはパスワードが違います。";
    }

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    console.error("fetchエラー:", err);
  }
});

// メンバー一覧取得（画像パスを/images/member/に変更し、GitHub Pages対応済み）
async function loadMembers(){
  try{
    // GASからメンバーデータを取得
    const res = await fetch(API_URL);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = ""; // tbodyをクリア

    // ★ デフォルト画像のパスを定数として定義 ★
    const DEFAULT_IMAGE_PATH = 'images/member/00.png';

    if (Array.isArray(members)) {
      members.forEach(m=>{
        // 画像パスを「images/member/背番号.拡張子」として構築
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
                 // 【修正点2】onerrorを簡略化し、JPG→PNG→デフォルトの順で画像を試行する
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
    // ★ 修正 ★：MEMBERページに切り替えるときだけデータを読み込む
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
  // ログアウト時にローカルストレージをクリア
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("role");
}

// ページロード時にログイン状態確認
window.addEventListener("load", () => {
  // ログイン状態であれば、ログイン画面をスキップし、ハンバーガーを表示
  if(localStorage.getItem("loggedIn") === "true"){
    document.getElementById("login").classList.remove("active");
    document.getElementById("home").classList.add("active");
    document.getElementById("hamburger").style.display = "block";
    document.getElementById("menuRegister").style.display = "none";
    
    // 【修正点1に関連】ページロード時（Home表示時）もロードは不要のまま
    // loadMembers(); 
  }
});
  }
});
