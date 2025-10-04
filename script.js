// ============================================
// UNIZON Softball Team - script.js (最終修正版 - kujibiki対応、関数重複解消)
// ============================================

// Google Apps Script のURL (★ こちらのURLを実際のGASのデプロイURLに置き換えてください)
const API_URL = "https://script.google.com/macros/s/AKfycbzROz8hBY31FZB0cECHPXF6DJlX2t8t3rOAHaOBAfWE3M4jYiyw6u3TWG3N0WxPbGFM/exec";

// ログイン状態を管理するための変数
let isLoggedIn = false;
// メンバーデータ全体を保持するグローバル変数 (編集時に必要)
let teamMembers = []; 
// dblclickがtouchend後に発生するのを防ぐフラグ
let touchHandled = false;


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
            
            document.getElementById("hamburger").style.display = "block"; 
            document.getElementById("menuRegister").style.display = "block"; 
            
            navigate("home"); 
            localStorage.setItem("loggedIn", "true"); 
            
        } else {
            messageElement.textContent = data.message || "ログインIDまたは背番号が違います。";
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
            teamMembers = members;    
            
            // ソート処理（orderNoに基づく）
            members.sort((a, b) => {
                const aOrder = parseInt(a.orderNo, 10) || 0;
                const bOrder = parseInt(b.orderNo, 10) || 0;
                return aOrder - bOrder;
            });
            
            // メンバーデータをテーブルに展開
            members.forEach((m, i) => {
                const memberNumber = String(m.number || '00').trim();    
                
                // 画像パスの設定（ローカルファイル用）
                const primaryImagePath = `images/member/${memberNumber}.png`;
                const secondaryImagePath = `images/member/${memberNumber}.jpg`;
                
                const tr = document.createElement("tr");
                tr.dataset.number = memberNumber;

                // 1. タッチイベントの処理 (ダブルタップ判定)
                tr.addEventListener('touchend', (event) => {
                    touchHandled = true; 
                    
                    const now = new Date().getTime();
                    const lastTouch = tr.dataset.lastTouch || 0;
                    const delta = now - lastTouch;
                    
                    if (delta > 20 && delta < 500) {    
                        event.preventDefault();    
                        loadEditForm(m);
                    }
                    tr.dataset.lastTouch = now;
                    
                    setTimeout(() => { touchHandled = false; }, 1000); 
                });
                
                // 2. ダブルクリックイベントの処理 (タッチイベント後に発生するのを抑制)
                tr.addEventListener('dblclick', (event) => {
                    if (touchHandled) {
                        event.preventDefault(); 
                        return;
                    }
                    loadEditForm(m);
                });
                
                // 守備データを配列からスラッシュ区切りの文字列に変換
                const positionDisplay = Array.isArray(m.position) ? m.position.join(' / ') : m.position || '';

                // 画像URLの優先順位設定
                // m.image (GAS/外部URL) > primaryImagePath (.png)
                let initialImageUrl = m.image || primaryImagePath;
                
                // HTMLを生成し、一時的に追加
                tr.innerHTML = `
                    <td>${i + 1}</td>    
                    <td id="td-name-${memberNumber}">
                        <img src="${initialImageUrl}"  
                            class="member-img"      
                            alt="${m.nickname || '画像'}"
                            id="img-${memberNumber}"
                            style="display: block; margin: 0 auto 5px;"    
                        >
                        <p style="text-align: center; margin: 0;">${m.nickname || ''}</p>
                    </td>
                    <td>${m.number || ''}</td>    
                    <td>${positionDisplay}</td>    
                `;
                tbody.appendChild(tr);

                // --- 画像エラー処理をイベントリスナーとして設定する ---
                const imgElement = document.getElementById(`img-${memberNumber}`);
                if (imgElement) {
                    let errorCount = 0;
                    imgElement.addEventListener('error', function errorHandler() {
                        errorCount++;
                        
                        if (errorCount === 1) {
                            // 1回目エラー: .png (またはGAS URL) が失敗した場合
                            if (m.image && initialImageUrl === m.image) {
                                // 最初にGASのURLを試していて失敗した場合
                                this.src = primaryImagePath; // ローカルの.pngを試す
                                initialImageUrl = primaryImagePath; // 次のエラーカウント用に更新

                            } else {
                                // primaryImagePath (.png) が失敗した場合
                                this.src = secondaryImagePath; // ローカルの.jpgを試す
                                initialImageUrl = secondaryImagePath; // 次のエラーカウント用に更新
                            }
                            
                        } else if (errorCount === 2) {
                            // 2回目エラー: .png または .jpg が失敗した場合
                            // GAS URL -> .png -> .jpg のいずれかのパターンで、2回目の失敗
                             this.src = DEFAULT_IMAGE_PATH; // デフォルト画像に切り替える
                             
                        } else if (errorCount >= 3) {
                             // 3回目以降のエラー（デフォルト画像も失敗した場合など）は無視
                             this.onerror = null; 
                        }
                    });
                }
                // --------------------------------------------------------
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
    
    let messageElement = document.getElementById("registerMessage");
    if (!messageElement) {
        messageElement = document.createElement('p');
        messageElement.id = "registerMessage";
        messageElement.className = "error-message"; 
        form.parentNode.appendChild(messageElement); 
    }
    
    messageElement.textContent = "処理中...";

    if (!form.number.value || !form.nickname.value) {
        messageElement.textContent = "エラー: 背番号とニックネームは必須です。";
        return;
    }
    
    // ポジションの複数選択値を取得
    const positions = Array.from(form.querySelectorAll('input[name="position"]:checked')).map(cb => cb.value);

    // フォーム送信ロジックの分岐
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
    
    formData.append("number", form.number.value); 
    formData.append("nickname", form.nickname.value);
    // ポジションは配列をカンマ区切り文字列にして送信
    formData.append("position", positions.join(','));    

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
            resetRegisterForm(); 
            navigate('members'); 
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
    navigate('register');    
    
    document.getElementById('registerTitle').textContent = 'メンバー編集';
    const form = document.getElementById('registerForm');
    form.querySelector('button[type="submit"]').textContent = '更新';
    
    const originalNumberInput = document.getElementById('originalNumber');
    if (originalNumberInput) {
        originalNumberInput.value = member.number;
    }
    
    form.elements.namedItem('number').value = member.number;
    form.elements.namedItem('nickname').value = member.nickname;
    
    form.elements.namedItem('number').disabled = true;    
    
    // ポジションのチェックボックスを設定
    const memberPositions = Array.isArray(member.position) ? member.position : (member.position ? member.position.split(',').map(p => p.trim()) : []);

    const checkboxes = form.querySelectorAll('input[name="position"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        
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
    form.elements.namedItem('number').disabled = false; 
    
    const originalNumberInput = document.getElementById('originalNumber');
    if (originalNumberInput) {
        originalNumberInput.value = ''; 
    }
    
    const messageElement = document.getElementById("registerMessage");
    if (messageElement) {
        messageElement.textContent = '';
    }
}


// ------------------------------------
// ページ切り替え・メニュー操作
// ------------------------------------

/**
 * ページ遷移/切り替え関数
 */
function navigate(page){
    // 個別のHTMLファイルに遷移する場合
    if (page === 'kujibiki') {
        window.location.href = 'kujibiki.html';
        return;
    }
    
    // 単一ページ内のセクション遷移の場合
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const targetPage = document.getElementById(page);
    if (targetPage) {
        targetPage.classList.add("active");
    }

    if (page === 'members') {
        loadMembers();
    }
    if (page === 'register') {
        resetRegisterForm();    
    }
    
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
    localStorage.removeItem("role"); 
}

// ------------------------------------
// ★★★ QRコード表示機能（再生成ロジック追加版） ★★★
// ------------------------------------

let qrcodeInstance = null;
const QR_CODE_CONTAINER = document.getElementById('qrcode');
const QR_DISPLAY = document.getElementById('qrCodeDisplay');

// QRコードに埋め込むサイトURLを固定で指定
// URL: https://gomamiso-pro.github.io/unizon/
const SITE_URL = "https://gomamiso-pro.github.io/unizon/";

/**
 * サイトのURLをQRコードとして表示/非表示を切り替えます。
 */
function toggleQRCode() {
    closeMenu(); // メニューを閉じる

    // 表示する際にのみ、QRコードを確実に生成/再生成する
    if (QR_DISPLAY.style.display === 'none' || QR_DISPLAY.style.display === '') {
        
        // 【重要】既存のQRコードとコンテナをクリーンアップ
        if (qrcodeInstance) {
             // コンテナの内容をクリアしてリセット
             QR_CODE_CONTAINER.innerHTML = ''; 
             qrcodeInstance = null;
        }

        // ライブラリが読み込まれていることを確認し、QRコードを生成
        if (typeof QRCode !== 'undefined') {
            qrcodeInstance = new QRCode(QR_CODE_CONTAINER, {
                text: SITE_URL,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            console.log("QRコードを生成しました。URL:", SITE_URL);
        } else {
            console.error("エラー: QRコードライブラリ (qrcode.js) が読み込まれていません。index.htmlの<head>を確認してください。");
        }
        
        QR_DISPLAY.style.display = 'flex'; // 表示

    } else {
        // 非表示にする
        QR_DISPLAY.style.display = 'none';
    }
}
// ------------------------------------------

// ページロード時にログイン状態確認
window.addEventListener("load", () => {
    if(localStorage.getItem("loggedIn") === "true"){
        document.getElementById("login").classList.remove("active");
        document.getElementById("home").classList.add("active");
        document.getElementById("hamburger").style.display = "block";
        document.getElementById("menuRegister").style.display = "block";
    }
});
