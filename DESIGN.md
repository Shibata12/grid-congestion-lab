# DESIGN.md — 系統混雑ラボ（Grid Congestion Lab）設計書

本設計書は、学習サイト「系統混雑ラボ」をClaude Codeで対話的に構築するための仕様書である。Claude Codeはこの設計書を参照し、編集者との対話を通じて段階的にサイトを実装する。

---

## 第1章 プロジェクト概要

### 1.1 目的

電力系統における系統混雑の知識と実践力を、Webブラウザ上で完結する形で習得するための学習サイトを構築する。知識の読解と演習による確認を一体化し、外部ツールやAPIに依存せず、サイト内で学習サイクルが完結する設計とする。

本サイトは、既存のHTML知識ベース（12ファイル・A〜F構成）を置き換える新版として位置づける。旧ファイルは新プロジェクトには含めない。

### 1.2 対象ユーザー・前提知識

- **対象**: 電力系統の業務に関わるシステムエンジニアで、系統混雑の領域知識を体系的に習得したい人
- **前提知識**: 高校物理レベルの電気の基礎（オームの法則、キルヒホッフの法則の概念的理解）は既知とする。交流回路特有の概念（インピーダンス、有効電力/無効電力等）は領域Aで解説する

### 1.3 制約条件

- **機密性**: 特定企業・プロジェクトの非公開情報（内部仕様書、画面設計、データ項目名、内部ロジック等）は一切含めない。ただし、Web上で一般公開されている企業情報・プロジェクト情報（OCCTO公開資料、METI公表資料、送配電事業者の公開ルール等）は参照・引用してよい。
- **API不使用**: 演習の正誤判定・フィードバックはすべてクライアントサイドのJavaScriptで完結する
- **オフライン動作**: `file://`で直接開いてもGitHub Pagesで公開しても同一に動作する。外部CDN（Google Fonts等）は利用可能だが、読み込めなくても機能は壊れない設計とする
- **ビルド不要**: npm/webpack等のビルドツールを使用しない。vanilla HTML/CSS/JSのみ

### 1.4 プロジェクト名

- リポジトリ名: `grid-congestion-lab`
- サイト表示名: 系統混雑ラボ（Grid Congestion Lab）

---

## 第2章 技術要件

### 2.1 技術スタック

| 区分 | 採用技術 | 備考 |
|---|---|---|
| マークアップ | HTML5 | セマンティックタグ（`article`, `section`, `nav`, `details`等）を積極的に使用 |
| スタイル | CSS3 | CSS変数（カスタムプロパティ）でテーマ管理。Sass等のプリプロセッサは使用しない |
| スクリプト | JavaScript（ES6+） | クラシックスクリプト（`<script defer>`）で読み込み、共通機能は名前空間 `window.GCL` で共有する。フレームワーク不使用 |
| 図表 | SVGインライン、またはCSS描画 | 系統図や回路図はSVGで作成。外部画像ファイル（.png等）は必要最小限とする |
| 数式表示 | KaTeX（CDN読み込み） | 潮流計算やPTDFの数式表示に使用。読み込めない場合はプレーンテキストでフォールバック |

> **補足（スクリプト方式について）**: 当初は ES Modules（`type="module"`）の採用を想定していたが、Chrome は `file://` 上の `type="module"` スクリプトを CORS 制約で読み込めず、2.3／2.5／11.1 が要求する「`file://` で直接開いても動作する」が成立しない。`file://` でのオフライン動作を優先し、共通JS（`common.js` / `exercise-engine.js`）はクラシックスクリプト（`<script defer>`）として読み込み、関数・データは `window.GCL` 名前空間で共有する方式に変更した（Phase 1 にて決定）。これにより GitHub Pages・ローカルサーバ・`file://` 直接オープンのすべてで同一に動作する。

### 2.2 対応ブラウザ

以下のブラウザの最新2バージョンを対象とする:

- Google Chrome
- Mozilla Firefox
- Safari（macOS / iOS）
- Microsoft Edge

Internet Explorerは対象外とする。ES6+構文（アロー関数、テンプレートリテラル、分割代入等）をトランスパイルなしで使用する。

### 2.3 デプロイ

- **公開先**: GitHub Pages（リポジトリの`main`ブランチ直接、または`/docs`フォルダから配信）
- **ドメイン**: 初期は`https://<username>.github.io/grid-congestion-lab/`。カスタムドメインは将来必要に応じて設定
- **デプロイ手順**: `git push`のみ。CI/CDパイプラインやビルドステップは不要

### 2.4 外部依存ポリシー

外部CDNから読み込むライブラリは以下に限定する。いずれも「読み込めなくても機能が壊れない」設計とする。

| ライブラリ | 用途 | フォールバック |
|---|---|---|
| Google Fonts | 日本語Webフォント | OSのデフォルトフォント（`system-ui`）で代替 |
| KaTeX | 数式レンダリング | プレーンテキスト表示（`data-fallback`属性に平文数式を記述） |

上記以外の外部ライブラリを追加する場合は、設計書を更新してからClaude Codeに指示すること。

### 2.5 パフォーマンス目標

- 各ページの初期HTMLファイルサイズ: 200KB以下（画像除く）
- ページ読み込み後、演習UIが操作可能になるまで: 3秒以内（一般的なブロードバンド環境）
- オフライン（`file://`）でも全演習が動作すること（KaTeX以外）

---

## 第3章 ディレクトリ構成

### 3.1 全体構成

```
grid-congestion-lab/
│
├── DESIGN.md                        # 本設計書（Claude Code参照用）
├── index.html                       # サイトトップページ
│
├── css/
│   └── style.css                    # 全ページ共通スタイル（CSS変数含む）
│
├── js/
│   ├── common.js                    # 共通機能（ナビゲーション生成、進捗管理）
│   └── exercise-engine.js           # 演習の判定・採点・フィードバック表示エンジン
│
├── units/
│   ├── a-grid-fundamentals/         # 領域A: 系統の基礎
│   │   ├── index.html               #   領域Aのトップページ（概要・目次）
│   │   ├── 01-kirchhoff.html        #   学習ユニット（知識 + 演習を含む）
│   │   ├── 02-power-flow-basics.html
│   │   └── ...
│   │
│   ├── b-congestion/                # 領域B: 系統混雑
│   │   ├── index.html
│   │   └── ...
│   │
│   ├── c-grid-model/                # 領域C: 系統モデル
│   ├── d-algorithms/                # 領域D: 混雑計算のアルゴリズム
│   ├── e-market/                    # 領域E: 電力市場
│   └── f-dispatch-system/           # 領域F: 中央給電指令所システム
│
├── glossary/
│   └── index.html                   # 用語集（全領域横断）
│
└── assets/
    ├── svg/                         # 系統図・回路図等のSVGファイル
    └── img/                         # その他画像（最小限）
```

