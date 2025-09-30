// ログイン処理
document.getElementById("loginForm").addEventListener("submit", async function(e){
  e.preventDefault();
  const id = e.target.login_nickname.value;
  const pw = e.target.login_number.value;

  try {
    // GAS に認証リクエスト
    const res = await fetch(API_URL + "?action=login", {
      method: "POST",
      body: JSON.stringify({ nickname: id, number: pw }),
    });
    const data = await res.json();

    if(data.success){
      // ログイン成功
      document.getElementById("login").classList.remove("active");
      document.getElementById("home").classList.add("active");
      document.getElementById("hamburger").style.display = "block";
      document.getElementById("loginMessage").textContent = "";

      // 管理者なら「メンバー登録」表示
      if(data.role === "admin"){
        document.getElementById("menuRegister").style.display = "block";
      } else {
        document.getElementById("menuRegister").style.display = "none";
      }

      // ローカルにログイン状態を保持
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("role", data.role || "user");
    } else {
      document.getElementById("loginMessage").textContent = "ログインIDまたはパスワードが違います。";
    }
  } catch(err){
    document.getElementById("loginMessage").textContent = "通信エラーが発生しました。";
    console.error(err);
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

    if(localStorage.getItem("role") === "admin"){
      document.getElementById("menuRegister").style.display = "block";
    }
  }
});
