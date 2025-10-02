// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbw9WlXEjDZqkfGZha6WGCi7oBSRdpziGT4NsgAm1u-7lqEn0OZMd5Do3xIx63u2d91P/exec";

// ログイン状態を管理するための変数 (未使用だが維持)
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
      // ★ ログイン成功時の処理順序を整理 (安定性向上)
      messageElement.textContent = "ログイン成功！";
      
      // ログイン成功時のUI更新
      document.getElementById("hamburger").style.display = "block";
      document.getElementById("menuRegister").style.display = "block";
      
      navigate("home"); // 画面遷移を先に実行
      localStorage.setItem("loggedIn", "true");
      
      e.target.reset(); // フォームリセットを画面遷移後に実行

    } else {
      messageElement.textContent = data.message || "ログインIDまたはパスワードが違います。";
    }

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    console.error("fetchエラー:", err);
  }
});

// メンバーリストの行クリック（編集）処理
function navigateToEdit(memberData) {
    // データを一時的にローカルストレージに保存
    localStorage.setItem('editMemberData', JSON.stringify(memberData));
    
    // 編集画面に遷移
    navigate('register');
}

// メンバー一覧取得
async function loadMembers(){
  const api_url = API_URL; 
  
  try{
    const res = await fetch(api_url);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = ""; 

    // GitHub Pages/Webアプリの静的アセットを参照するパスに変更
    const DEFAULT_IMAGE_PATH = 'images/member/00.png';

    if (Array.isArray(members)) {
      // ソート処理
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
        
        // メンバーデータ全体を保存（編集時に利用）
        tr.dataset.memberData = JSON.stringify(m); 
        
        // ★ メンバー行にダブルクリック/ダブルタップイベントを追加
        tr.addEventListener('dblclick', () => navigateToEdit(m));
        tr.addEventListener('touchend', (event) => {
          // モバイルのダブルタップをシミュレート
          const now = new Date().getTime();
          const lastTouch = tr.dataset.lastTouch || 0;
          const delta = now - lastTouch;
          if (delta < 300 && delta > 0) { // 300ms以内をダブルタップと判定
            event.preventDefault(); // 拡大などを防ぐ
            navigateToEdit(m);
          }
          tr.dataset.lastTouch = now;
        });

        tr.innerHTML = `
          <td>${i + 1}</td> 

          <td>
            <img src="${primaryImagePath}"  
                 class="member-img" 
                 alt="${m.nickname || '画像'}"
                 // 画像フォールバック処理は維持
                 onerror="this.onerror=null; this.src='${secondaryImagePath}'; this.onerror=function(){this.src='${DEFAULT_IMAGE_PATH}';};"
                 style="display: block; margin: 0 auto 5px;" 
            >
            <p style="text-align: center; margin: 0;">${m.nickname || ''}</p>
          </td>

          <td>${m.number || ''}</td> 
          <td>${m.position || ''}</td> 
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



// メンバー登録/編集処理 
document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const api_url = API_URL;
    const form = e.target;
    const messageElement = document.getElementById("registerMessage");
    
    // messageElementがnullになることはHTML修正でなくなったため、確認を省略

    messageElement.textContent = "処理中...";

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
        // ★ 修正: ファイル名を背番号ベースに統一
        const originalName = file.name;
        const extMatch = originalName.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:jpe?g|png|gif|webp)$/i);
        let ext = extMatch ? extMatch[2] || '.' + extMatch[1] : '.png';
        
        if (ext.toLowerCase() === '.jpeg') {
            ext = '.jpg';
        }

        fileName = `${number}${ext}`; // 例: "07.png"
        fileType = file.type;

        const reader = new FileReader();
        reader.onloadend = async function() {
            base64Data = reader.result.split(',')[1]; 
            await sendRegistration(api_url, number, nickname, position, base64Data, fileName, fileType, messageElement, form);
        };
        reader.readAsDataURL(file);
    } else {
        // ファイルがない場合、すぐに送信処理を実行
        await sendRegistration(api_url, number, nickname, position, base64Data, fileName, fileType, messageElement, form);
    }
});

// 送信処理を分離したヘルパー関数
async function sendRegistration(api_url, number, nickname, position, base64Data, fileName, fileType, messageElement, form) {
    const formData = new FormData();
    // GAS側で新規登録か編集かを判断するため、actionは'register' (または'update')として送信
    // GAS側で背番号の重複確認と上書き処理が必要です。
    formData.append("action", "register"); // GAS側で背番号をキーに更新または新規作成
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
        
        // JSON形式で結果を期待
        let result = {};
        try { result = JSON.parse(text); } 
        catch { 
          messageElement.textContent = text.includes("success") ? "処理成功！" : "サーバーから不正な応答がありました。"; 
          form.reset();
          return; 
        }

        if (result.status === "success") {
            messageElement.textContent = result.message || "登録/編集が完了しました！";
        } else {
            messageElement.textContent = result.message || "処理に失敗しました。";
        }

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

    // メンバー画面に遷移する場合、一覧を再読み込み
    if (page === 'members') {
        loadMembers();
    }
    
    // 登録/編集画面に遷移する場合の処理
    if (page === 'register') {
        const editData = localStorage.getItem('editMemberData');
        const header = document.getElementById('registerHeader');
        
        if (editData) {
            // 編集モード
            const member = JSON.parse(editData);
            document.getElementById('registerForm').number.value = member.number || '';
            document.getElementById('registerForm').nickname.value = member.nickname || '';
            document.getElementById('registerForm').position.value = member.position || '';
            
            // ヘッダーを「メンバー編集」に切り替え
            if (header) header.textContent = 'メンバー編集';

            // 背番号は編集させないように無効化（GASで上書きされないようにするため）
            document.getElementById('registerForm').number.disabled = true;

            // 処理が完了したら編集データをクリア
            localStorage.removeItem('editMemberData');
            
        } else {
            // 新規登録モード
            document.getElementById('registerForm').reset();
            if (header) header.textContent = 'メンバー登録';
            document.getElementById('registerForm').number.disabled = false;
        }
    }
    
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
    // ログイン状態であれば、即座にホームに遷移するため、navigate("home")でも良い
    // navigate("home"); 
  }
});
