/* ============================================================
   系統混雑ラボ  共通機能（common.js）
   - SITE_STRUCTURE（サイト構成データ / 第8章 8.6）
   - グローバルナビゲーションの動的生成（第5章 5.3）
   - 学習進捗の保存・取得（localStorage / 第8章）
   - トップページ・領域トップページの動的レンダリング
   - 数式（KaTeX）のレンダリングとフォールバック
   exercise-engine.js からは window.GCL 経由で進捗関数を使う。
   ※ file:// 直接オープンを全ブラウザで動作させるため、ES Modules ではなく
     クラシックスクリプト＋名前空間（window.GCL）方式を採用（DESIGN.md 2.1）。
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     Google Analytics (gtag.js) — 全ページ共通で読み込む。
     file:// では計測しない（オフライン方針 / DESIGN 2.4）。
     ------------------------------------------------------------ */
  (function initAnalytics() {
    var GA_ID = 'G-VBZC8FEWJK';
    if (location.protocol === 'file:') return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  })();

/* ------------------------------------------------------------
   サイト構成データ（第8章 8.6）
   新ユニット追加時はこのオブジェクトを更新する（第9章 9.4）。
   - folder : 領域フォルダ名（units/ 直下）
   - summary: 領域・ユニットの概要（1〜2文）
   - units[].file: 領域フォルダ内のHTMLファイル名
   ------------------------------------------------------------ */