### 3.2 命名規則

| 対象 | ルール | 例 |
|---|---|---|
| フォルダ名 | 英語・kebab-case（小文字ハイフン区切り） | `a-grid-fundamentals/` |
| 学習ユニットファイル | `連番-英語名.html` | `01-kirchhoff.html` |
| CSS/JSファイル | 役割を表す英語名 | `exercise-engine.js` |
| SVGファイル | 内容を表す英語名 | `three-bus-network.svg` |
| CSS変数 | `--カテゴリ-プロパティ` | `--color-primary`, `--font-size-body` |

旧知識ベースで起きていた「英語名と日本語名の混在」を防ぐため、ファイル名・フォルダ名はすべて英語で統一する。日本語はHTML内のコンテンツとしてのみ使用する。

### 3.3 テーマ追加時のルール

新しい学習ユニットを追加する際は、以下の手順に従う:

1. 該当する領域フォルダ（`units/X-xxx/`）内に、次の連番でHTMLファイルを作成する
2. ファイルは第6章で定義するページテンプレートに従う
3. 領域の`index.html`の目次に新ユニットへのリンクを追加する
4. 必要に応じて`glossary/index.html`に新出用語を追加する
5. 共通ナビゲーションの更新が必要な場合は`js/common.js`を修正する

### 3.4 パス規約

- すべてのリンク・参照は**相対パス**で記述する（`file://`とGitHub Pagesの両方で動作させるため）
- ルートからの絶対パス（`/css/style.css`）は使用しない
- 各ユニットHTMLからCSSやJSへの参照は`../../css/style.css`のように階層を遡る形とする

---

## 第4章 デザインシステム

### 4.1 デザインの方針

学習コンテンツとして長時間の読解に耐えることを最優先する。装飾よりも可読性、派手さよりも一貫性を重視する。ライトテーマ（白背景）を採用する。

### 4.2 カラーパレット

```css
:root {
  /* ベースカラー */
  --color-bg:           #ffffff;
  --color-bg-secondary: #f5f7fa;
  --color-text:         #1a1a2e;
  --color-text-light:   #4a5568;
  --color-border:       #e2e8f0;

  /* アクセントカラー */
  --color-primary:      #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #dbeafe;

  /* 演習フィードバック */
  --color-correct:      #16a34a;
  --color-correct-bg:   #f0fdf4;
  --color-incorrect:    #dc2626;
  --color-incorrect-bg: #fef2f2;
  --color-hint:         #d97706;
  --color-hint-bg:      #fffbeb;

  /* 領域別アクセント（A〜Fを色で識別） */
  --color-unit-a:       #3b82f6;    /* 青 */
  --color-unit-b:       #ef4444;    /* 赤 */
  --color-unit-c:       #8b5cf6;    /* 紫 */
  --color-unit-d:       #f59e0b;    /* 琥珀 */
  --color-unit-e:       #10b981;    /* 緑 */
  --color-unit-f:       #6366f1;    /* インディゴ */
}
```

### 4.3 タイポグラフィ

```css
:root {
  /* フォントファミリー */
  --font-body: 'Noto Sans JP', system-ui, sans-serif;
  --font-mono: 'Source Code Pro', monospace;

  /* フォントサイズ */
  --font-size-xs:   0.75rem;   /* 12px - 補足、注釈 */
  --font-size-sm:   0.875rem;  /* 14px - キャプション */
  --font-size-base: 1rem;      /* 16px - 本文 */
  --font-size-lg:   1.125rem;  /* 18px - リード文 */
  --font-size-h3:   1.25rem;   /* 20px */
  --font-size-h2:   1.5rem;    /* 24px */
  --font-size-h1:   1.875rem;  /* 30px */

  /* 行間 */
  --line-height-body:    1.8;  /* 日本語は広めが読みやすい */
  --line-height-heading: 1.4;

  /* 本文の最大幅 */
  --content-max-width: 48rem;  /* 768px */
}
```

### 4.4 スペーシング

```css
:root {
  --space-xs:  0.25rem;  /* 4px */
  --space-sm:  0.5rem;   /* 8px */
  --space-md:  1rem;     /* 16px */
  --space-lg:  1.5rem;   /* 24px */
  --space-xl:  2rem;     /* 32px */
  --space-2xl: 3rem;     /* 48px */
}
```

### 4.5 レスポンシブ対応

| ブレークポイント | 幅 | 対象 |
|---|---|---|
| モバイル | 〜639px | スマートフォン |
| タブレット | 640px〜1023px | タブレット・小型ノートPC |
| デスクトップ | 1024px〜 | 通常のPC |

基本はモバイルファースト（狭い画面を基準に書き、広い画面で調整）で設計する。

### 4.6 共通UIコンポーネント

Claude Codeが各ページで使用するHTMLパターンを以下に定義する。

**(a) ページヘッダー**

```html
<header class="site-header">
  <nav class="site-nav">
    <a href="../../index.html" class="site-title">系統混雑ラボ</a>
    <!-- ナビゲーションはjs/common.jsで動的生成 -->
  </nav>
</header>
```

**(b) パンくずリスト**

```html
<nav class="breadcrumb" aria-label="パンくずリスト">
  <a href="../../index.html">トップ</a> &gt;
  <a href="index.html">A: 系統の基礎</a> &gt;
  <span>キルヒホッフの法則</span>
</nav>
```

**(c) 知識セクション**

```html
<section class="knowledge-section">
  <h2>セクションタイトル</h2>
  <p>解説テキスト...</p>
  <figure class="diagram">
    <svg><!-- 系統図など --></svg>
    <figcaption>図1: 三母線系統の概略図</figcaption>
  </figure>
</section>
```

**(d) 演習ブロック**

```html
<section class="exercise" data-exercise-id="a-01-ex01">
  <h3>演習 1: キルヒホッフの電流則</h3>
  <div class="exercise-problem">
    <p>問題文...</p>
  </div>
  <div class="exercise-input">
    <!-- 入力UIは演習タイプにより異なる（第7章で定義） -->
  </div>
  <button class="btn-check">解答を確認</button>
  <div class="exercise-feedback" hidden>
    <!-- 正誤判定・解説がここに表示される -->
  </div>
</section>
```

**(e) 用語ツールチップ**

```html
<span class="term" data-term="ptdf">PTDF
  <span class="term-tooltip">Power Transfer Distribution Factor。ある注入点の出力変化が各送電線の潮流に与える影響の割合。</span>
</span>
```

---

