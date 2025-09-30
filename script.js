// ログイン処理
document.getElementById("loginForm").addEventListener("submit", async function(e){
  e.preventDefault();
  const id = e.target.login_nickname.value;
  const pw = e.target.login_number.value;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: id, number: pw })
    });

    const text = await res.text();
    console.log("レスポンス:", text);

    let data = {};
    try { data = JSON.parse(text); } 
    catch { 
      document.getElementById("loginMessage").textContent = "サーバーから不正なレスポンス"; 
      return; 
    }

    if(data.success){
      document.getElementById("login").classList.remove("active");
      document.getElementById("home").classList.add("active");
      document.getElementById("hamburger").style.display = "block";
      document.getElementById("loginMessage").textContent = "";
      document.getElementById("menuRegister").style.display = "none"; // 全員 user
      localStorage.setItem("loggedIn","true");
      localStorage.setItem("role","user");
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
    document.getElementById("menuRegister").style.display = "none"; // 全員 user
  }
});