const SITE_STRUCTURE = {
  a: {
    name: '系統の基礎',
    folder: 'a-grid-fundamentals',
    summary: '電力系統を理解するための物理法則。オームの法則、キルヒホッフの法則、潮流の基礎を扱う。',
    units: [
      { id: 'a-01', title: 'オームの法則とキルヒホッフの法則', file: '01-kirchhoff.html', exerciseCount: 5,
        summary: 'オームの法則(V=R·I)と、キルヒホッフの電流則(KCL)・電圧則(KVL)を、系統解析の出発点として理解する。' },
      { id: 'a-02', title: '潮流計算の基礎', file: '02-power-flow-basics.html', exerciseCount: 3,
        summary: '母線への注入と、放射状・ループ系統での潮流の決まり方を学ぶ。発電計画値が潮流計算の入力になる。' },
      { id: 'a-03', title: 'インピーダンスとリアクタンス', file: '03-impedance-reactance.html', exerciseCount: 3,
        summary: '交流回路の視点から抵抗・リアクタンス・インピーダンスの関係を概念的に整理し、なぜ送電線でリアクタンスが支配的かを学ぶ。A-02の“電気的な距離”の裏付け。' },
    ],
  },
  b: {
    name: '系統混雑',
    folder: 'b-congestion',
    summary: '送電線の容量制約により電力を流しきれなくなる「混雑」とは何か、なぜ起きるのかを学ぶ。',
    units: [
      { id: 'b-01', title: '混雑の判定とN-1基準', file: '01-congestion-and-n1.html', exerciseCount: 3,
        summary: '潮流が送電容量を超えるかの判定と、単一設備故障を想定するN-1基準を学ぶ。' },
    ],
  },
  c: {
    name: '系統モデル',
    folder: 'c-grid-model',
    summary: '実際の系統を計算可能なモデル（母線・線路・アドミタンス）として表現する方法を学ぶ。',
    units: [
      { id: 'c-01', title: '母線・送電線・系統モデルの構造', file: '01-grid-model-structure.html', exerciseCount: 3,
        summary: '実系統を母線（節点）・送電線（枝）に抽象化し、送電線インピーダンスからアドミタンス行列（Yバス）を組み立てる考え方を学ぶ。D領域の入力になる。' },
      { id: 'c-02', title: '系統データと混雑計算のインプット', file: '02-system-data-and-inputs.html', exerciseCount: 3,
        summary: '系統構成計画・作業停止計画・需給計画が系統モデル（Yバス・注入）にどう反映されるかを学ぶ。N-1解析で1回線を落とした構成の作り方にも触れる。' },
      { id: 'c-03', title: '上位系統・下位系統と集約母線', file: '03-upper-lower-and-aggregated-bus.html', exerciseCount: 3,
        summary: '上位系統（基幹）と下位系統の階層構造、下位系統を1母線に集約する境界処理（注入＝発電合計−負荷合計、Yバス上の1母線）を学ぶ。計算量削減でSCUC/SCEDを現実的に解く。' },
    ],
  },
  d: {
    name: '混雑計算のアルゴリズム',
    folder: 'd-algorithms',
    summary: '潮流計算、PTDF、N-1基準、再給電など、混雑を解消するための演算手法を学ぶ。',
    units: [
      { id: 'd-01', title: 'PTDFと感度分析', file: '01-ptdf-sensitivity.html', exerciseCount: 3,
        summary: '注入変化が送電線潮流に与える割合(PTDF)と、混雑解消に向けた感度分析を学ぶ。' },
      { id: 'd-02', title: '再給電（リディスパッチ）', file: '02-redispatch.html', exerciseCount: 3,
        summary: 'PTDFを使い、需給を保ちながら複数の発電機の出力調整で混雑を解消する手順を学ぶ。' },
      { id: 'd-03', title: 'SCUC/SCEDの概要', file: '03-scuc-sced-overview.html', exerciseCount: 3,
        summary: '再給電を最適化問題として定式化する。目的関数（発電コスト最小）と制約（需給・潮流・出力上下限）、SCUCとSCEDの違い、二段階構成を学ぶ。' },
    ],
  },
  e: {
    name: '電力市場',
    folder: 'e-market',
    summary: '市場で決まる計画値が系統演算の入力になる。市場と系統運用の接点を学ぶ。',
    units: [
      { id: 'e-01', title: 'BGと発電計画値', file: '01-bg-and-generation-plan.html', exerciseCount: 3,
        summary: '計画値同時同量制度の下でのBGの役割と、発電計画値・インバランスの基礎を学ぶ。' },
      { id: 'e-02', title: '計画値同時同量', file: '02-simultaneous-balancing.html', exerciseCount: 3,
        summary: 'BG・発電計画値・インバランスがなぜそうなっているのかを、周波数維持や小売自由化など制度面から理解する。' },
      { id: 'e-03', title: '需給調整市場', file: '03-balancing-market.html', exerciseCount: 3,
        summary: '調整力を市場で調達・運用する仕組みと、再給電（混雑）との違い・関係を学ぶ。' },
      { id: 'e-04', title: '優先給電ルールと出力制御の優先順位', file: '04-priority-dispatch.html', exerciseCount: 3,
        summary: '供給過剰・系統制約時にどの電源から抑制するかの公開ルール（優先給電ルール）を、再給電の実運用基準として学ぶ。' },
      { id: 'e-05', title: 'ノンファーム型接続（コネクト&マネージ）', file: '05-non-firm-connection.html', exerciseCount: 3,
        summary: '送電線の空き容量問題と、混雑時に抑制される条件付き接続（ノンファーム型接続）を、優先給電ルールの中で位置づける。' },
    ],
  },
  f: {
    name: '中央給電指令所システム',
    folder: 'f-dispatch-system',
    summary: 'A〜Eの知識を統合し、実際の給電指令システムがどう動くかを俯瞰する。',
    units: [
      { id: 'f-01', title: '系統混雑管理の全体像', file: '01-congestion-management-overview.html', exerciseCount: 3,
        summary: '発電計画値→潮流計算→混雑判定→再給電という一連の流れを、運用の時間軸の中で俯瞰する。' },
      { id: 'f-02', title: '次期中給システムの機能構成', file: '02-next-gen-dispatch-system.html', exerciseCount: 3,
        summary: 'SCUC/SCED・混雑計算・状態推定など、次期中給システムの機能構成と、混雑計算が最適化の前処理として動く構造を公開資料に基づき概観する。' },
    ],
  },
};

/* 領域間の依存関係（第5章 5.4）。値は前提となる領域キーの配列。 */
const DOMAIN_PREREQUISITES = {
  a: [],
  b: ['a'],
  c: ['a'],
  d: ['b', 'c', 'e'],
  e: [],
  f: ['a', 'b', 'c', 'd', 'e'],
};

const DOMAIN_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];

/* 領域キー → CSS変数名（領域アクセント色） */
function domainColorVar(key) {
  return `var(--color-unit-${key})`;
}

