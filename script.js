// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbwI79PUOlo8875HBONFO_XRHR-s_UEFtalGYO5lgpUFD9KaMEg6FJOWGjiodTk-fhcA/exec";

// ログイン状態を管理するための変数
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

// メンバー一覧取得
async function loadMembers(){
  const api_url = API_URL; 
  
  try{
    // GASからメンバーデータを取得
    const res = await fetch(api_url);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = ""; 

    // ★ 修正後のデフォルト画像パス
    const DEFAULT_IMAGE_PATH = 'images/member/00.png';

    if (Array.isArray(members)) {
      // ソート処理
      members.sort((a, b) => {
        // orderNoが数値であることを期待して比較
        const aOrder = parseInt(a.orderNo, 10) || 0;
        const bOrder = parseInt(b.orderNo, 10) || 0;
        return aOrder - bOrder;
      });
      
      members.forEach((m, i) => {
        // ★ 修正ポイント: GASから返される 'imageUrl' プロパティを使用
        // 'm.imageUrl' が存在しない場合はデフォルト画像を使用
        const memberImageUrl = m.image || DEFAULT_IMAGE_PATH;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${i + 1}</td> 
        
          <td>
            <img src="${memberImageUrl}" 
                 class="member-img" 
                 alt="${m.nickname || '画像'}"
                 onerror="this.onerror=null; this.src='${DEFAULT_IMAGE_PATH}';"
                 style="display: block; margin: 0 auto 5px;" 
            >
            <p style="text-align: center; margin: 0;">${m.nickname || ''}</p>
          </td>
        
          <td>${m.number || ''}</td> 
          <td>${m.position || ''}</td> 
          </tr>
          `;
        tbody.appendChild(tr);
      });
    } else {
      console.error("メンバー取得エラー（GAS側）:", members.message);
      // 列数に合わせて colspan を修正
      tbody.innerHTML = `<tr><td colspan="4">メンバーデータの取得に失敗しました: ${members.message || 'データ形式エラー'}</td></tr>`;
    }
  } catch(err){
    console.error("メンバー取得通信エラー:", err);
    // 列数に合わせて colspan を修正
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = `<tr><td colspan="4">ネットワーク通信エラーが発生しました。</td></tr>`;
  }
}


// メンバー登録処理 
document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const api_url = API_URL;
    const form = e.target;
    const messageElement = document.getElementById("registerMessage") || document.createElement('p');
    
    // エラーメッセージ要素がない場合、新しく作成してフォームコンテナに追加
    if (!document.getElementById("registerMessage")) {
        messageElement.id = "registerMessage";
        const registerContainer = document.getElementById("register");
        if (registerContainer) {
            registerContainer.appendChild(messageElement);
        } else {
            // #registerがない場合のフォールバック
            document.body.appendChild(messageElement);
        }
    }
    
    messageElement.textContent = "登録中...";

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    // ファイルデータは必須ではないため、存在しない場合は空として送信
    let base64Data = "";
    let fileName = "";
    let fileType = "";

    const number = form.number.value;
    const nickname = form.nickname.value;
    const position = form.position.value; // ポジションはそのまま取得

    // 必須チェック（背番号とニックネームは必須と仮定）
    if (!number || !nickname) {
        messageElement.textContent = "エラー: 背番号とニックネームは必須です。";
        return;
    }

    // ファイルがある場合の処理
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async function() {
            // 'data:image/png;base64,' のようなプレフィックスを削除
            base64Data = reader.result.split(',')[1]; 
            fileName = file.name;
            fileType = file.type;
            
            // ファイルの読み込みが完了したら、送信処理を実行
            await sendRegistration(api_url, number, nickname, position, base64Data, fileName, fileType, messageElement, form);
        };
        reader.readAsDataURL(file); // Base64に変換を開始
    } else {
        // ファイルがない場合、すぐに送信処理を実行
        await sendRegistration(api_url, number, nickname, position, base64Data, fileName, fileType, messageElement, form);
    }
});

// 送信処理を分離したヘルパー関数
async function sendRegistration(api_url, number, nickname, position, base64Data, fileName, fileType, messageElement, form) {
    const formData = new FormData();
    formData.append("action", "register");
    formData.append("number", number);
    formData.append("nickname", nickname);
    formData.append("position", position);
    formData.append("fileData", base64Data);
    formData.append("fileName", fileName);
    formData.append("fileType", fileType);

    try {
        const res = await fetch(api_url, {
            method: "POST",
            body: formData
        });

        const text = await res.text();
        messageElement.textContent = text;
        form.reset(); // フォームをリセット

    } catch (err) {
        messageElement.textContent = "通信エラーが発生しました。";
        console.error("fetchエラー:", err);
    }
}

// ページ切り替え
function navigate(page){
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(page).classList.add("active");
    if (page === 'members') {
        loadMembers();
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
  }
});
