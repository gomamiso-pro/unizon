// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbz2Rtzd3l-7kzqmKzi5jug9nlrbkhblZCCjBgp5QVBSN6LJoHWtQPvHyY-FESoGm2te/exec";

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

    // ★ 修正点: メンバーデータに画像URLがない場合のローカルのデフォルト画像パス
    const DEFAULT_IMAGE_URL = 'images/member/00.png'; 

    if (Array.isArray(members)) {
      // ソート処理
      members.sort((a, b) => {
        const aOrder = parseInt(a.orderNo, 10) || 0;
        const bOrder = parseInt(b.orderNo, 10) || 0;
        return aOrder - bOrder;
      });
        
      members.forEach((m, i) => {
        // ★ 修正点: スプレッドシートから取得した画像URLを使用
        // m.image は GASでIMAGE_URL_COL_INDEXに保存した値
        const memberImageUrl = m.image || DEFAULT_IMAGE_URL; 
        
        const tr = document.createElement("tr");
        
        // メンバーデータ全体を保存（編集時に利用）
        tr.dataset.memberData = JSON.stringify(m); 
        
        // ★ メンバー行にダブルクリック/ダブルタップイベントを追加
        tr.addEventListener('dblclick', () => navigateToEdit(m));
        tr.addEventListener('touchend', (event) => {
          const now = new Date().getTime();
          const lastTouch = tr.dataset.lastTouch || 0;
          const delta = now - lastTouch;
          if (delta < 300 && delta > 0) {
            event.preventDefault();
            navigateToEdit(m);
          }
          tr.dataset.lastTouch = now;
        });

        tr.innerHTML = `
          <td>${i + 1}</td> 

          <td>
            <img src="${memberImageUrl}"  
                 class="member-img" 
                 alt="${m.nickname || '画像'}"
                 
                 // ★ 修正点: Drive URLが読み込めなかった場合、ローカルのデフォルト画像に切り替える
                 onerror="this.onerror=null; this.src='${DEFAULT_IMAGE_URL}';"
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

　　// メンバー登録/編集処理 の中の「ファイルがある場合の処理」ブロック全体
    // ファイルがある場合の処理
    if (file) {
        // ★ 修正案: 拡張子を安全かつシンプルに取得する
        const originalName = file.name;
        
        // 1. 拡張子を正規表現で取得 (例: ".png")
        // originalNameから拡張子部分（最後の.以降）を取得。見つからなければ空文字。
        const extMatch = originalName.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:jpe?g|png|gif|webp)$/i);
        let ext = extMatch ? extMatch[2] || '.' + extMatch[1] : ''; // 拡張子がない場合は空文字
        
        // 2. .jpeg を .jpg に統一
        if (ext.toLowerCase() === '.jpeg') {
            ext = '.jpg';
        }
        
        // 3. 拡張子が取得できなかった場合、念のためファイルタイプから推測 (例: image/png -> .png)
        if (!ext && file.type.startsWith('image/')) {
            // 例: "image/png" の "png" 部分を取得し、"." をつける
            ext = '.' + file.type.split('/').pop();
        }
        
        // 4. 背番号と拡張子を厳密に結合 (例: "30" + ".png" -> "30.png")
        // ★★★ 重要な変更点: 背番号に付着した不要な文字が入らないよう、ここでextを付ける ★★★
        fileName = `${number}${ext}`; 
        
        // 5. ファイルタイプはそのまま
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
    formData.append("action", "register");
    formData.append("number", number);
    formData.append("nickname", nickname);
    formData.append("position", position);
    // ファイルデータも送信 (GAS側で利用)
    formData.append("fileData", base64Data);
    formData.append("fileName", fileName);
    formData.append("fileType", fileType);

    try {
        const res = await fetch(api_url, {
            method: "POST",
            body: formData
        });

        const text = await res.text();
        
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

        form.reset(); 

    } catch (err) {
        messageElement.textContent = "通信エラーが発生しました。";
        console.error("fetchエラー:", err);
    }
}

// ページ切り替え (変更なし)
function navigate(page){
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(page).classList.add("active");

    if (page === 'members') {
        loadMembers();
    }
    
    if (page === 'register') {
        const editData = localStorage.getItem('editMemberData');
        const header = document.getElementById('registerHeader');
        
        if (editData) {
            const member = JSON.parse(editData);
            document.getElementById('numberInput').value = member.number || '';
            document.getElementById('registerForm').nickname.value = member.nickname || '';
            document.getElementById('registerForm').position.value = member.position || '';
            
            if (header) header.textContent = 'メンバー編集';

            // 背番号は編集させないように無効化
            document.getElementById('numberInput').disabled = true;

            localStorage.removeItem('editMemberData');
            
        } else {
            document.getElementById('registerForm').reset();
            if (header) header.textContent = 'メンバー登録';
            document.getElementById('numberInput').disabled = false;
        }
    }
    
    closeMenu(); 
}

// ------------------------------------
// メニュー開閉操作 (変更なし)
// ------------------------------------
function toggleMenu(){
  document.getElementById("sideMenu").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("open"); 
}
function closeMenu(){
  document.getElementById("sideMenu").classList.remove("open");
  document.getElementById("overlay").classList.remove("open"); 
}

// ログアウト (変更なし)
function logout(){
  navigate("login");
  document.getElementById("hamburger").style.display = "none";
  document.getElementById("menuRegister").style.display = "none"; 
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("role");
}

// ページロード時にログイン状態確認 (変更なし)
window.addEventListener("load", () => {
  if(localStorage.getItem("loggedIn") === "true"){
    document.getElementById("login").classList.remove("active");
    document.getElementById("home").classList.add("active");
    document.getElementById("hamburger").style.display = "block";
    document.getElementById("menuRegister").style.display = "block";
  }
});