/* ------------------------------------------------------------
   パス解決
   common.js はトップ(深さ0)・領域/ユニット(深さ2)・用語集(深さ1)から
   読み込まれる。各ページが持つ <link href=".../css/style.css"> を基準に
   サイトルートへの相対プレフィックスを求める（file:// でも動作する）。
   ------------------------------------------------------------ */
function rootPrefix() {
  const link = document.querySelector('link[rel="stylesheet"][href*="css/style.css"]');
  if (!link) return '';
  return link.getAttribute('href').replace(/css\/style\.css.*$/, '');
}

const ROOT = rootPrefix();

function urlTop() { return `${ROOT}index.html`; }
function urlDomain(key) { return `${ROOT}units/${SITE_STRUCTURE[key].folder}/index.html`; }
function urlUnit(key, file) { return `${ROOT}units/${SITE_STRUCTURE[key].folder}/${file}`; }
function urlGlossary() { return `${ROOT}glossary/index.html`; }

/* ============================================================
   進捗管理（第8章）  exercise-engine.js からも利用する
   ============================================================ */
const STORAGE_KEY = 'gcl-progress';
const PROGRESS_VERSION = 1;

/* localStorage が使えない環境（古い file:// 等）でも壊れないようにする */
function safeStorage() {
  try {
    const t = '__gcl_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

function getProgress() {
  const store = safeStorage();
  if (!store) return { version: PROGRESS_VERSION, exercises: {} };
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { version: PROGRESS_VERSION, exercises: {} };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.exercises) {
      return { version: PROGRESS_VERSION, exercises: {} };
    }
    return data;
  } catch (e) {
    return { version: PROGRESS_VERSION, exercises: {} };
  }
}

function writeProgress(data) {
  const store = safeStorage();
  if (!store) return;
  try { store.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* 容量超過等は無視 */ }
}

/** 演習の判定結果を保存する（第8章 8.3）。status: 'correct' | 'incorrect' */
function setExerciseStatus(exerciseId, status) {
  const data = getProgress();
  data.exercises[exerciseId] = { status, lastAttempt: new Date().toISOString() };
  writeProgress(data);
}

/** 演習の記録を削除する（「やり直す」で未着手に戻す / 第8章 8.3） */
function clearExerciseStatus(exerciseId) {
  const data = getProgress();
  if (data.exercises[exerciseId]) {
    delete data.exercises[exerciseId];
    writeProgress(data);
  }
}

/** 1演習の記録を取得する（未着手なら null） */
function getExerciseStatus(exerciseId) {
  return getProgress().exercises[exerciseId] || null;
}

/** すべての進捗を消去する（第8章 8.5） */
function resetAllProgress() {
  const store = safeStorage();
  if (store) {
    try { store.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
  }
}

/** 領域内の完了状況を集計する → { total, correct } */
function domainProgress(key) {
  const domain = SITE_STRUCTURE[key];
  const data = getProgress();
  let total = 0;
  let correct = 0;
  domain.units.forEach((unit) => {
    total += unit.exerciseCount || 0;
    for (let i = 1; i <= (unit.exerciseCount || 0); i += 1) {
      const id = `${unit.id}-ex${String(i).padStart(2, '0')}`;
      const rec = data.exercises[id];
      if (rec && rec.status === 'correct') correct += 1;
    }
  });
  return { total, correct };
}

/** ユニットの状態を返す（第8章 8.4b） → 'done' | 'progress' | 'none' */
function unitState(unit) {
  const data = getProgress();
  const count = unit.exerciseCount || 0;
  if (count === 0) return 'none';
  let correct = 0;
  for (let i = 1; i <= count; i += 1) {
    const id = `${unit.id}-ex${String(i).padStart(2, '0')}`;
    const rec = data.exercises[id];
    if (rec && rec.status === 'correct') correct += 1;
  }
  if (correct === count) return 'done';
  if (correct > 0) return 'progress';
  return 'none';
}

/* ============================================================
   グローバルナビゲーション（第5章 5.3a）
   ============================================================ */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style') node.setAttribute('style', v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function buildHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const currentDomain = document.body.dataset.domain || null;
  const isGlossary = document.body.dataset.page === 'glossary';

  const title = el('a', { class: 'site-title', href: urlTop() }, '系統混雑ラボ');

  const toggle = el('button', {
    class: 'nav-toggle',
    type: 'button',
    'aria-label': 'メニューを開閉',
    'aria-expanded': 'false',
  }, [el('span'), el('span'), el('span')]);

  const menu = el('ul', { class: 'nav-menu', id: 'global-nav-menu' });

  DOMAIN_KEYS.forEach((key) => {
    const d = SITE_STRUCTURE[key];
    const link = el('a', {
      href: urlDomain(key),
      dataset: { domain: key },
      style: `--dot-color:${domainColorVar(key)}`,
    }, `${key.toUpperCase()}: ${d.name}`);
    if (currentDomain === key) link.setAttribute('aria-current', 'page');
    menu.appendChild(el('li', {}, link));
  });
  const glossaryLink = el('a', { href: urlGlossary() }, '用語集');
  if (isGlossary) glossaryLink.setAttribute('aria-current', 'page');
  menu.appendChild(el('li', {}, glossaryLink));

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  // メニュー内リンクをクリックしたら閉じる（モバイル）
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  const nav = el('nav', { class: 'site-nav', 'aria-label': 'グローバルナビゲーション' }, [title, toggle, menu]);
  header.replaceChildren(nav);
}

