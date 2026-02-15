# MikuMikuWorld Web Editor

iPad や其他デバイスで使用できる、MikuMikuWorld の Web ベース版エディタです。GitHub Pages でホスト可能で、ブラウザさえあれば使用できます。

## 機能

### ✅ 実装済み機能
- 📝 SUS ファイルのインポート・エクスポート
- 🎼 譜面の表示と編集（Canvas ベース）
- ♪ ノーツの追加・削除
- ⚙️ メタデータ編集（タイトル、アーティスト、難易度など）
- ▶️ 再生機能
- 📱 タッチデバイス対応（iPad など）
- 🔄 Undo/Redo 機能
- 💾 自動保存（ローカルストレージ）
- 🌐 オフライン対応（Service Worker）

### 🔜 今後実装予定
- 複数のノーツタイプ（スライド、ホールドなど）
- プリセット管理
- 譜面のプレビュー
- モバイルチューニング
- 複数言語対応

## 使い方

### ローカルでの実行

```bash
# リポジトリをクローン
git clone https://github.com/crash5band/MikuMikuWorld.git
cd MikuMikuWorld/docs

# サーバーを起動（Python）
python -m http.server 8000

# または Node.js の http-server
npx http-user 8000
```

その後、ブラウザで `http://localhost:8000` にアクセスしてください。

### iPad での使用

1. iPhone/iPad の Safari で `http://localhost:8000` にアクセス（同じ Wi-Fi ネットワークが必要）
2. または GitHub Pages にデプロイしたものを使用

## キーボード操作

| キー | 操作 |
|------|------|
| Click | ノーツを追加 |
| Space | 再生/一時停止 |
| Ctrl+Z | 戻す |
| Ctrl+Y | やり直す |
| Ctrl+S | ダウンロード |
| Wheel | スクロール |
| Ctrl+Wheel | ズーム |
| Delete | ノーツ削除 |

## タッチ操作（iPad）

- **1本指タップ**: ノーツ追加
- **2本指スワイプ**: スクロール
- **2本指で広げる/つまむ**: ズーム

## ファイル構成

```
docs/
├── index.html              # メインページ
├── sw.js                   # Service Worker
├── css/
│   └── style.css          # スタイル
└── js/
    ├── susParser.js       # SUS ファイル解析
    ├── timelineRenderer.js # 譜面描画
    └── editor.js          # エディタロジック
```

## SUS ファイルフォーマット

SUS（Sliding Universal Score）は プロセカ（Project Sekai）用の譜面フォーマットです。

### 基本構造

```
#TITLE 曲名
#ARTIST アーティスト
#DESIGNER 譜面作成者
#DIFFICULTY 難易度
#PLAYLEVEL プレイレベル
#BPM BPM値

000:1234567890AB
001:1234567890AB
```

- 各行が 1 小節を表します
- 2文字目の 16 進数がレーン番号（0-B = 12 レーン）
- 数字・文字がノーツタイプを表します
  - `1-9`: タップ系
  - `A-F`: 特殊ノーツ

## トラブルシューティング

### 「サーバーが見つかりません」と表示される
- 同じ Wi-Fi ネットワークに接続していることを確認
- ファイアウォールでポートが開いていることを確認
- `localhost` の代わりに PC の IP アドレスを使用してください

### ファイルがアップロードできない
- SUS ファイルのみサポートしています
- ファイルサイズが大きすぎないか確認してください

### 編集内容が消えた
- ローカルストレージに自動保存されています
- ブラウザのキャッシュをクリアしない限り保持されます

## GitHub Pages へのデプロイ

```bash
# フォークしたリポジトリで Settings → Pages を開く
# Source を "master branch /docs folder" に設定
# https://your-username.github.io/MikuMikuWorld/ でアクセス可能
```

## ライセンス

このプロジェクトは [MIT License](../LICENSE) に従います。

## 参考資料

- [SUS Format Documentation](https://twitter.com/search?q=SUS%20format)
- [Project Sekai Official](https://pjsekai.com/)

---

**作成者**: Chat-GPT をベースした Web エディタ  
**最終更新**: 2026-02-15