## 第5章 サイト構造・ナビゲーション

### 5.1 サイトマップ

```
トップページ (index.html)
│
├── 領域A: 系統の基礎 (units/a-grid-fundamentals/index.html)
│   ├── A-01: ユニットページ
│   ├── A-02: ユニットページ
│   └── ...
│
├── 領域B: 系統混雑 (units/b-congestion/index.html)
│   └── ...
│
├── 領域C: 系統モデル (units/c-grid-model/index.html)
│   └── ...
│
├── 領域D: 混雑計算のアルゴリズム (units/d-algorithms/index.html)
│   └── ...
│
├── 領域E: 電力市場 (units/e-market/index.html)
│   └── ...
│
├── 領域F: 中央給電指令所システム (units/f-dispatch-system/index.html)
│   └── ...
│
└── 用語集 (glossary/index.html)
```

サイトの階層は最大3段（トップ → 領域トップ → ユニットページ）とする。これ以上深くしない。

### 5.2 各ページの役割

| ページ | 役割 |
|---|---|
| トップページ | サイト全体の入口。6領域の一覧を表示し、各領域の概要と学習進捗を俯瞰できる。「このサイトについて」の簡潔な説明を含む |
| 領域トップ | その領域に含まれるユニットの一覧を表示する。領域全体の概要、前提となる領域を明示する |
| ユニットページ | 1つの学習テーマの知識解説と演習を統合したページ。学習の実質的な本体 |
| 用語集 | 全領域を横断する用語辞典。アルファベット/五十音順で引ける |

### 5.3 ナビゲーション設計

**(a) グローバルナビゲーション（全ページ共通）**

ページ上部に固定表示する。内容は以下の通り:

- サイト名「系統混雑ラボ」（トップへのリンク）
- 領域A〜Fへのリンク（領域名を表示。モバイルではハンバーガーメニューに格納）
- 用語集へのリンク

`js/common.js`がDOM読み込み時に動的生成する。これにより、新しい領域やページを追加した際もナビゲーションの更新箇所が1ファイルに集約される。

**(b) パンくずリスト（トップページ以外）**

現在位置を示す。例: `トップ > A: 系統の基礎 > キルヒホッフの法則`

**(c) ページ内目次（ユニットページ）**

ユニットページは長くなるため、ページ上部にそのページ内のセクション一覧（アンカーリンク）を表示する。

**(d) 前後ナビゲーション（ユニットページ）**

ユニットページの末尾に「← 前のユニット」「次のユニット →」のリンクを表示する。同一領域内の連番順に遷移する。領域の最後のユニットでは「次の領域へ →」を表示する。

### 5.4 領域間の依存関係

A〜Fの間には前提知識としての依存関係がある。これをサイト上で明示する。

```
A（系統の基礎）
├──→ B（系統混雑） ──→ D（混雑計算のアルゴリズム）
└──→ C（系統モデル） ──→ D
                          ↑
E（電力市場） ──────────→ D

F（中給システム） ← A〜Eすべて
```

- A → B: 物理法則（A）を知らないと混雑の発生原因（B）が理解できない
- A → C: 系統モデル化にはAの物理的基礎が前提
- B → D: 混雑の定義・測定（B）が分からないとアルゴリズム（D）の目的が不明
- C → D: アルゴリズムは系統モデルのデータを入力として使う
- E → D: 市場で決まった計画値が演算のインプットになる
- F: A〜E全体の知識を統合して実システムを理解する

領域トップページに「この領域を学ぶ前に」として前提領域を表示する。ただし、強制的なロック（前提を終えないと開けない）は設けない。学習順序はあくまで推奨とする。

---

## 第6章 ページ型定義

本章では、サイトを構成する4種類のページそれぞれのHTML構造テンプレートを定義する。Claude Codeは新しいページを作成する際、該当するテンプレートに従う。

### 6.1 トップページ（`index.html`）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>系統混雑ラボ - Grid Congestion Lab</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <!-- common.jsが生成 -->
  </header>

  <main class="top-page">

    <!-- サイト紹介 -->
    <section class="site-intro">
      <h1>系統混雑ラボ</h1>
      <p>サイトの目的・概要を簡潔に（3〜5文程度）</p>
      <p>対象ユーザーと前提知識</p>
    </section>

    <!-- 領域一覧カード -->
    <section class="domain-overview">
      <h2>学習領域</h2>
      <div class="domain-cards">
        <!--
          A〜Fの各領域を1枚のカードで表示。
          カードには以下を含む:
          - 領域記号と名称（例: A - 系統の基礎）
          - 概要（1〜2文）
          - 含まれるユニット数
          - 学習進捗バー（第8章で定義）
          - 領域トップへのリンク
          - 領域別アクセントカラー（左ボーダーまたは上ボーダー）
        -->
      </div>
    </section>

    <!-- 依存関係の図 -->
    <section class="dependency-map">
      <h2>領域間の関係</h2>
      <!-- 第5章 5.4の依存関係をSVG図で表示 -->
    </section>

  </main>

  <footer class="site-footer">
    <p>&copy; 系統混雑ラボ</p>
  </footer>

  <script defer src="js/common.js"></script>
</body>
</html>
```

### 6.2 領域トップページ（`units/x-xxx/index.html`）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A: 系統の基礎 - 系統混雑ラボ</title>
  <link rel="stylesheet" href="../../css/style.css">
</head>
<body data-domain="a">
  <header class="site-header">
    <!-- common.jsが生成 -->
  </header>

  <main class="domain-top-page">

    <nav class="breadcrumb" aria-label="パンくずリスト">
      <a href="../../index.html">トップ</a> &gt;
      <span>A: 系統の基礎</span>
    </nav>

    <!-- 領域の概要 -->
    <section class="domain-intro">
      <h1>A: 系統の基礎</h1>
      <p>この領域で学ぶこと（3〜5文）</p>
    </section>

    <!-- 前提領域 -->
    <section class="prerequisites">
      <h2>この領域を学ぶ前に</h2>
      <!--
        前提となる領域がある場合: リンク付きで表示
        ない場合（Aのように最初の領域）: 「前提領域はありません」
      -->
    </section>

    <!-- ユニット一覧 -->
    <section class="unit-list">
      <h2>ユニット一覧</h2>
      <!--
        各ユニットを以下の情報とともにリスト表示:
        - 連番とタイトル
        - 概要（1文）
        - 完了状態（チェックマーク。第8章で定義）
        - ユニットページへのリンク
      -->
    </section>

  </main>

  <footer class="site-footer">
    <p>&copy; 系統混雑ラボ</p>
  </footer>

  <script defer src="../../js/common.js"></script>
</body>
</html>
```