/* ============================================================
   トップページのレンダリング（第6章 6.1）
   ============================================================ */
function renderTopPage() {
  const container = document.querySelector('.domain-cards');
  if (container) {
    container.replaceChildren(...DOMAIN_KEYS.map(renderDomainCard));
  }
  setupResetButton();
}

function renderDomainCard(key) {
  const d = SITE_STRUCTURE[key];
  const { total, correct } = domainProgress(key);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const fill = el('div', { class: 'progress-fill', style: `width:${pct}%` });
  const label = el('span', { class: 'progress-label' },
    total > 0 ? `${correct}/${total} 完了` : 'ユニット準備中');
  const progress = el('div', { class: 'progress', role: 'progressbar',
    'aria-valuenow': String(correct), 'aria-valuemin': '0', 'aria-valuemax': String(total) },
    [el('div', { class: 'progress-track' }, fill), label]);

  const head = el('div', { class: 'domain-card-head' }, [
    el('span', { class: 'domain-card-badge' }, key.toUpperCase()),
    el('span', { class: 'domain-card-title' }, d.name),
  ]);

  return el('a', {
    class: 'domain-card',
    href: urlDomain(key),
    style: `--card-color:${domainColorVar(key)}`,
  }, [
    head,
    el('p', { class: 'domain-card-summary' }, d.summary),
    el('p', { class: 'domain-card-summary' }, `ユニット数: ${d.units.length}`),
    progress,
  ]);
}

function setupResetButton() {
  const btn = document.querySelector('.btn-reset');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const ok = window.confirm('すべての学習進捗がリセットされます。この操作は取り消せません。よろしいですか？');
    if (!ok) return;
    resetAllProgress();
    window.location.reload();
  });
}

/* ============================================================
   領域トップページのレンダリング（第6章 6.2）
   body[data-domain] と .unit-list を持つページで動作する。
   ============================================================ */
function renderDomainTopPage() {
  const key = document.body.dataset.domain;
  if (!key || !SITE_STRUCTURE[key]) return;
  const listSection = document.querySelector('.unit-list');
  if (!listSection) return;

  const d = SITE_STRUCTURE[key];
  const ol = el('ol');

  if (d.units.length === 0) {
    listSection.appendChild(el('p', { class: 'unit-list-empty' },
      'この領域のユニットは準備中です。'));
    return;
  }

  d.units.forEach((unit, idx) => {
    const state = unitState(unit);
    const icon = state === 'done' ? '✅' : state === 'progress' ? '🔶' : '';
    const num = unit.id.toUpperCase();
    const titleLink = el('a', { href: urlUnit(key, unit.file) }, unit.title);
    ol.appendChild(el('li', { class: 'unit-item' }, [
      el('span', { class: 'unit-item-number' }, num),
      el('div', { class: 'unit-item-body' }, [
        el('div', { class: 'unit-item-title' }, titleLink),
        unit.summary ? el('p', { class: 'unit-item-summary' }, unit.summary) : null,
      ]),
      el('span', { class: 'unit-item-status', 'aria-label': state === 'done' ? '完了' : state === 'progress' ? '進行中' : '未着手' }, icon),
    ]));
  });
  listSection.appendChild(ol);
}

