// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbw9WlXEjDZqkfGZha6WGCi7oBSRdpziGT4NsgAm1u-7lqEn0OZMd5Do3xIx63u2d91P/exec";

// ログイン状態を管理するための変数 (実際はlocalStorageで管理)
let isLoggedIn = false;

// ------------------------------------
// ログイン処理
// ------------------------------------
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

// ------------------------------------
// メンバー一覧取得（編集機能の追加箇所）
// ------------------------------------
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
      // 順序番号でソート
      members.sort((a, b) => {
        const aOrder = parseInt(a.orderNo, 10) || 0;
        const bOrder = parseInt(b.orderNo, 10) || 0;
        return aOrder - bOrder;
      });
        
      members.forEach((m, i) => {
        const memberNumber = String(m.number || '00').trim(); 
        const primaryImagePath = `images/member/${memberNumber}.png`;
        const secondaryImagePath = `images/member/${memberNumber}.jpg`;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${i + 1}</td> 

          <td>
            <img src="${primaryImagePath}"  
                 class="member-img" 
                 alt="${m.nickname || '画像'}"
                 // エラー時にJPGを試し、それでもダメならデフォルト画像に切り替え
                 onerror="this.onerror=null; this.src='${secondaryImagePath}'; this.onerror=function(){this.src='${DEFAULT_IMAGE_PATH}';};"
                 style="display: block; margin: 0 auto 5px;" 
            >
            <p style="text-align: center; margin: 0;">${m.nickname || ''}</p>
          </td>

          <td>${m.number || ''}</td> 
          <td>${m.position || ''}</td> 
        `;
        
        // ★ 変更点1: ダブルクリック（PC）で編集画面へ遷移
        tr.addEventListener('dblclick', () => { 
            navigateToEdit(JSON.stringify(m)); 
        });
        
        // ★ 変更点2: ダブルタップ（モバイル）で編集画面へ遷移
        let lastTap = 0;
        tr.addEventListener('touchend', function (event) {
            const now = new Date().getTime();
            const timesince = now - lastTap;
            // 300ms以内のタップをダブルタップと判定
            if ((timesince < 300) && (timesince > 0)) {
                event.preventDefault(); // スクロール/ズーム防止
                navigateToEdit(JSON.stringify(m));
            }
            lastTap = new Date().getTime();
        });

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

// ------------------------------------
// メンバー登録/編集処理
// ------------------------------------
document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const api_url = API_URL;
    const form = e.target;
    const messageElement = document.getElementById("registerMessage") || document.createElement('p');
    
    // エラーメッセージ要素がない場合、新しく作成
    if (!document.getElementById("registerMessage")) {
        messageElement.id = "registerMessage";
        document.getElementById("register")?.appendChild(messageElement) || document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = "処理中..."; // 登録・更新どちらの場合もあり

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    let base64Data = "";
    let fileName = "";
    let fileType = "";

    const number = form.number.value;
    const nickname = form.nickname.value;
    const position = form.position.value;

    // 必須チェック（背番号とニックネームは必須と仮定）
    if (!number || !nickname) {
        messageElement.textContent = "エラー: 背番号とニックネームは必須です。";
        return;
    }

    // ファイルがある場合の処理
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async function() {
            // Base64データ部分を取得
            base64Data = reader.result.split(',')[1]; 
            fileName = file.name;
            fileType = file.type;
            
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
    // GAS側で「register」アクションで新規登録と更新の両方を処理する前提
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
        
        let data = { message: text };
        try { data = JSON.parse(text); } catch {}
        
        messageElement.textContent = data.message || text;
        
        // 成功した場合のみフォームをリセット（背番号を編集不可にしていた場合は元に戻す）
        if (data.status === "success" || !data.status) { // GASがJSONで返さない場合も成功と見なす
             form.reset(); 
             form.number.readOnly = false; // 編集不可を解除
             // フォームのタイトルを新規登録に戻す
             document.getElementById("registerHeader").textContent = "メンバー登録";
        }


    } catch (err) {
        messageElement.textContent = "通信エラーが発生しました。";
        console.error("fetchエラー:", err);
    }
}

// ------------------------------------
// 編集画面へ遷移するヘルパー関数
// ------------------------------------
function navigateToEdit(memberDataJson) {
    // メンバーデータを一時的に保存
    localStorage.setItem('memberToEdit', memberDataJson);
    // 登録画面へ遷移 (navigate内で編集モードの処理が行われる)
    navigate('register'); 
}


// ------------------------------------
// ページ切り替え（編集機能の追加箇所）
// ------------------------------------
function navigate(page){
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(page).classList.add("active");
    
    // ★ 変更点3: 'register' 画面への遷移時の処理
    if (page === 'register') {
        const memberDataJson = localStorage.getItem('memberToEdit');
        const form = document.getElementById("registerForm");
        const messageElement = document.getElementById("registerMessage");
        
        // フォームのリセットとメッセージの初期化
        form.reset();
        if(messageElement) messageElement.textContent = "";

        if (memberDataJson) {
            // 編集モード
            const member = JSON.parse(memberDataJson);
            
            // フォームにデータをセット
            form.number.value = member.number || '';
            form.nickname.value = member.nickname || '';
            form.position.value = member.position || '';
            
            // フォームのタイトルを編集用に変更
            document.getElementById("registerHeader").textContent = "メンバー編集";
            
            // 背番号（キー）は編集不可にする
            form.number.readOnly = true; 

            // 処理が完了したら一時データを削除
            localStorage.removeItem('memberToEdit');
            
        } else {
            // 新規登録モード
            document.getElementById("registerHeader").textContent = "メンバー登録";
            form.number.readOnly = false; // 背番号を編集可能にする
        }
    } 
    
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

// ------------------------------------
// ログアウト
// ------------------------------------
function logout(){
  navigate("login");
  document.getElementById("hamburger").style.display = "none";
  document.getElementById("menuRegister").style.display = "none"; 
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("role");
}

// ------------------------------------
// ページロード時の初期処理
// ------------------------------------
window.addEventListener("load", () => {
  if(localStorage.getItem("loggedIn") === "true"){
    document.getElementById("login").classList.remove("active");
    document.getElementById("home").classList.add("active");
    document.getElementById("hamburger").style.display = "block";
    document.getElementById("menuRegister").style.display = "block";
  }
});
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