### 6.3 ユニットページ（`units/x-xxx/NN-title.html`）

学習の本体となるページ。知識解説と演習を統合する。知識セクションがすべて終わった後に、まとめて演習セクションを配置する（末尾集約型）。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A-01: キルヒホッフの法則 - 系統混雑ラボ</title>
  <link rel="stylesheet" href="../../css/style.css">
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css"
        crossorigin="anonymous">
</head>
<body data-domain="a" data-unit="a-01">
  <header class="site-header">
    <!-- common.jsが生成 -->
  </header>

  <main class="unit-page">

    <nav class="breadcrumb" aria-label="パンくずリスト">
      <a href="../../index.html">トップ</a> &gt;
      <a href="index.html">A: 系統の基礎</a> &gt;
      <span>キルヒホッフの法則</span>
    </nav>

    <article>
      <h1>A-01: キルヒホッフの法則</h1>

      <!-- ページ内目次 -->
      <nav class="page-toc" aria-label="ページ内目次">
        <h2>目次</h2>
        <ol>
          <li><a href="#section-1">セクション1タイトル</a></li>
          <li><a href="#section-2">セクション2タイトル</a></li>
          <li><a href="#exercises">演習</a></li>
          <li><a href="#references">参考資料</a></li><!-- 参考資料がある場合 -->
        </ol>
      </nav>

      <!-- 知識セクション（1つ以上） -->
      <section class="knowledge-section" id="section-1">
        <h2>セクション1タイトル</h2>
        <p>解説テキスト...</p>
        <figure class="diagram">
          <svg><!-- 図 --></svg>
          <figcaption>図1: キャプション</figcaption>
        </figure>
        <!-- 数式の例（common.jsがdata-texをKaTeXでレンダリング。失敗時はdata-fallbackを表示） -->
        <div class="math-block"
             data-tex="\sum I_{in} = \sum I_{out}"
             data-fallback="ΣI_in = ΣI_out">
        </div>
      </section>

      <section class="knowledge-section" id="section-2">
        <h2>セクション2タイトル</h2>
        <p>解説テキスト...</p>
      </section>

      <!-- 演習セクション -->
      <section class="exercises-section" id="exercises">
        <h2>演習</h2>

        <!-- 演習ブロック（1つ以上。詳細は第7章） -->
        <div class="exercise" data-exercise-id="a-01-ex01" data-type="choice">
          <h3>演習 1: タイトル</h3>
          <div class="exercise-problem">
            <p>問題文...</p>
          </div>
          <div class="exercise-input">
            <!-- 第7章で定義する入力UI -->
          </div>
          <button class="btn-check">解答を確認</button>
          <div class="exercise-feedback" hidden>
            <!-- 正誤・解説表示エリア -->
          </div>
        </div>

      </section>

      <!-- 参考資料（公開資料を参照した場合に付ける。出典の明記とリンク集約） -->
      <section class="references" id="references" aria-label="参考資料">
        <h2>参考資料</h2>
        <p class="ref-note">本ユニットが参考にした公開資料（外部サイト）。</p>
        <ul>
          <li><a href="https://example.go.jp/..." target="_blank" rel="noopener noreferrer">資料名（発行元）</a></li>
        </ul>
      </section>
    </article>

    <!-- 前後ナビゲーション -->
    <nav class="unit-nav">
      <a href="前のユニット.html" class="unit-nav-prev">&larr; 前のユニット名</a>
      <a href="次のユニット.html" class="unit-nav-next">次のユニット名 &rarr;</a>
    </nav>

  </main>

  <footer class="site-footer">
    <p>&copy; 系統混雑ラボ</p>
  </footer>

  <script defer src="../../js/common.js"></script>
  <script defer src="../../js/exercise-engine.js"></script>
  <script defer
          src="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js"
          crossorigin="anonymous"></script>
</body>
</html>
```

**参考資料セクションの扱い（公開資料を参照したユニット）**

OCCTOや資源エネルギー庁等の公開資料を参照した場合は、次の2点をセットで行う:

1. **本文中で出典を自然に明記する** — 「この順序は資源エネルギー庁・OCCTOが『優先給電ルール』として公開している」のように、該当する知識セクションの文中で出典元（発行元・資料名）に触れ、末尾の参考資料へ誘導する。
2. **末尾に参考資料セクションを置く** — `<article>`内、演習セクションの後に`<section class="references" id="references">`を配置し、参照した公開資料へのリンクをまとめる。外部リンクは公的機関等の安定したURLを用い、`target="_blank" rel="noopener noreferrer"`を付ける。ページ内目次にも「参考資料」を追加する。

参照資料がないユニットでは、この参考資料セクションは省略してよい（その場合は目次の「参考資料」も載せない）。

### 6.4 用語集ページ（`glossary/index.html`）

```html
<!-- head, header, breadcrumb は他のページ型と同一パターン -->

<main class="glossary-page">
  <h1>用語集</h1>

  <!-- 絞り込み -->
  <div class="glossary-filter">
    <input type="text" id="glossary-search"
           placeholder="用語を検索..." aria-label="用語検索">
    <!-- 領域フィルタ -->
    <div class="glossary-domain-filter">
      <button data-filter="all" class="active">すべて</button>
      <button data-filter="a">A</button>
      <button data-filter="b">B</button>
      <button data-filter="c">C</button>
      <button data-filter="d">D</button>
      <button data-filter="e">E</button>
      <button data-filter="f">F</button>
    </div>
  </div>

  <!-- 用語リスト -->
  <dl class="glossary-list">
    <div class="glossary-entry" data-domain="a,d" id="term-ptdf">
      <dt>PTDF（Power Transfer Distribution Factor）</dt>
      <dd>
        <p>定義・説明文...</p>
        <p class="glossary-related">
          関連ユニット: <a href="../units/d-algorithms/02-ptdf.html">D-02</a>
        </p>
      </dd>
    </div>
    <!-- 用語ごとに繰り返し -->
  </dl>