/* ============================================================
   数式（KaTeX）のレンダリング（第2章 2.4 / フォールバック対応）
   .math-block に data-tex（TeXソース）と data-fallback（平文）を持たせる。
   KaTeXが読み込めない場合は data-fallback を表示する。
   ============================================================ */
function renderMathBlock(node) {
  const tex = node.dataset.tex != null ? node.dataset.tex : node.textContent.trim();
  const display = !node.classList.contains('math-inline');
  try {
    window.katex.render(tex, node, { displayMode: display, throwOnError: false });
    node.classList.remove('is-fallback');
  } catch (e) {
    showMathFallback(node);
  }
}

function showMathFallback(node) {
  node.textContent = node.dataset.fallback || node.dataset.tex || '';
  node.classList.add('is-fallback');
}

function renderMath() {
  const blocks = document.querySelectorAll('.math-block, .math-inline');
  if (!blocks.length) return;
  if (window.katex) {
    blocks.forEach(renderMathBlock);
    return;
  }
  // この時点でKaTeX未読込: いったんフォールバックを描画し、
  // defer の KaTeX が読み終わる window 'load' で再描画を試みる。
  blocks.forEach(showMathFallback);
  window.addEventListener('load', () => {
    if (window.katex) blocks.forEach(renderMathBlock);
  }, { once: true });
}

/* ============================================================
   ユニットページ: 前回結果の表示（第8章 8.4c）
   ============================================================ */
function renderPrevResults() {
  document.querySelectorAll('.exercise[data-exercise-id]').forEach((ex) => {
    const id = ex.dataset.exerciseId;
    const rec = getExerciseStatus(id);
    if (!rec) return;
    const date = (rec.lastAttempt || '').slice(0, 10);
    const verdict = rec.status === 'correct' ? '正解' : '不正解';
    const note = el('p', {
      class: `exercise-prev-result is-${rec.status}`,
    }, `前回: ${verdict}（${date}）`);
    const problem = ex.querySelector('.exercise-problem') || ex.querySelector('h3');
    if (problem) problem.insertAdjacentElement('beforebegin', note);
  });
}

/* ============================================================
   用語集の検索・領域フィルタ（第6章 6.4）
   Phase 1 では用語ゼロだが、追加後にそのまま動作する。
   ============================================================ */
function setupGlossary() {
  const search = document.getElementById('glossary-search');
  const filterGroup = document.querySelector('.glossary-domain-filter');
  const list = document.querySelector('.glossary-list');
  if (!search || !list) return;

  const emptyMsg = document.querySelector('.glossary-empty');
  let activeDomain = 'all';

  const apply = () => {
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    list.querySelectorAll('.glossary-entry').forEach((entry) => {
      const domains = (entry.dataset.domain || '').split(',').map((s) => s.trim());
      const matchDomain = activeDomain === 'all' || domains.includes(activeDomain);
      const matchText = q === '' || entry.textContent.toLowerCase().includes(q);
      const show = matchDomain && matchText;
      entry.hidden = !show;
      if (show) visible += 1;
    });
    // 用語が存在し、かつ絞り込みで0件になったときだけ「該当なし」を表示する。
    // Phase 1 のように用語ゼロの場合は何も出さない。
    const total = list.querySelectorAll('.glossary-entry').length;
    if (emptyMsg) emptyMsg.hidden = !(total > 0 && visible === 0);
  };

  search.addEventListener('input', apply);
  if (filterGroup) {
    filterGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      activeDomain = btn.dataset.filter;
      filterGroup.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      apply();
    });
  }
  apply();
}

/* ============================================================
   初期化
   ============================================================ */
function init() {
  buildHeader();
  renderTopPage();         // .domain-cards があるときのみ動作
  renderDomainTopPage();   // .unit-list があるときのみ動作
  renderMath();            // .math-block があるときのみ動作
  renderPrevResults();     // .exercise があるときのみ動作
  setupGlossary();         // .glossary-list があるときのみ動作
}

  // 共通機能を名前空間で公開（exercise-engine.js などから参照する）
  window.GCL = {
    SITE_STRUCTURE,
    DOMAIN_PREREQUISITES,
    getProgress,
    setExerciseStatus,
    clearExerciseStatus,
    getExerciseStatus,
    resetAllProgress,
    domainProgress,
    unitState,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
