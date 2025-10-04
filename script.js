// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbw9WlXEjDZqkfGZha6WGCi7oBSRdpziGT4NsgAm1u-7lqEn0OZMd5Do3xIx63u2d91P/exec";

// ログイン状態を管理するための変数
let isLoggedIn = false;

// ダブルクリック/ダブルタップ検出用の変数
let lastTouchTime = 0;
const DBL_TOUCH_THRESHOLD = 300; // ms

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

    const DEFAULT_IMAGE_PATH = 'images/member/00.png';

    if (Array.isArray(members)) {
      // ★★★ ソート処理 ★★★
      members.sort((a, b) => {
        // orderNoが数値であることを期待して比較
        const aOrder = parseInt(a.orderNo, 10) || 0;
        const bOrder = parseInt(b.orderNo, 10) || 0;
        return aOrder - bOrder;
      });
      // ★★★ ここまでソート処理 ★★★
        
 members.forEach((m, i) => {
    // 背番号をトリム（空白除去）して取得
    const memberNumber = String(m.number || '00').trim(); 
    
    // PNGを最初に試行するパスを設定
    const primaryImagePath = `images/member/${memberNumber}.png`;
    
    // JPGを次に試行するパスを設定
    const secondaryImagePath = `images/member/${memberNumber}.jpg`;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td> 

      <td>
        <img src="${primaryImagePath}"  
             class="member-img" 
             alt="${m.nickname || '画像'}"
             
             onerror="this.onerror=null; this.src='${secondaryImagePath}'; this.onerror=function(){this.src='${DEFAULT_IMAGE_PATH}';};"
             style="display: block; margin: 0 auto 5px;" 
        >
        <p style="text-align: center; margin: 0;">${m.nickname || ''}</p>
      </td>

      <td>${m.number || ''}</td> 
      <td>${m.position || ''}</td> 
    `;
    // 💡 変更点: ダブルクリックで編集画面へ (PC)
    tr.addEventListener('dblclick', (event) => {
      editMember(m);
    });
    // 💡 変更点: ダブルタッチで編集画面へ (モバイル対応)
    tr.addEventListener('touchend', (event) => {
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - lastTouchTime;

      if (timeDifference < DBL_TOUCH_THRESHOLD && timeDifference > 0) {
        // ダブルタップと判定
        editMember(m);
        event.preventDefault(); // クリックイベントの発生を防ぐ
      }
      lastTouchTime = currentTime;
    });
    
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

// 💡 新規追加: メンバー編集画面に情報をロードする関数
function editMember(memberData) {
  // フォームにデータを設定
  document.getElementById("registerNumber").value = memberData.number || '';
  document.getElementById("registerNickname").value = memberData.nickname || '';
  document.getElementById("registerPosition").value = memberData.position || '';
  
  // フォームのタイトルとボタンを編集モードに切り替え
  document.getElementById("registerTitle").textContent = "メンバー編集";
  document.getElementById("registerButton").textContent = "編集を保存";
  document.getElementById("actionType").value = "edit"; // アクションを編集に設定
  document.getElementById("registerNumber").disabled = true; // 背番号を編集不可にする（キーとするため）
  
  // メッセージをクリア
  document.getElementById("registerMessage").textContent = "";

  // 登録画面に遷移
  navigate("register");
}


// メンバー登録処理 
document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const api_url = API_URL;
    const form = e.target;
    
    const messageElement = document.getElementById("registerMessage");
    
    messageElement.textContent = "処理中...";

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    // ファイルデータは必須ではないため、存在しない場合は空として送信
    let base64Data = "";
    let fileName = "";
    let fileType = "";

    const number = form.number.value;
    const nickname = form.nickname.value;
    const position = form.position.value;
    const actionType = document.getElementById("actionType").value;
    
    // 必須チェック
    if (!number || !nickname) {
        messageElement.textContent = "エラー: 背番号とニックネームは必須です。";
        return;
    }

    // GASに送るアクション名を actionType に応じて決定
    const action = actionType === 'edit' ? 'edit' : 'register';

    // ファイルがある場合の処理
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async function() {
            // 'data:image/png;base64,' のようなプレフィックスを削除
            base64Data = reader.result.split(',')[1]; 
            fileName = file.name;
            fileType = file.type;
            
            // ファイルの読み込みが完了したら、送信処理を実行
            await sendRegistration(api_url, action, number, nickname, position, base64Data, fileName, fileType, messageElement, form);
        };
        reader.readAsDataURL(file); // Base64に変換を開始
    } else {
        // ファイルがない場合、すぐに送信処理を実行
        await sendRegistration(api_url, action, number, nickname, position, base64Data, fileName, fileType, messageElement, form);
    }
});

// 送信処理を分離したヘルパー関数
async function sendRegistration(api_url, action, number, nickname, position, base64Data, fileName, fileType, messageElement, form) {
    const formData = new FormData();
    formData.append("action", action); // 'register' または 'edit'
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
        
        // フォームの状態を登録モードに戻す
        document.getElementById("registerTitle").textContent = "メンバー登録";
        document.getElementById("registerButton").textContent = "登録";
        document.getElementById("actionType").value = "register"; 
        document.getElementById("registerNumber").disabled = false; 

        // フォームリセット
        form.reset();

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
    } else if (page === 'register') {
        // 💡 変更点: 登録画面に遷移した際、フォームをリセットし、登録モードに強制的に戻す
        document.getElementById("registerForm").reset();
        document.getElementById("registerTitle").textContent = "メンバー登録";
        document.getElementById("registerButton").textContent = "登録";
        document.getElementById("actionType").value = "register";
        document.getElementById("registerNumber").disabled = false;
        document.getElementById("registerMessage").textContent = ""; // メッセージクリア
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
