// ============================================
// UNIZON Softball Team - GAS 最終修正版 (編集機能対応)
// ============================================

// ★ 以下の定数をあなたの環境に合わせて変更してください！
const SPREADSHEET_ID = "1gfLm4brGVFpQBrSyIg9vpp9zAnvqyod-15FlQ1hbxX8"; 
const SHEET_NAME = "member"; 
const DRIVE_FOLDER_ID = "1nc6jpsP11egAAnx1BNnsP4vF0FhKxIpk"; // 画像保存先フォルダID

// スプレッドシートの列名を設定
const HEADER_NICKNAME = "nickname";
const HEADER_NUMBER = "number";
const HEADER_POSITION = "position";
const HEADER_IMAGE = "image"; 
const HEADER_ORDER_NO = "orderNo"; 

// ============================================
// ヘルパー関数
// ============================================
function createJsonResponse(data) {
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

/**
 * スプレッドシートのデータ全体とヘッダー、ターゲット列インデックスを取得
 */
function getSheetData() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return null;

    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    if (data.length === 0) return { sheet, data: [], headers: [], indices: {} };
    
    const headers = data.shift(); 
    
    const indices = {
        number: headers.indexOf(HEADER_NUMBER),
        nickname: headers.indexOf(HEADER_NICKNAME),
        position: headers.indexOf(HEADER_POSITION),
        image: headers.indexOf(HEADER_IMAGE),
        orderNo: headers.indexOf(HEADER_ORDER_NO)
    };
    
    if (indices.number === -1) {
        throw new Error("スプレッドシートに 'number' 列がありません。");
    }

    return { sheet, data, headers, indices };
}

// ============================================
// GETリクエスト（メンバー一覧取得）
// ============================================
function doGet(e) {
    try {
        const sheetDataResult = getSheetData();
        if (!sheetDataResult || !sheetDataResult.data) {
            return createJsonResponse([]);
        }
        
        const { data, headers } = sheetDataResult;

        const members = data.map(row => {
            const member = {};
            headers.forEach((header, i) => {
                const key = header.toLowerCase();
                const value = row[i];
                
                // position列はカンマ区切りの文字列を配列に変換してフロントに渡す
                if (key === HEADER_POSITION.toLowerCase() && typeof value === 'string' && value.trim()) {
                    member[key] = value.split(',').map(p => p.trim());
                } else {
                    member[key] = value;
                }
            });
            return member;
        });

        return createJsonResponse(members);
    } catch (e) {
        Logger.log("doGetエラー: " + e.message + " スタック: " + e.stack); 
        return createJsonResponse({ status: "error", message: "データ取得エラー: " + e.message });
    }
}

// ============================================
// POSTリクエスト（振り分け）
// ============================================
function doPost(e) {
    const action = e.parameter.action; 

    if (action === "login") {
        return handleLogin(e);
    } else if (action === "register" || action === "update") { 
        return handleRegisterOrUpdate(e, action);
    }

    return createJsonResponse({ status: "error", message: "無効なアクション" });
}

// ============================================
// ログイン認証処理
// ============================================
function handleLogin(e) {
    try {
        const sheetDataResult = getSheetData();
        if (!sheetDataResult) throw new Error("シートが見つかりません。");
        const { data, indices } = sheetDataResult;
        
        const inputNickname = String(e.parameter.nickname || '').trim();
        const inputNumber = String(e.parameter.number || '').trim();

        if (!inputNickname || !inputNumber) {
            return createJsonResponse({ status: "error", message: "IDとパスワードを入力してください" });
        }

        const isAuthenticated = data.some(row => 
            String(row[indices.nickname] || '').trim() === inputNickname && 
            String(row[indices.number] || '').trim() === inputNumber
        );

        if (isAuthenticated) {
            return createJsonResponse({ status: "success", message: "認証成功" });
        } else {
            return createJsonResponse({ status: "failure", message: "IDまたは背番号が間違っています" });
        }
    } catch (e) {
        Logger.log("handleLoginエラー: " + e.message + " スタック: " + e.stack);
        return createJsonResponse({ status: "error", message: "ログインエラー: " + e.message });
    }
}

