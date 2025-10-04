// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbyILwbwGU3LE2nYEcs4lx9FZ5Jkt-0emKiS38qD08QrmCeneUGag-tnTLFTXOnAzmL5/exec";

// ログイン状態を管理するための変数
let isLoggedIn = false;
// メンバーデータ全体を保持するグローバル変数 (編集時に必要)
let teamMembers = []; 


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
// メンバー一覧取得・表示
// ------------------------------------
async function loadMembers(){
    const api_url = API_URL;    
    
    try{
        const res = await fetch(api_url);
        const members = await res.json();
        const tbody = document.getElementById("memberTable");
        tbody.innerHTML = "";    
        
        const DEFAULT_IMAGE_PATH = 'images/member/00.png';

        if (Array.isArray(members)) {
            // メンバーデータをグローバル変数に保存
            teamMembers = members; 
            
            // ★★★ ソート処理（orderNoに基づく） ★★★
            members.sort((a, b) => {
                const aOrder = parseInt(a.orderNo, 10) || 0;
                const bOrder = parseInt(b.orderNo, 10) || 0;
                return aOrder - bOrder;
            });
            
            // メンバーデータをテーブルに展開
            members.forEach((m, i) => {
                const memberNumber = String(m.number || '00').trim();    
                
                // 画像パスの設定（PNG優先 -> JPGへフォールバック）
                const primaryImagePath = `images/member/${memberNumber}.png`;
                const secondaryImagePath = `images/member/${memberNumber}.jpg`;
                
                const tr = document.createElement("tr");
                // 🌟 修正: 編集のために背番号をデータ属性に保存 🌟
                tr.dataset.number = memberNumber;
                
                // 🌟 強化: ダブルクリック/ダブルタッチで編集画面へ移行 🌟
                tr.addEventListener('dblclick', () => loadEditForm(m));
                tr.addEventListener('touchend', (event) => {
                    // モバイルでのダブルタッチ判定 (500ms以内)
                    const now = new Date().getTime();
                    const lastTouch = tr.dataset.lastTouch || 0;
                    const delta = now - lastTouch;
                    if (delta > 20 && delta < 500) { 
                        event.preventDefault(); 
                        loadEditForm(m);
                    }
                    tr.dataset.lastTouch = now;
                });
                
                // 守備データを配列からスラッシュ区切りの文字列に変換
                const positionDisplay = Array.isArray(m.position) ? m.position.join(' / ') : m.position || '';

                tr.innerHTML = `
                    <td>${i + 1}</td>    
                    <td>
                        <img src="${primaryImagePath}"  
                            class="member-img"    
                            alt="${m.nickname || '画像'}"
                            // onerrorで、まずJPGを試し、失敗したらデフォルト画像に切り替える
                            onerror="this.onerror=null; this.src='${secondaryImagePath}'; this.onerror=function(){this.src='${DEFAULT_IMAGE_PATH}';};"
                            style="display: block; margin: 0 auto 5px;"    
                        >
                        <p style="text-align: center; margin: 0;">${m.nickname || ''}</p>
                    </td>
                    <td>${m.number || ''}</td>    
                    <td>${positionDisplay}</td>    
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


// ------------------------------------
// メンバー登録・編集フォーム処理
// ------------------------------------
document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const form = e.target;
    const originalNumber = form.elements.namedItem('originalNumber') ? form.elements.namedItem('originalNumber').value : '';
    
    // エラーメッセージ要素を取得または作成
    let messageElement = document.getElementById("registerMessage");
    if (!messageElement) {
        messageElement = document.createElement('p');
        messageElement.id = "registerMessage";
        messageElement.className = "error-message"; // CSSクラスを設定
        form.parentNode.appendChild(messageElement); // form-containerの外側（#register）に追加
    }
    
    messageElement.textContent = "処理中...";

    // 必須チェック（背番号とニックネームは必須と仮定）
    if (!form.number.value || !form.nickname.value) {
        messageElement.textContent = "エラー: 背番号とニックネームは必須です。";
        return;
    }
    
    // 🌟 修正: ポジションの複数選択値を取得 🌟
    const positions = Array.from(form.querySelectorAll('input[name="position"]:checked')).map(cb => cb.value);

    // 🌟 フォーム送信ロジックの分岐 🌟
    if (originalNumber) {
        // 編集モード
        await sendData(form, "update", originalNumber, positions, messageElement);
    } else {
        // 登録モード
        await sendData(form, "register", form.number.value, positions, messageElement);
    }
});


/**
 * 登録・更新のデータ送信処理ヘルパー関数
 */
async function sendData(form, action, numberToIdentify, positions, messageElement) {
    const formData = new FormData();
    formData.append("action", action);
    // 登録時は新規の背番号、更新時は元の背番号をGAS側に送る
    formData.append("numberToIdentify", numberToIdentify); 
    
    // フォームデータ
    formData.append("number", form.number.value); // 背番号 (更新時は元の値のまま送る)
    formData.append("nickname", form.nickname.value);
    // 🌟 修正: ポジションは配列をカンマ区切り文字列にして送信 🌟
    formData.append("position", positions.join(',')); 

    // ★画像関連の処理はHTMLからファイル入力が削除されたため、ここでは省略します★

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        const text = await res.text();
        
        let data = {};
        try { data = JSON.parse(text); }    
        catch { data = { status: "error", message: text || "サーバーから不正な応答がありました。" }; }

        if (data.status === "success") {
            messageElement.textContent = data.message || (action === "update" ? "更新成功！" : "登録成功！");
            resetRegisterForm(); // フォームをリセットし、登録モードに戻す
            navigate('members'); // メンバー一覧に遷移して再読み込み
        } else {
            messageElement.textContent = data.message || (action === "update" ? "更新に失敗しました。" : "登録に失敗しました。");
        }

    } catch (err) {
        messageElement.textContent = "通信エラーが発生しました。";
        console.error("fetchエラー:", err);
    }
}


/**
 * メンバー編集フォームにデータをロードし、画面を編集モードに切り替える
 */
function loadEditForm(member) {
    // 画面遷移
    navigate('register'); 
    
    // UIを編集モードに切り替え
    document.getElementById('registerTitle').textContent = 'メンバー編集';
    const form = document.getElementById('registerForm');
    form.querySelector('button[type="submit"]').textContent = '更新';
    
    // 🌟 隠しフィールドに元の背番号をセット (更新対象を特定するため) 🌟
    const originalNumberInput = document.getElementById('originalNumber');
    if (originalNumberInput) {
        originalNumberInput.value = member.number;
    }
    
    // フォームにデータを設定
    form.elements.namedItem('number').value = member.number;
    form.elements.namedItem('nickname').value = member.nickname;
    
    // 背番号は主キーのため、編集時には変更できないように無効化
    form.elements.namedItem('number').disabled = true; 
    
    // ポジションのチェックボックスを設定
    // 守備データが文字列または配列であることを考慮
    const memberPositions = Array.isArray(member.position) ? member.position : (member.position ? member.position.split(',').map(p => p.trim()) : []);

    const checkboxes = form.querySelectorAll('input[name="position"]');
    checkboxes.forEach(checkbox => {
        // 全てのチェックを一旦解除
        checkbox.checked = false;
        
        // メンバーのポジションに含まれているものにチェックを入れる
        if (memberPositions.includes(checkbox.value)) {
            checkbox.checked = true;
        }
    });
}

/**
 * フォームを初期状態（メンバー登録モード）に戻す
 */
function resetRegisterForm() {
    const form = document.getElementById('registerForm');
    form.reset();
    document.getElementById('registerTitle').textContent = 'メンバー登録';
    form.querySelector('button[type="submit"]').textContent = '登録';
    form.elements.namedItem('number').disabled = false; // 背番号の無効化を解除
    
    const originalNumberInput = document.getElementById('originalNumber');
    if (originalNumberInput) {
        originalNumberInput.value = ''; // 隠しフィールドをリセット
    }
    
    const messageElement = document.getElementById("registerMessage");
    if (messageElement) {
        messageElement.textContent = '';
    }
}


// ------------------------------------
// ページ切り替え・メニュー操作
// ------------------------------------
function navigate(page){
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(page).classList.add("active");
    
    if (page === 'members') {
        loadMembers();
    }
    if (page === 'register') {
        // 登録画面へ遷移する場合は、フォームをリセットして登録モードにする
        resetRegisterForm(); 
    }
    
    // ページ遷移時にもメニューを閉じる
    closeMenu();    
}

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
    localStorage.removeItem("role"); // roleもあればクリア
}

// ページロード時にログイン状態確認
window.addEventListener("load", () => {
    if(localStorage.getItem("loggedIn") === "true"){
        // ログイン状態であれば、即座にUIを更新し、ホーム画面へ遷移
        document.getElementById("login").classList.remove("active");
        document.getElementById("home").classList.add("active");
        document.getElementById("hamburger").style.display = "block";
        document.getElementById("menuRegister").style.display = "block";
    }
});
