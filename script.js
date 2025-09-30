function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // ログインページ以外に移動するときはメッセージをクリア
  if(id !== 'login') {
    document.getElementById("loginMessage").innerText = "";
  }
}

// 💡 ログインフォーム送信処理の追加
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const nickname = e.target.login_nickname.value;
  const number = e.target.login_number.value;
  const messageElement = document.getElementById("loginMessage");
  messageElement.innerText = "認証中...";

  try {
    // 認証用のPOSTリクエストをGASに送信
    const formData = new FormData();
    formData.append("action", "login"); // 💡 GASにログイン処理を要求
    formData.append("nickname", nickname);
    formData.append("number", number);

    const res = await fetch(API_URL, { method: "POST", body: formData });
    const result = await res.json();

    if (result.status === "success") {
      messageElement.innerText = "ログイン成功！";
      e.target.reset();
      showPage('members'); // 認証成功後、メンバー一覧へ
      loadMembers();
    } else {
      messageElement.innerText = "ログインIDまたはパスワードが間違っています。";
    }
  } catch (err) {
    console.error("ログインエラー:", err);
    messageElement.innerText = "通信エラーが発生しました。";
  }
});

// メンバー一覧取得
// ... (loadMembers関数はそのまま) ...
async function loadMembers(){
  try{
    // 💡 loadMembersも認証を必要とする場合は、GAS側の処理を認証後に切り替える必要がありますが、
    // ここではWebアプリでログイン状態を管理しないため、認証後もそのまま一覧を取得します。
    const res = await fetch(API_URL);
    const members = await res.json();
    const tbody = document.getElementById("memberTable");
    tbody.innerHTML = "";
    members.forEach(m=>{
      // ファイル名はニックネーム + ".jpg" と仮定
      const imagePath = `/images/${m.nickname}.jpg`; 
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.number}</td>
        <td>${m.nickname}</td>
        <td>${m.position}</td>
        <td><img src="${imagePath}" class="member-img" alt="${m.nickname}"></td>
      `;
      tbody.appendChild(tr);
    });
  } catch(err){
    console.error("メンバー取得エラー:", err);
  }
}


// 登録フォーム送信
// ... (registerFormの処理はそのまま) ...
document.getElementById("registerForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const number = e.target.number.value;
  const nickname = e.target.nickname.value;
  const position = e.target.position.value;
  const file = document.getElementById("fileInput").files[0];

  if (!file) {
    alert("画像ファイルを選択してください。");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async function(){
    const base64Data = reader.result.split(",")[1];
    const formData = new FormData();
    formData.append("action", "register"); // 💡 GASに登録処理を要求
    formData.append("number", number);
    formData.append("nickname", nickname);
    formData.append("position", position);
    formData.append("fileData", base64Data);
    formData.append("fileName", file.name);
    formData.append("fileType", file.type); 

    try{
      const res = await fetch(API_URL, {method:"POST", body:formData});
      const text = await res.text();
      alert(text);
      e.target.reset();
      showPage('members');
      loadMembers();
    } catch(err){
      alert("登録エラー: "+err);
    }
  };
  reader.readAsDataURL(file);
});

// 初回起動時: ログイン画面を表示し、メンバー一覧を裏で取得
document.addEventListener("DOMContentLoaded", () => {
  showPage('login'); // 💡 初期表示をログイン画面に変更
  loadMembers();
});