</main>
```

### 6.5 全ページ共通のルール

- `<html lang="ja">` を必ず指定する
- `<body>` に `data-domain` 属性で所属領域を指定する（CSSでの領域別スタイリングに使用）
- CSSの読み込みパスは各ページの階層に応じた相対パスを使う
- KaTeXのCSSとJSはユニットページのみで読み込む（トップページや領域トップでは不要）
- `js/common.js`は全ページで `<script defer>` として読み込む。共通機能（`SITE_STRUCTURE`、進捗管理関数など）は `window.GCL` 名前空間で公開される
- `js/exercise-engine.js`はユニットページのみで `<script defer>` として読み込む。`common.js` の後ろに置き、`window.GCL` を参照する（読み込み順に依存するため順序を変えない）

---

## 第7章 演習エンジン仕様

### 7.1 概要

演習エンジン（`js/exercise-engine.js`）は、ユニットページ内の演習ブロックに対して以下の機能を提供する:

- ユーザーの入力を受け取る
- 正解データと照合して正誤を判定する
- フィードバック（正誤表示・解説）を表示する
- 演習の完了状態をlocalStorageに記録する（第8章で定義）

すべての処理はクライアントサイドのJavaScriptで完結する。外部通信は行わない。

### 7.2 演習タイプ一覧

| タイプID | 名称 | 用途の例 |
|---|---|---|
| `choice` | 選択式（単一） | 概念の理解確認。「N-1基準とは何か」 |
| `multi-choice` | 選択式（複数） | 該当するものをすべて選べ形式 |
| `numeric` | 数値入力 | 計算問題。「この送電線の潮流は何MW？」 |
| `fill-in` | テキスト穴埋め | 用語・キーワードの確認 |
| `ordering` | 並べ替え | 手順や因果関係の順序を問う |
| `matrix` | 行列・表入力 | PTDFマトリクスやアドミタンス行列の穴埋め |
| `diagram-label` | 図のラベル付け | 系統図の各要素に正しい名称や値を配置する |

### 7.3 各タイプの入力UI・判定ロジック・HTML構造

#### (a) choice（単一選択）

```html
<div class="exercise" data-exercise-id="a-01-ex01" data-type="choice">
  <h3>演習 1</h3>
  <div class="exercise-problem">
    <p>キルヒホッフの電流則（KCL）の正しい記述はどれか。</p>
  </div>
  <div class="exercise-input">
    <label class="choice-option">
      <input type="radio" name="a-01-ex01" value="1">
      <span>回路の任意の閉路において、電圧の総和はゼロである</span>
    </label>
    <label class="choice-option">
      <input type="radio" name="a-01-ex01" value="2">
      <span>任意の節点において、流入する電流の総和と流出する電流の総和は等しい</span>
    </label>
    <label class="choice-option">
      <input type="radio" name="a-01-ex01" value="3">
      <span>導体の抵抗は長さに比例し、断面積に反比例する</span>
    </label>
  </div>
  <button class="btn-check">解答を確認</button>
  <div class="exercise-feedback" hidden></div>
</div>
```

正解データの持ち方:

```html
<script type="application/json" class="answer-data">
{
  "exerciseId": "a-01-ex01",
  "type": "choice",
  "correct": "2",
  "explanation": "KCLは節点における電流保存則です。選択肢1はKVL（電圧則）、選択肢3はオームの法則の変形です。"
}
</script>
```

判定ロジック: 選択された`value`と`correct`の文字列一致。

#### (b) multi-choice（複数選択）

```html
<div class="exercise-input">
  <label class="choice-option">
    <input type="checkbox" name="b-01-ex01" value="1">
    <span>選択肢1</span>
  </label>
  <label class="choice-option">
    <input type="checkbox" name="b-01-ex01" value="2">
    <span>選択肢2</span>
  </label>
  <!-- ... -->
</div>
```

```json
{
  "exerciseId": "b-01-ex01",
  "type": "multi-choice",
  "correct": ["1", "3"],
  "explanation": "解説テキスト"
}
```

判定ロジック: チェックされた`value`の集合と`correct`配列が完全一致（順序不問）。

#### (c) numeric（数値入力）

```html
<div class="exercise-input">
  <label>
    送電線ABの潮流:
    <input type="number" class="numeric-input" step="any"> MW
  </label>
</div>
```

```json
{
  "exerciseId": "c-01-ex01",
  "type": "numeric",
  "correct": 150,
  "tolerance": 0.5,
  "unit": "MW",
  "explanation": "解説テキスト。計算過程: ..."
}
```

判定ロジック: `|ユーザー入力 - correct| ≤ tolerance` なら正解。`tolerance`は問題ごとに設定可能（デフォルト0）。

#### (d) fill-in（テキスト穴埋め）

```html
<div class="exercise-input">
  <p>
    発電事業者は
    <input type="text" class="fill-in-input" data-answer-key="1" placeholder="___">
    に所属し、
    <input type="text" class="fill-in-input" data-answer-key="2" placeholder="___">
    の計画値を提出する。
  </p>
</div>
```

```json
{
  "exerciseId": "e-01-ex01",
  "type": "fill-in",
  "correct": {
    "1": ["BG", "バランシンググループ", "ＢＧ"],
    "2": ["発電計画", "発電計画値"]
  },
  "explanation": "解説テキスト"
}
```

判定ロジック: 各穴に対して、ユーザー入力を正規化（前後空白除去、大文字小文字統一、全角半角統一）した上で、`correct`配列内のいずれかと一致するか判定する。

#### (e) ordering（並べ替え）

```html
<div class="exercise-input">
  <ul class="ordering-list" role="listbox">
    <li class="ordering-item" draggable="true" data-item-id="a">N-1制約違反を検出</li>
    <li class="ordering-item" draggable="true" data-item-id="b">再給電指令を発出</li>
    <li class="ordering-item" draggable="true" data-item-id="c">潮流計算を実行</li>
    <li class="ordering-item" draggable="true" data-item-id="d">発電計画値を取得</li>
  </ul>
</div>
```

```json
{
  "exerciseId": "d-01-ex01",
  "type": "ordering",
  "correct": ["d", "c", "a", "b"],
  "explanation": "解説テキスト"
}
```

判定ロジック: 並び順の配列が`correct`と完全一致。ドラッグ&ドロップに加え、上下ボタンでも操作可能にする（アクセシビリティ対応）。

#### (f) matrix（行列・表入力）

```html
<div class="exercise-input">
  <table class="matrix-input">
    <thead>
      <tr><th></th><th>線路1</th><th>線路2</th></tr>
    </thead>
    <tbody>
      <tr>
        <th>発電機A</th>
        <td><input type="number" step="any" data-row="0" data-col="0"></td>
        <td><input type="number" step="any" data-row="0" data-col="1"></td>
      </tr>
      <tr>
        <th>発電機B</th>
        <td><input type="number" step="any" data-row="1" data-col="0"></td>
        <td><input type="number" step="any" data-row="1" data-col="1"></td>
      </tr>
    </tbody>
  </table>
