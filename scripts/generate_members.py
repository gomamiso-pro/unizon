import gspread
from google.oauth2.service_account import Credentials

# Google認証
scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
credentials = Credentials.from_service_account_file("credentials.json", scopes=scopes)
client = gspread.authorize(credentials)

# スプレッドシートを開く
SHEET_ID = "<<<スプレッドシートID>>>"
sheet = client.open_by_key(SHEET_ID).worksheet("member")
rows = sheet.get_all_records()

# HTML生成
html = """<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>メンバー一覧</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <h1>メンバー一覧</h1>
    <nav>
      <ul>
        <li><a href="index.html">ホーム</a></li>
        <li><a href="members.html">メンバー一覧</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <table>
      <thead>
        <tr>
          <th>背番号</th>
          <th>名前</th>
          <th>ポジション</th>
          <th>画像</th>
        </tr>
      </thead>
      <tbody>
"""

for row in rows:
    num = row["Number"]
    name = row["Name"]
    pos = row["Position"]
    img_url = f"https://drive.google.com/uc?id={row['ImageID']}"
    html += f"""
        <tr>
          <td>{num}</td>
          <td>{name}</td>
          <td>{pos}</td>
          <td><img src="{img_url}" alt="{num} {name}" width="100"></td>
        </tr>
    """

html += """
      </tbody>
    </table>
  </main>
  <footer>
    <p>&copy; 2025 My Team</p>
  </footer>
</body>
</html>
"""

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
