// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbz4DdRaX8u7PYwQxMnHYc7VYd8YHTWdd3D2hLGuaZ_B2osJ5WA0dulRISg9R17C3k5U/exec";

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

    const DEFAULT_IMAGE_PATH = 'images/member/00.png';

    if (Array.isArray(members)) {
      // ★★★ ここからソート処理を追加 ★★★
      members.sort((a, b) => {
        // orderNoが数値であることを期待して比較
        // 存在しない場合や不正な値の場合は、安全のために0として扱う
        const aOrder = parseInt(a.orderNo, 10) || 0;
        const bOrder = parseInt(b.orderNo, 10) || 0;
        return aOrder - bOrder;
      });
      // ★★★ ここまでソート処理を追加 ★★★
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
// ----------------------------------------------------------------------
// 登録処理
// ----------------------------------------------------------------------
function handleRegister(e) {
  // フォームデータの取得
  const number = e.parameter.number;
  const nickname = e.parameter.nickname;
  const position = e.parameter.position;
  const fileData = e.parameter.fileData;
  const fileName = e.parameter.fileName;
  const fileType = e.parameter.fileType;
  
  if (!number || !nickname || !position || !fileData) {
    return ContentService.createTextOutput("エラー: 必須項目が不足しています。");
  }

  let imageUrl = '';
  
  try {
    // 1. 画像ファイルをGoogle Driveに保存
    const blob = Utilities.newBlob(Utilities.base64Decode(fileData), fileType, fileName);
    const file = DriveApp.createFile(blob);
    
    // 画像の公開設定
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    imageUrl = file.getUrl(); 

    // 2. スプレッドシートに行を追加
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput("エラー: シートが見つかりません。");
    }

    // --- ★ orderNo の自動設定処理を追加 ★ ---

    const data = sheet.getDataRange().getValues();
    const headers = data.shift() || []; // ヘッダー行
    const orderNoIndex = headers.indexOf("orderNo");

    let nextOrderNo = 1; // データが空またはorderNo列がない場合のデフォルト値

    if (orderNoIndex !== -1 && data.length > 0) {
      // 既存のデータから最大の orderNo を検索
      const maxOrderNo = data.reduce((max, row) => {
        const currentOrderNo = parseInt(row[orderNoIndex], 10);
        return isNaN(currentOrderNo) ? max : Math.max(max, currentOrderNo);
      }, 0);
      nextOrderNo = maxOrderNo + 1;
    }
    
    // --- ★ データ挿入時の orderNo の位置に注意 ★ ---
    
    // ヘッダー行を元に、新しい行のデータの位置を決定する
    // 例: headersが ['orderNo', 'number', 'nickname', 'position', 'image'] の場合
    
    const newRow = new Array(headers.length).fill('');
    
    // 各項目のインデックスを探して値を設定
    if (orderNoIndex !== -1) newRow[orderNoIndex] = nextOrderNo;
    
    const numberIndex = headers.indexOf("number");
    if (numberIndex !== -1) newRow[numberIndex] = number;
    
    const nicknameIndex = headers.indexOf("nickname");
    if (nicknameIndex !== -1) newRow[nicknameIndex] = nickname;

    const positionIndex = headers.indexOf("position");
    if (positionIndex !== -1) newRow[positionIndex] = position;
    
    const imageIndex = headers.indexOf("image"); // 画像URLを保存する列名
    if (imageIndex !== -1) newRow[imageIndex] = imageUrl;

    // スプレッドシートに行を追加
    sheet.appendRow(newRow);

    return ContentService.createTextOutput(`${nickname}さんの情報が正常に登録されました (Order No: ${nextOrderNo})。`);
  } catch (e) {
    Logger.log(e);
    return ContentService.createTextOutput("エラー: 登録中に問題が発生しました。 " + e.message);
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