</div>
```

```json
{
  "exerciseId": "d-02-ex01",
  "type": "matrix",
  "correct": [[0.4, 0.6], [-0.3, 0.3]],
  "tolerance": 0.01,
  "explanation": "解説テキスト"
}
```

判定ロジック: 各セルに対してnumericと同じ許容誤差判定。全セル正解で正解。

#### (g) diagram-label（図のラベル付け）

```html
<div class="exercise-input">
  <div class="diagram-exercise">
    <svg class="diagram-base">
      <!-- 系統図のベース -->
    </svg>
    <div class="label-targets">
      <div class="drop-zone" data-slot="1" style="left: 120px; top: 80px;"></div>
      <div class="drop-zone" data-slot="2" style="left: 300px; top: 150px;"></div>
    </div>
    <div class="label-choices">
      <span class="draggable-label" data-label-id="a">母線A (150MW)</span>
      <span class="draggable-label" data-label-id="b">母線B (200MW)</span>
      <span class="draggable-label" data-label-id="c">変圧器T1</span>
    </div>
  </div>
</div>
```

```json
{
  "exerciseId": "c-01-ex01",
  "type": "diagram-label",
  "correct": {"1": "a", "2": "c"},
  "explanation": "解説テキスト"
}
```

判定ロジック: 各スロットに配置されたラベルIDが`correct`と一致。

### 7.4 フィードバック表示

解答確認ボタン押下後、以下を表示する:

| 判定 | 表示内容 |
|---|---|
| 正解 | 緑色の背景（`--color-correct-bg`） + 「正解」 + 解説テキスト |
| 不正解 | 赤色の背景（`--color-incorrect-bg`） + 「不正解」 + 正解の提示 + 解説テキスト |

フィードバック表示後の動作:

- 入力UIはロックする（変更不可にする）
- 「やり直す」ボタンを表示する。押すとフィードバックを非表示にし、入力をクリアして再挑戦可能にする

### 7.5 正解データの格納方針

正解データは各演習ブロックの直後に`<script type="application/json" class="answer-data">`として埋め込む。これにより:

- 1つのHTMLファイル内で問題と正解が完結する（外部JSONファイル不要）
- `type="application/json"`のためブラウザは自動実行しない
- `exercise-engine.js`が読み取って判定に使う

正解がHTMLソースから閲覧可能であることは許容する。本サイトは試験ではなく自学用であり、ソースを見て答えを確認すること自体も学習の一形態と見なす。

---

## 第8章 進捗管理

### 8.1 概要

学習進捗はブラウザのlocalStorageに保存する。サーバーやアカウントは不要。同じブラウザで再訪すれば進捗が維持される。

制約として以下を明示する:

- ブラウザのデータを消去すると進捗はリセットされる
- 異なるブラウザ・端末間で進捗は共有されない
- `file://`とGitHub Pages（`https://`）では別のlocalStorageになるため、進捗も別管理になる

### 8.2 保存データ構造

localStorageのキーは`gcl-progress`（grid-congestion-labの略）とし、値はJSON文字列で保存する。

```json
{
  "version": 1,
  "exercises": {
    "a-01-ex01": {
      "status": "correct",
      "lastAttempt": "2026-06-21T15:30:00"
    },
    "a-01-ex02": {
      "status": "incorrect",
      "lastAttempt": "2026-06-21T15:35:00"
    },
    "d-02-ex01": {
      "status": "correct",
      "lastAttempt": "2026-06-22T10:00:00"
    }
  }
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `version` | number | データ形式のバージョン。将来の形式変更時に移行処理を判定するため |
| `exercises` | object | 演習IDをキー、状態オブジェクトを値とする |
| `status` | string | `"correct"` または `"incorrect"`。未着手の演習はエントリ自体が存在しない |
| `lastAttempt` | string | 最後に解答した日時（ISO 8601形式） |

### 8.3 進捗の記録タイミング

- 「解答を確認」ボタンを押して判定が行われた時点でlocalStorageに保存する
- 「やり直す」ボタンを押した場合、該当演習のエントリを削除する（未着手に戻る。進捗バーは減る）
- ページ遷移やブラウザ閉じに伴う自動保存は行わない（明示的な判定操作のみがトリガー）

### 8.4 進捗の表示

**(a) トップページの領域カード**

各領域カードに進捗バーを表示する。

```
A: 系統の基礎
[████████░░░░] 4/6 完了
```

- 分母: その領域内の全演習数
- 分子: `status === "correct"`の演習数
- 不正解（`"incorrect"`）は完了にカウントしない

**(b) 領域トップページのユニット一覧**

各ユニットの横に完了状態アイコンを表示する。

| 状態 | 表示 |
|---|---|
| 全演習正解 | ✅ |
| 一部正解・一部未着手 | 🔶（進行中） |
| 全演習未着手 | 表示なし |

**(c) ユニットページ内**

各演習ブロックの上部に、前回の結果を小さく表示する。

```
前回: 正解（2026-06-21）
```

初回訪問（未着手）の場合は何も表示しない。

### 8.5 リセット機能

トップページのフッター付近に「学習進捗をリセット」ボタンを設置する。

- 押下時に確認ダイアログを表示する:「すべての学習進捗がリセットされます。この操作は取り消せません。よろしいですか？」
- 確認後、`gcl-progress`キーをlocalStorageから削除する
- ページをリロードして進捗表示を更新する

特定の領域やユニット単位での部分リセットは初期実装では提供しない。必要に応じて後から追加する。

### 8.6 演習数の算出方法

進捗バーの分母（全演習数）は、`js/common.js`内に定義する`SITE_STRUCTURE`オブジェクトから取得する。

```javascript
const SITE_STRUCTURE = {
  "a": {
    name: "系統の基礎",
    units: [
      { id: "a-01", title: "キルヒホッフの法則", exerciseCount: 3 },
      { id: "a-02", title: "潮流の基礎", exerciseCount: 2 },
    ]
  },
  "b": {
    name: "系統混雑",
    units: []
  },
  // ...
};
```

新しいユニットや演習を追加した際は、この`SITE_STRUCTURE`も更新する必要がある。第9章のチェックリストにこの手順を含める。

---

## 第9章 コンテンツ追加テンプレート

本章では、新しい学習ユニットを追加する際にClaude Codeと編集者が従うべき手順とチェックリストを定義する。

### 9.1 ユニット追加の全体フロー

```
Step 1: 対話で内容を決める
    ↓
Step 2: ファイルを作成する
    ↓
Step 3: サイト構成データを更新する
    ↓