// ============================================
// 登録/更新処理
// ============================================
function handleRegisterOrUpdate(e, action) {
    // 更新時に使用する元の背番号を取得
    const numberToIdentify = String(e.parameter.numberToIdentify || '').trim(); 
    
    // 登録/更新後の背番号
    const rawNumber = String(e.parameter.number || '').trim(); 
    const number = rawNumber.replace(/[^0-9]/g, ''); 

    const nickname = String(e.parameter.nickname || '').trim();
    // ポジションはカンマ区切り文字列としてそのまま受け取る
    const position = String(e.parameter.position || '').trim(); 
    
    // 画像関連のパラメータ（今回の最終版では使用しないが、ロジックは残す）
    const fileData = e.parameter.fileData || ''; 
    const fileName = e.parameter.fileName || '';
    const fileType = e.parameter.fileType || '';
    
    if (!number || !nickname) {
        return createJsonResponse({ status: "error", message: "背番号とニックネームは必須です。" });
    }

    let image = '';
    let targetRowIndex = -1;

    try {
        const sheetDataResult = getSheetData();
        if (!sheetDataResult) throw new Error("シートが見つかりません。");
        const { sheet, data, headers, indices } = sheetDataResult;

        // 検索キーを決定 (更新時は numberToIdentify、登録時は number)
        const searchNumber = action === 'update' ? numberToIdentify : number;
        const dataStartIndex = 1; 

        for (let i = 0; i < data.length; i++) {
            if (String(data[i][indices.number] || '').trim() === searchNumber) { 
                targetRowIndex = i + dataStartIndex + 1; // スプレッドシートの行番号 (1-based)
                if (indices.image !== -1) image = data[i][indices.image] || ''; 
                break;
            }
        }
        
        // --- 登録時の重複チェック ---
        if (action === 'register' && targetRowIndex !== -1) {
            return createJsonResponse({ status: "error", message: `背番号${number}は既に登録されています。編集する場合はメンバーリストから選択してください。` });
        }
        
        // --- 更新時の対象チェック ---
        if (action === 'update' && targetRowIndex === -1) {
            return createJsonResponse({ status: "error", message: `更新対象の背番号${numberToIdentify}が見つかりません。` });
        }

        // --- 画像ファイルの保存 (ロジックは維持) ---
        if (fileData) {
            if (!DRIVE_FOLDER_ID) throw new Error("DRIVE_FOLDER_IDが設定されていません。");

            const base64Data = fileData.split(',')[1]; 
            const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), fileType || 'image/png', fileName);

            let ext = '.png';
            if (fileType.includes('jpeg') || fileType.includes('jpg')) ext = '.jpg';
            else if (fileType.includes('gif')) ext = '.gif';
            const newFileName = `${number}${ext}`;

            const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
            const existingFiles = folder.getFilesByName(newFileName);
            while (existingFiles.hasNext()) existingFiles.next().setTrashed(true);

            const file = folder.createFile(blob.setName(newFileName));
            try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(err){ Logger.log("共有設定エラー: " + err); }

            image = `https://drive.google.com/uc?id=${file.getId()}`;
        }

        // --- スプレッドシート書き込み ---
        if (action === 'update') {
            // 更新処理
            const rowRange = sheet.getRange(targetRowIndex, 1, 1, headers.length);
            const rowValues = rowRange.getValues()[0];

            if (indices.nickname !== -1) rowValues[indices.nickname] = nickname;
            if (indices.position !== -1) rowValues[indices.position] = position; // カンマ区切り文字列をそのまま保存
            if (indices.image !== -1 && (fileData || image)) rowValues[indices.image] = image; 
            
            rowRange.setValues([rowValues]);

            return createJsonResponse({ status: "success", message: `${number}番 ${nickname}さんの情報を更新しました。` });

        } else {
            // 新規登録 (action === 'register')
            const newRow = new Array(headers.length).fill('');

            // orderNo 計算
            let nextOrderNo = 1;
            if (indices.orderNo !== -1) {
                const maxOrderNo = data.reduce((max, row) => {
                    const val = parseInt(row[indices.orderNo], 10);
                    return isNaN(val) ? max : Math.max(max, val);
                }, 0);
                nextOrderNo = maxOrderNo + 1;
                newRow[indices.orderNo] = nextOrderNo;
            }

            if (indices.number !== -1) newRow[indices.number] = number;
            if (indices.nickname !== -1) newRow[indices.nickname] = nickname;
            if (indices.position !== -1) newRow[indices.position] = position;
            if (indices.image !== -1) newRow[indices.image] = image;

            sheet.appendRow(newRow);

            return createJsonResponse({ status: "success", message: `${number}番 ${nickname}さんを新規登録しました。` });
        }

    } catch (err) {
        Logger.log("登録/更新エラー: " + err.message + " スタック: " + err.stack);
        return createJsonResponse({ status: "error", message: "登録/更新中に問題が発生しました: " + err.message });
    }
}
