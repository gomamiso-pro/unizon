
// ログイン処理（ニックネームと背番号で認証）
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  // 入力値を取得
  const nickname = e.target.login_nickname.value;
  const number = e.target.login_number.value;
  const messageElement = document.getElementById("loginMessage");

  // 1. GASへ送るための FormData を作成
  const formData = new FormData();
  formData.append("action", "login"); // GAS側で処理を振り分けるための必須項目
  formData.append("nickname", nickname);
  formData.append("number", number);
  
  messageElement.textContent = "認証中...";

  try {
    // 2. fetchでPOST送信
    const res = await fetch(API_URL, {
      method: "POST",
      body: formData // FormDataをそのまま送信（Content-Typeは自動設定）
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
    // ログイン画面を非表示にし、ホーム画面を表示
    document.getElementById("login").classList.remove("active");
    document.getElementById("home").classList.add("active");
    
    // 【✅ 修正箇所】ハンバーガーメニューを表示に切り替える
    document.getElementById("hamburger").style.display = "block";
    
    // 【✅ 追加推奨】メンバーリストもここで読み込みましょう
    loadMembers(); 
    
    // 【✅ 追加推奨】サイドメニュー内の項目も表示に切り替える
    // (loadMembers関数と一緒に、ここでメニュー内の表示を更新する関数も実行推奨)

    } else {
      // 失敗時の処理
      messageElement.textContent = data.message || "ログインIDまたはパスワードが違います。";
    }

  } catch (err) {
    messageElement.textContent = "通信エラーが発生しました。";
    console.error("fetchエラー:", err);
  }
});

// ページ切り替え
function navigate(page){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(page).classList.add("active");
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
    document.getElementById("menuRegister").style.display = "none"; // 全員 user
  }

  // メンバー一覧取得（画像パスを背番号ベースにし、jpg/pngのフォールバックに対応）
async function loadMembers(){
  try{
    const res = await fetch(API_URL);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = "";

    if (Array.isArray(members)) {
      members.forEach(m=>{
        // 画像パスを「/member/背番号.拡張子」として構築
        const memberNumber = m.number || '00'; // 番号がない場合のフォールバック

        // HTML要素として画像パスを埋め込む際は、単純に.jpgを指定します。
        // ブラウザ側で画像が見つからない場合にonerrorで.pngを試す処理を追加します。
        const imagePath = `/member/${memberNumber}.jpg`; 
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.number || ''}</td>
          <td>${m.nickname || ''}</td>
          <td>${m.position || ''}</td>
          <td>
            <img src="${imagePath}" 
                 class="member-img" 
                 alt="${m.nickname || '画像'}"
                 onerror="this.onerror=null; this.src='/member/${memberNumber}.png';" 
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

});
