# 商業施設訪問記録（統合スタンプラリー）

イオンモール／ゆめタウンのスタンプラリーを統合し、今後も他の商業施設を
追加していけるように作り直したものです。

## 構成

```
index.html          トップページ（施設一覧 + SNS共有用まとめ画像）
rally.html          スタンプラリー画面（?facility=xxx で施設を切り替える汎用ページ）
facilities.json     施設ごとの設定（テーマカラー・CSVパス・保存キーなど）
data/
  aeon.csv          イオンモールの店舗データ
  yumetown.csv      ゆめタウンの店舗データ
assets/
  common.css        共通スタイル
  rally.js          rally.html のロジック
  index.js          index.html のロジック
```

これまで `<script>` の中に直書きしていた店舗一覧は、すべて `data/*.csv` に
分離しました。CSVは `id,region,name` の3列だけのシンプルな形式です。

- `id` … 店舗を一意に識別する番号（重複不可）
- `region` … 都道府県・地方名。`facilities.json` の `regionOrder` の順番で表示されます
- `name` … 表示名。2行で表示したい場合は文字列中に `\n`（バックスラッシュ+n）と
  書いてください（例: `MOZO\n wondercity`）。実際の改行はCSVが崩れる原因になるため
  使わないでください。

## 施設を1つ追加する手順

コードを直接編集する必要はありません。

1. `data/新しい施設.csv` を作り、`id,region,name` の形式でデータを入れる
2. `facilities.json` に以下の形式で1項目追加する

```json
{
  "id": "shintoshiki",
  "name": "新しい施設名",
  "fullName": "新しい施設名\nスタンプラリー",
  "csv": "data/shintoshiki.csv",
  "storageKey": "shintoshiki_data",
  "themeColor": "#3366cc",
  "regionOrder": ["地方A", "地方B"]
}
```

- `storageKey` は他の施設と重複しないユニークな文字列にしてください（各利用者の
  達成状況はブラウザのlocalStorageに、このキーで保存されます）
- `regionOrder` は空配列 `[]` でも動作します（その場合CSVに出てくる順番で表示）

3. 保存してデプロイすれば、トップページに自動的にカードが増え、
   `rally.html?facility=shintoshiki` でアクセスできるようになります。

## 注意：ホスティングについて

このサイトはCSV/JSONを `fetch()` で読み込む構成のため、**GitHub Pagesなど
HTTP(S)経由で配信する必要があります**。`index.html` をブラウザで直接
ダブルクリックして開く（`file://`）と、ブラウザのセキュリティ制限により
CSVが読み込めずエラーになります。ローカルで確認したい場合は、簡易サーバーを
使ってください。

```bash
# プロジェクトフォルダ内で
python3 -m http.server 8000
# → http://localhost:8000/ にアクセス
```

## 既存データ（達成状況）の引き継ぎについて

以前の `index.html`（ゆめタウン）は `localStorage` のキー `youme_data`、
`aeonindex.html`（イオン）は `aeon_v3_data` を使っていました。
`facilities.json` の `storageKey` にも同じ値を設定してあるので、
**同じドメインで公開を続ける限り、これまでの達成状況（チェック済みの店舗）は
そのまま引き継がれます。**

ドメインやパスが変わると、ブラウザ側のlocalStorageは別物として扱われるため
達成状況は引き継がれません（これはブラウザの仕様であり、サイト側の作りを
変えても回避はできません）。

## SNS共有用まとめ画像について

トップページ下部に「まとめ画像を保存する」ボタンがあり、全施設合算の達成率と
施設ごとの内訳をまとめた画像（PNG）を1枚生成できます。既存の各施設ページの
「結果を画像で保存する」ボタン（施設単体の画像）とは別物です。