Step 4: 動作確認する
```

### 9.2 Step 1: 対話で内容を決める

Claude Codeは以下の項目を編集者との対話で確定させてから実装に入る。1つでも未確定のまま実装を始めてはならない。

| # | 確認項目 | 例 |
|---|---|---|
| 1 | 所属領域（A〜F） | A: 系統の基礎 |
| 2 | ユニット番号とタイトル | A-03: インピーダンスと潮流の関係 |
| 3 | このユニットの学習目標（何ができるようになるか） | 「2母線系統でインピーダンスから潮流を計算できる」 |
| 4 | 知識セクションの構成（見出しの一覧） | §1 インピーダンスとは / §2 2母線系統の潮流計算 / §3 複数経路がある場合 |
| 5 | 演習の数と各演習の概要 | 演習1: 2母線の潮流計算（numeric） / 演習2: 3母線の潮流分配（matrix） |
| 6 | 前提ユニット（このユニットの前に学んでおくべきもの） | A-01, A-02 |
| 7 | 新出用語（用語集に追加すべき用語） | インピーダンス、リアクタンス、サセプタンス |

### 9.3 Step 2: ファイルを作成する

Claude Codeは第6章のユニットページテンプレート（6.3）に従ってHTMLファイルを作成する。知識セクションの解説文はClaude Codeが執筆し、編集者がレビュー・修正指示を出す。

ファイル作成時の具体的な作業:

**(a) ユニットHTMLファイルの作成**

- 配置先: `units/<領域フォルダ>/<連番>-<英語名>.html`
- テンプレートに従い、以下を記述する:
  - `<head>`内のtitle、CSS/JSの相対パス
  - `<body>`の`data-domain`と`data-unit`属性
  - パンくずリスト
  - ページ内目次
  - 知識セクション（Step 1で決めた構成に従う）
  - 演習ブロック（第7章の各タイプのHTML構造に従う）
  - 正解データ（`<script type="application/json">`）
  - 前後ナビゲーション

**(b) 図（SVG）の作成**

- 必要な系統図・回路図がある場合は`assets/svg/`に配置する
- ファイル名は内容を表す英語名（例: `two-bus-impedance.svg`）
- ユニットHTML内にインラインSVGとして埋め込んでもよい（小さな図の場合）

**(c) 用語集の更新**

- Step 1で特定した新出用語を`glossary/index.html`に追加する
- 各用語の`data-domain`属性に所属領域を設定する
- 関連ユニットへのリンクを含める

**(d) 領域トップページの更新**

- 該当領域の`index.html`のユニット一覧に新ユニットへのリンクを追加する

**(e) 前後ナビゲーションの更新**

- 追加したユニットの前のユニットがある場合、そのユニットの「次のユニット →」リンクを更新する

### 9.4 Step 3: サイト構成データを更新する

`js/common.js`内の`SITE_STRUCTURE`オブジェクトに新ユニットを追加する。

```javascript
// 追加前
"a": {
  name: "系統の基礎",
  units: [
    { id: "a-01", title: "キルヒホッフの法則", exerciseCount: 3 },
    { id: "a-02", title: "潮流の基礎", exerciseCount: 2 },
  ]
}

// 追加後
"a": {
  name: "系統の基礎",
  units: [
    { id: "a-01", title: "キルヒホッフの法則", exerciseCount: 3 },
    { id: "a-02", title: "潮流の基礎", exerciseCount: 2 },
    { id: "a-03", title: "インピーダンスと潮流の関係", exerciseCount: 2 },  // 追加
  ]
}
```

### 9.5 Step 4: 動作確認する

Claude Codeは実装後、編集者に以下の確認を依頼する:

| # | 確認項目 |
|---|---|
| 1 | ブラウザでファイルを開き、レイアウトが崩れていないか |
| 2 | すべての演習で「解答を確認」が正しく動作するか（正解・不正解の両パターン） |
| 3 | 「やり直す」ボタンで入力がクリアされ、再挑戦できるか |
| 4 | パンくずリスト・前後ナビゲーションのリンクが正しいか |
| 5 | トップページ・領域トップページに新ユニットが反映されているか |
| 6 | 進捗バーが正しくカウントされているか |
| 7 | KaTeXの数式が正しく表示されているか（数式がある場合） |

### 9.6 チェックリスト（まとめ）

ユニット追加時にClaude Codeが漏れなく実行すべき作業の一覧:

```
□ 対話でユニット内容を確定（9.2の7項目すべて）
□ ユニットHTMLファイルを作成
□ 必要なSVGファイルを作成・配置
□ 用語集に新出用語を追加
□ 領域トップページのユニット一覧を更新
□ 前ユニットの「次へ」リンクを更新
□ SITE_STRUCTUREを更新（common.js）
□ 編集者に動作確認を依頼
```

---

## 第10章 対話的開発プロトコル

本章では、Claude Codeが編集者と対話しながら開発を進める際のルール・手順・姿勢を定義する。

### 10.1 基本原則

**(a) 段階的に作る**

サイト全体を一度に作ろうとしない。以下の順序で段階的に構築する:

```
Phase 1: 骨格構築
  サイトの共通基盤を作る
  - css/style.css（デザインシステム全体）
  - js/common.js（ナビゲーション、SITE_STRUCTURE、進捗表示）
  - js/exercise-engine.js（全演習タイプの判定ロジック）
  - index.html（トップページ）
  - 領域A〜Fのindex.html（中身は空のテンプレート）
  - glossary/index.html（空の用語集）
  - サンプルユニット（A-01: キルヒホッフの法則）を1つ作成し、
    演習エンジンの動作確認に使う（少なくとも3種類の演習タイプを含む）

Phase 2〜: ユニット追加（繰り返し）
  第9章の手順に従い、1ユニットずつ追加する
  編集者との対話でユニット内容を決め、実装し、確認を受ける
```

Phase 1の完了を編集者に確認してからPhase 2に進む。Phase 2は編集者が「次はこのユニットを作りたい」と指定するのを待つ。Claude Codeから勝手に次のユニットを作り始めない。

**(b) 確認してから進む**

以下のタイミングで必ず編集者の確認を取る:

| タイミング | 確認内容 |
|---|---|
| Phase 1完了時 | 骨格全体の見た目と動作 |
| ユニット内容の確定時（9.2） | 7項目すべてが合意されているか |
| ユニット実装完了時（9.5） | 動作確認チェックリスト |
| 設計書に記載のない判断が必要な時 | 判断内容と選択肢を提示して選んでもらう |

確認を取らずに次の作業に進んではならない。

**(c) 設計書を守る**

本設計書に記載されたテンプレート、命名規則、ディレクトリ構成、コンポーネントパターンに従う。設計書と矛盾する実装をしてはならない。

設計書に記載のない事項（例: 特定のCSSアニメーション、想定外の演習パターン）については、編集者に確認してから実装する。

**(d) 変更は設計書に反映する**

開発の過程で設計書の内容を変更する必要が生じた場合（例: 新しい演習タイプの追加、ディレクトリ構成の変更）、実装と合わせてDESIGN.mdも更新する。設計書と実装の乖離を放置しない。

### 10.2 対話の進め方

**(a) ユニット追加時の対話フロー**

```
Claude Code: 「次にどのユニットを作りますか？」
    ↓
編集者: テーマを指定（例:「Aの最初のユニット、キルヒホッフの法則」）
    ↓
Claude Code: 第9章 9.2の7項目を順に確認
    ↓
編集者: 各項目に回答・修正
    ↓
Claude Code: 確定内容を要約し、合意を確認
    ↓
編集者: 「OK」
    ↓
Claude Code: ファイルを作成（9.3〜9.4）
    ↓
Claude Code: 動作確認を依頼（9.5）
    ↓
編集者: 確認結果をフィードバック
    ↓
Claude Code: 修正があれば対応、なければ完了
```

**(b) 1回の作業単位**

Claude Codeが1回の対話ターンで行う作業は、原則として以下のいずれか1つとする:

- Phase 1の骨格構築（初回のみ、まとめて作成してよい）
- 1ユニットの実装
- 既存ユニットの修正・改善
- 用語集の更新
- バグ修正

複数ユニットを1ターンで作らない。

**(c) 不明点がある場合**

Claude Codeが判断に迷う場合は、自己判断せずに編集者に選択肢を提示する。その際、以下の形式で提示する:

```
[判断が必要です]
〇〇について、以下の選択肢があります:
(a) △△する — メリット: ... / デメリット: ...
(b) □□する — メリット: ... / デメリット: ...
どちらにしますか？
```

### 10.3 品質に関する指針

**(a) 解説テキストの品質基準**

Claude Codeが知識セクションの解説文を書く際のルール:

- **正確性**: 電力系統工学として正確な記述をする。不確実な場合はその旨を明記して編集者に確認する
- **具体性**: 抽象的な説明にとどめず、必ず具体的な数値例や図を伴う（例: 「潮流はインピーダンスに反比例する」→ 2母線の具体的な計算例を添える）
- **簡潔性**: 1セクションは画面2〜3スクロール以内に収める。長くなる場合はセクションを分割する

**(b) 演習の品質基準**

- 各ユニットに最低2問の演習を含める
- 演習はそのユニットの学習目標に直結する内容とする（学習目標で「計算できる」と言っているなら計算問題を含める）
- 正解の解説には必ず「なぜその答えになるか」の根拠を含める
- 数値問題では現実的なスケール感の値を使う（例: 送電線の潮流であれば数十〜数百MW）

**(c) 図（SVG）の品質基準**

- 系統図は統一された記号を使う（母線=太い横線、発電機=丸にG、負荷=矢印など）
- 色は第4章のCSS変数を参照する
- テキストはSVG内の`<text>`要素で記述する（画像化しない）
- レスポンシブ対応のため`viewBox`を設定し、固定width/heightは使わない

### 10.4 やってはいけないこと

| 禁止事項 | 理由 |
|---|---|
| 編集者の指示なしにユニットを追加する | 学習順序は編集者が決める |
| 設計書にない外部ライブラリを勝手に導入する | 第2章の外部依存ポリシーに違反する |
| CSSやJSの共通ファイルの構造を大幅に変更する | Phase 1で確立した骨格を壊す可能性がある |
| 演習の正解データを省略する | 演習エンジンが動作しなくなる |
| 1ターンで複数ユニットを作る | レビューが追いつかない |
| 動作確認の依頼を省略する | 不具合の蓄積を防ぐ |

---

## 第11章 品質基準・完了定義

本章では、各成果物が「完了」とみなされる条件を定義する。Claude Codeはこの基準を満たすまで作業を完了としない。

### 11.1 Phase 1（骨格構築）の完了条件

```
□ css/style.css が作成され、第4章のCSS変数がすべて定義されている
□ js/common.js が作成され、以下が動作する:
    □ グローバルナビゲーションが全ページで表示される
    □ SITE_STRUCTUREが定義されている
    □ 進捗バーがトップページに表示される（データなし時は0/0）
□ js/exercise-engine.js が作成され、第7章の全7タイプの判定ロジックが実装されている
□ index.html（トップページ）が表示される
    □ サイト紹介セクションがある
    □ 領域A〜Fのカードが表示される
    □ 依存関係の図が表示される
□ 領域A〜Fの各index.htmlが作成されている（ユニット一覧は空でよい）
□ glossary/index.htmlが作成されている（用語は空でよい）
□ サンプルユニット（A-01）が作成され、以下が動作する:
    □ 知識セクションが表示される
    □ 少なくとも3種類の演習タイプが含まれ、正誤判定が動作する
    □ 「やり直す」で入力クリア・再挑戦ができる
    □ 進捗がlocalStorageに保存される
    □ トップページの進捗バーに反映される
□ file://で開いた場合とローカルサーバー経由の両方で動作する
□ モバイル表示でレイアウトが崩れない
□ KaTeXの数式が表示される（CDN接続時）
□ KaTeX読み込み失敗時にフォールバックテキストが表示される
```

### 11.2 ユニット追加の完了条件

第9章のチェックリスト（9.6）に加え、以下を満たすこと:

```
□ 第9章のチェックリスト全項目が完了している
□ 解説テキストに明らかな技術的誤りがない
□ すべての演習で正解・不正解の両パターンをテストし、正しく動作する
□ 数式がある場合、KaTeXで正しくレンダリングされる
□ 図（SVG）がある場合、モバイル幅でも読み取れるサイズで表示される
□ 新出用語が用語集に追加されている
□ 編集者が動作確認を完了し、OKを出している
```

### 11.3 サイト全体の完了条件

サイト全体として「公開可能」とみなす基準。すべてのユニットが揃う必要はない。

```
□ Phase 1の完了条件をすべて満たしている
□ 少なくとも1つの領域に2ユニット以上が存在する
□ トップページからすべてのページに到達できる（リンク切れがない）
□ 全ページでグローバルナビゲーションが正しく動作する
□ 全ページでパンくずリストが正しい階層を示している
□ 用語集の検索・フィルタが動作する
□ 進捗管理（保存・表示・リセット）が正しく動作する
□ GitHub Pagesにデプロイして正常に表示・動作する
```

### 11.4 継続的な品質管理

サイトは段階的に成長するため、以下のルールで品質を維持する:

- 新ユニット追加時に既存ページへの影響（リンク切れ、進捗カウントの不整合等）がないことを確認する
- 共通ファイル（CSS、JS）を修正した場合は、既存の全ユニットで表示崩れや動作不具合がないことを確認する
- 設計書（DESIGN.md）と実装の内容が一致していることを随時確認する。乖離が見つかった場合は設計書を更新する
