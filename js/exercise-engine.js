/* ============================================================
   系統混雑ラボ  演習エンジン（exercise-engine.js）
   第7章 演習エンジン仕様に準拠。全7タイプの判定を実装する。
   choice / multi-choice / numeric / fill-in / ordering / matrix / diagram-label
   すべてクライアントサイドで完結（外部通信なし）。
   ※ common.js が公開する window.GCL を利用する（クラシックスクリプト方式 / DESIGN.md 2.1）。
   ============================================================ */

(function () {
  'use strict';

  const { setExerciseStatus, clearExerciseStatus, markReviewDone, urlReview } = window.GCL;

/* ------------------------------------------------------------
   ユーティリティ
   ------------------------------------------------------------ */
/** 文字列の正規化（fill-in用 / 第7章 7.3d）。
    前後空白除去・小文字化・全角英数→半角・空白除去。 */
function normalize(s) {
  return String(s)
    .trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** 数値が許容誤差内か */
function withinTolerance(value, correct, tolerance) {
  if (Number.isNaN(value)) return false;
  return Math.abs(value - correct) <= (tolerance || 0);
}

/** 正解データ（JSON）を取得する。第7章 7.5: 演習ブロックの直後に配置。
    互換のためブロック内に置かれていても読めるようにする。 */
function getAnswerData(ex) {
  let script = ex.querySelector('script.answer-data');
  if (!script) {
    const sib = ex.nextElementSibling;
    if (sib && sib.matches && sib.matches('script.answer-data')) script = sib;
  }
  if (!script) return null;
  try {
    return JSON.parse(script.textContent);
  } catch (e) {
    console.error('answer-data の JSON 解析に失敗しました:', ex.dataset.exerciseId, e);
    return null;
  }
}

function setEquals(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].map(String).sort();
  const sb = [...b].map(String).sort();
  return sa.every((v, i) => v === sb[i]);
}

/* ------------------------------------------------------------
   数字替えバリアント（第7章 7.6）
   numeric / matrix の演習は、問題文中の数字（span.var[data-var]）を
   差し替えた別バージョンを answer-data の variants に持てる。
   バリアント0 ＝ 素のHTML＋answer-dataの基本フィールド。
   ------------------------------------------------------------ */
const VARIANT_TYPES = ['numeric', 'matrix'];

/** 演習が持つバリアント数（バリアント0を含む） */
function variantCount(data) {
  return 1 + ((data.variants && data.variants.length) || 0);
}

/** root内の .var[data-var] の元テキスト（バリアント0の値）を保存する */
function saveVarOriginals(root) {
  root.querySelectorAll('.var[data-var]').forEach((node) => {
    if (node.dataset.orig === undefined) node.dataset.orig = node.textContent;
  });
}

/** root内の .var[data-var] を vars で差し替える（vars=null でバリアント0に戻す） */
function applyVars(root, vars) {
  root.querySelectorAll('.var[data-var]').forEach((node) => {
    if (!vars) {
      node.textContent = node.dataset.orig;
    } else if (vars[node.dataset.var] !== undefined) {
      node.textContent = vars[node.dataset.var];
    }
  });
}

/** 現在表示中のバリアント番号（DOMに保持。初期値0） */
function activeVariant(ex) {
  return parseInt(ex.dataset.activeVariant || '0', 10);
}

/** 演習にバリアントを適用する（数字差し替え＋「数字替え版」チップ）。
    skipVars=true はシナリオユニット用（数字はユニット側で一括差し替え済み）。 */
function setExerciseVariant(ex, data, idx, skipVars) {
  ex.dataset.activeVariant = String(idx);
  if (!skipVars) {
    applyVars(ex, idx === 0 ? null : (data.variants[idx - 1].vars || null));
  }
  const h3 = ex.querySelector('h3');
  let chip = ex.querySelector('.variant-chip');
  if (idx > 0) {
    if (!chip && h3) {
      chip = document.createElement('span');
      chip.className = 'variant-chip';
      chip.textContent = '数字替え版';
      h3.appendChild(chip);
    }
  } else if (chip) {
    chip.remove();
  }
}

/** 判定・解説に使う実効データ（表示中バリアントの correct/explanation 等を反映） */
function effectiveData(ex, data) {
  const idx = activeVariant(ex);
  if (idx === 0 || !data.variants || !data.variants[idx - 1]) return data;
  const v = data.variants[idx - 1];
  const eff = Object.assign({}, data);
  ['correct', 'tolerance', 'unit', 'explanation'].forEach((k) => {
    if (v[k] !== undefined) eff[k] = v[k];
  });
  return eff;
}

/** 0〜n-1 から current 以外をランダムに選ぶ（n>=2 前提） */
function pickOtherVariant(current, n) {
  let idx = Math.floor(Math.random() * (n - 1));
  if (idx >= current) idx += 1;
  return idx;
}

/* ------------------------------------------------------------
   シナリオ一括替え（第7章 7.6 総合演習用）
   script.scenario-data があるユニットでは、演習単位ではなく
   ユニット単位で数字セット（シナリオ）を切り替える。
   ------------------------------------------------------------ */
const scenario = { data: null, index: 0 };

function getScenarioData() {
  const script = document.querySelector('script.scenario-data');
  if (!script) return null;
  try {
    const data = JSON.parse(script.textContent);
    return data && Array.isArray(data.scenarios) && data.scenarios.length > 0 ? data : null;
  } catch (e) {
    console.error('scenario-data の JSON 解析に失敗しました:', e);
    return null;
  }
}

function setupScenario() {
  scenario.data = getScenarioData();
  if (!scenario.data) return;
  saveVarOriginals(document.body);
  const box = document.querySelector('.scenario-controls');
  if (!box) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-scenario';
  btn.textContent = '別の数字で解き直す';
  const label = document.createElement('span');
  label.className = 'scenario-label';
  updateScenarioLabel(label);
  btn.addEventListener('click', () => {
    applyScenario(pickOtherVariant(scenario.index, scenario.data.scenarios.length + 1));
    updateScenarioLabel(label);
  });
  box.append(btn, label);
}

function updateScenarioLabel(label) {
  label.textContent = scenario.index === 0
    ? '（いまの数字: 基本シナリオ）'
    : `（いまの数字: 数字替え版 ${scenario.index}）`;
}

/** シナリオを一括適用する: 全varを差し替え、全演習の入力・フィードバックをリセットする。
    保存済みの進捗は変更しない（新しく解答したときに上書きされる / 第7章 7.6）。 */
function applyScenario(idx) {
  scenario.index = idx;
  applyVars(document.body, idx === 0 ? null : (scenario.data.scenarios[idx - 1].vars || null));
  document.querySelectorAll('.exercise[data-exercise-id]').forEach((ex) => {
    const handler = types[ex.dataset.type];
    const data = getAnswerData(ex);
    if (!handler || !data) return;
    // 数字に依存しない演習（choice等）は variants 省略可（第7章 7.6）。数値系のみ警告する
    if (idx > 0 && VARIANT_TYPES.indexOf(ex.dataset.type) !== -1
        && (!data.variants || data.variants.length < idx)) {
      console.warn('シナリオに対応する variants がありません:', ex.dataset.exerciseId);
    }
    const fb = ex.querySelector('.exercise-feedback');
    if (fb) { fb.hidden = true; fb.replaceChildren(); fb.classList.remove('is-correct', 'is-incorrect'); }
    handler.reset(ex);
    ex.classList.remove('is-locked');
    const checkBtn = ex.querySelector('.btn-check');
    if (checkBtn) checkBtn.disabled = false;
    setExerciseVariant(ex, data, idx, true);
  });
}

/* ------------------------------------------------------------
   復習モード（第7章 7.7）
   ?review=1&ex=<演習ID> で開かれたら、該当演習を強調し
   バリアント／シナリオを替えて出題する。
   ------------------------------------------------------------ */
const reviewParams = new URLSearchParams(window.location.search);
const reviewTarget = reviewParams.get('review') === '1' ? reviewParams.get('ex') : null;

function reviewPageUrl() {
  return typeof urlReview === 'function' ? urlReview() : '../../review/index.html';
}

function setupReviewMode() {
  if (!reviewTarget) return;
  const ex = document.querySelector(`.exercise[data-exercise-id="${CSS.escape(reviewTarget)}"]`);
  if (!ex) return;

  /* 別の数字で出題する（バリアント／シナリオがある場合） */
  if (scenario.data) {
    applyScenario(1 + Math.floor(Math.random() * scenario.data.scenarios.length));
    const label = document.querySelector('.scenario-label');
    if (label) updateScenarioLabel(label);
  } else {
    const data = getAnswerData(ex);
    if (data && VARIANT_TYPES.indexOf(ex.dataset.type) !== -1 && variantCount(data) > 1) {
      setExerciseVariant(ex, data, 1 + Math.floor(Math.random() * (variantCount(data) - 1)));
    }
  }

  const banner = document.createElement('div');
  banner.className = 'review-banner';
  const p = document.createElement('p');
  p.textContent = '復習モード — この問題を解き直しましょう。数字が変わっている場合があります。';
  const back = document.createElement('a');
  back.href = reviewPageUrl();
  back.textContent = '← 復習ページへ戻る';
  banner.append(p, back);
  ex.insertAdjacentElement('beforebegin', banner);
  ex.classList.add('is-review-target');
  window.setTimeout(() => { ex.scrollIntoView({ block: 'start' }); }, 0);
}

/** 判定後のフィードバックに「復習ページへ戻る」リンクを付ける（復習モードの対象演習のみ） */
function appendReviewReturnLink(ex) {
  const fb = ex.querySelector('.exercise-feedback');
  if (!fb) return;
  const link = document.createElement('a');
  link.className = 'review-return';
  link.href = reviewPageUrl();
  link.textContent = '復習ページへ戻る →';
  fb.appendChild(link);
}

/* ------------------------------------------------------------
   各タイプの判定 + 正解表示
   それぞれ { judge(ex, data) -> bool, answerText(data, ex) -> string,
             highlight(ex, data), lock(ex), reset(ex) } を提供する。
   ------------------------------------------------------------ */

const types = {};

/* (a) choice：単一選択 */
types.choice = {
  judge(ex, data) {
    const sel = ex.querySelector('input[type="radio"]:checked');
    return sel != null && sel.value === String(data.correct);
  },
  answerText(data, ex) {
    return optionLabel(ex, data.correct);
  },
  highlight(ex, data) {
    ex.querySelectorAll('.choice-option').forEach((opt) => {
      const input = opt.querySelector('input');
      if (!input) return;
      if (input.value === String(data.correct)) opt.classList.add('is-answer');
      else if (input.checked) opt.classList.add('is-wrong-pick');
    });
  },
  lock(ex) { ex.querySelectorAll('input').forEach((i) => { i.disabled = true; }); },
  reset(ex) {
    ex.querySelectorAll('input').forEach((i) => { i.disabled = false; i.checked = false; });
    ex.querySelectorAll('.choice-option').forEach((o) => o.classList.remove('is-answer', 'is-wrong-pick'));
  },
};

/* (b) multi-choice：複数選択 */
types['multi-choice'] = {
  judge(ex, data) {
    const picked = [...ex.querySelectorAll('input[type="checkbox"]:checked')].map((i) => i.value);
    return setEquals(picked, data.correct);
  },
  answerText(data, ex) {
    return data.correct.map((v) => optionLabel(ex, v)).join(' / ');
  },
  highlight(ex, data) {
    const correct = data.correct.map(String);
    ex.querySelectorAll('.choice-option').forEach((opt) => {
      const input = opt.querySelector('input');
      if (!input) return;
      const isCorrect = correct.includes(input.value);
      if (isCorrect) opt.classList.add('is-answer');
      if (input.checked && !isCorrect) opt.classList.add('is-wrong-pick');
    });
  },
  lock(ex) { ex.querySelectorAll('input').forEach((i) => { i.disabled = true; }); },
  reset(ex) {
    ex.querySelectorAll('input').forEach((i) => { i.disabled = false; i.checked = false; });
    ex.querySelectorAll('.choice-option').forEach((o) => o.classList.remove('is-answer', 'is-wrong-pick'));
  },
};

/* (c) numeric：数値入力 */
types.numeric = {
  judge(ex, data) {
    const input = ex.querySelector('.numeric-input');
    if (!input || input.value.trim() === '') return false;
    return withinTolerance(parseFloat(input.value), Number(data.correct), data.tolerance);
  },
  answerText(data) {
    return `${data.correct}${data.unit ? ` ${data.unit}` : ''}`;
  },
  highlight() {},
  lock(ex) { ex.querySelectorAll('input').forEach((i) => { i.disabled = true; }); },
  reset(ex) { ex.querySelectorAll('input').forEach((i) => { i.disabled = false; i.value = ''; }); },
};

/* (d) fill-in：テキスト穴埋め */
types['fill-in'] = {
  judge(ex, data) {
    const inputs = ex.querySelectorAll('.fill-in-input');
    if (!inputs.length) return false;
    return [...inputs].every((input) => {
      const key = input.dataset.answerKey;
      const accepted = (data.correct[key] || []).map(normalize);
      return accepted.includes(normalize(input.value));
    });
  },
  answerText(data) {
    return Object.keys(data.correct)
      .map((k) => data.correct[k][0])
      .join(' / ');
  },
  highlight(ex, data) {
    ex.querySelectorAll('.fill-in-input').forEach((input) => {
      const accepted = (data.correct[input.dataset.answerKey] || []).map(normalize);
      input.style.borderColor = accepted.includes(normalize(input.value))
        ? 'var(--color-correct)' : 'var(--color-incorrect)';
    });
  },
  lock(ex) { ex.querySelectorAll('input').forEach((i) => { i.disabled = true; }); },
  reset(ex) {
    ex.querySelectorAll('input').forEach((i) => { i.disabled = false; i.value = ''; i.style.borderColor = ''; });
  },
};

/* (e) ordering：並べ替え */
types.ordering = {
  judge(ex, data) {
    return setEqualsOrdered(currentOrder(ex), data.correct);
  },
  answerText(data, ex) {
    return data.correct.map((id) => orderingItemText(ex, id)).join(' → ');
  },
  highlight() {},
  lock(ex) {
    ex.querySelectorAll('.ordering-item').forEach((li) => { li.draggable = false; });
    ex.querySelectorAll('.ordering-buttons button').forEach((b) => { b.disabled = true; });
  },
  reset(ex) {
    ex.querySelectorAll('.ordering-item').forEach((li) => { li.draggable = true; });
    ex.querySelectorAll('.ordering-buttons button').forEach((b) => { b.disabled = false; });
    refreshOrderingButtons(ex);
  },
};

/* (f) matrix：行列・表入力 */
types.matrix = {
  judge(ex, data) {
    const rows = data.correct.length;
    const cols = data.correct[0].length;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const input = ex.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
        if (!input || input.value.trim() === '') return false;
        if (!withinTolerance(parseFloat(input.value), Number(data.correct[r][c]), data.tolerance)) return false;
      }
    }
    return true;
  },
  answerText(data) {
    return data.correct.map((row) => `[${row.join(', ')}]`).join(' ');
  },
  highlight(ex, data) {
    data.correct.forEach((row, r) => {
      row.forEach((val, c) => {
        const input = ex.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
        if (!input) return;
        const ok = withinTolerance(parseFloat(input.value), Number(val), data.tolerance);
        input.closest('td').classList.add(ok ? 'is-answer' : 'is-wrong');
      });
    });
  },
  lock(ex) { ex.querySelectorAll('input').forEach((i) => { i.disabled = true; }); },
  reset(ex) {
    ex.querySelectorAll('input').forEach((i) => { i.disabled = false; i.value = ''; });
    ex.querySelectorAll('td').forEach((td) => td.classList.remove('is-answer', 'is-wrong'));
  },
};

/* (g) diagram-label：図のラベル付け */
types['diagram-label'] = {
  judge(ex, data) {
    const map = currentDiagramMap(ex);
    const slots = Object.keys(data.correct);
    return slots.every((slot) => map[slot] === data.correct[slot]);
  },
  answerText(data, ex) {
    return Object.keys(data.correct)
      .map((slot) => `スロット${slot} = ${labelText(ex, data.correct[slot])}`)
      .join(' / ');
  },
  highlight() {},
  lock(ex) {
    ex.querySelectorAll('.draggable-label').forEach((l) => {
      l.draggable = false; l.style.pointerEvents = 'none';
      l.setAttribute('tabindex', '-1'); l.setAttribute('aria-disabled', 'true');
    });
    ex.querySelectorAll('.drop-zone').forEach((z) => {
      z.style.pointerEvents = 'none';
      z.setAttribute('tabindex', '-1'); z.setAttribute('aria-disabled', 'true');
    });
  },
  reset(ex) { resetDiagram(ex); },
};

/* ------------------------------------------------------------
   choice / ordering / diagram の補助
   ------------------------------------------------------------ */
function optionLabel(ex, value) {
  const input = ex.querySelector(`input[value="${CSS.escape(String(value))}"]`);
  if (!input) return String(value);
  const span = input.closest('.choice-option').querySelector('span');
  return span ? span.textContent.trim() : String(value);
}

function currentOrder(ex) {
  return [...ex.querySelectorAll('.ordering-item')].map((li) => li.dataset.itemId);
}

function setEqualsOrdered(a, b) {
  return a.length === b.length && a.every((v, i) => String(v) === String(b[i]));
}

function orderingItemText(ex, id) {
  const li = ex.querySelector(`.ordering-item[data-item-id="${CSS.escape(id)}"]`);
  if (!li) return id;
  const label = li.querySelector('.ordering-label');
  return (label ? label.textContent : li.textContent).trim();
}

function currentDiagramMap(ex) {
  const map = {};
  ex.querySelectorAll('.drop-zone').forEach((z) => {
    const lbl = z.querySelector('.draggable-label');
    if (lbl) map[z.dataset.slot] = lbl.dataset.labelId;
  });
  return map;
}

function labelText(ex, labelId) {
  const lbl = ex.querySelector(`.draggable-label[data-label-id="${CSS.escape(labelId)}"]`);
  return lbl ? lbl.textContent.trim() : labelId;
}

/* ------------------------------------------------------------
   ordering の操作 UI（ドラッグ＆ドロップ ＋ 上下ボタン）
   設計 7.3e: アクセシビリティのため上下ボタンも提供する。
   ------------------------------------------------------------ */
function setupOrdering(ex) {
  const list = ex.querySelector('.ordering-list');
  if (!list) return;

  list.querySelectorAll('.ordering-item').forEach((li) => {
    // 既存の表示テキストを .ordering-label でラップし、ハンドルとボタンを付与
    if (!li.querySelector('.ordering-label')) {
      const label = document.createElement('span');
      label.className = 'ordering-label';
      label.append(...li.childNodes);
      const handle = document.createElement('span');
      handle.className = 'ordering-handle';
      handle.setAttribute('aria-hidden', 'true');
      handle.textContent = '⠿';
      const btns = document.createElement('span');
      btns.className = 'ordering-buttons';
      const up = document.createElement('button');
      up.type = 'button'; up.textContent = '▲'; up.setAttribute('aria-label', '上へ移動');
      const down = document.createElement('button');
      down.type = 'button'; down.textContent = '▼'; down.setAttribute('aria-label', '下へ移動');
      up.addEventListener('click', () => { if (li.previousElementSibling) { list.insertBefore(li, li.previousElementSibling); refreshOrderingButtons(ex); } });
      down.addEventListener('click', () => { if (li.nextElementSibling) { list.insertBefore(li.nextElementSibling, li); refreshOrderingButtons(ex); } });
      btns.append(up, down);
      li.replaceChildren(handle, label, btns);
    }
    li.setAttribute('draggable', 'true');

    li.addEventListener('dragstart', (e) => {
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      list.querySelectorAll('.drag-over').forEach((n) => n.classList.remove('drag-over'));
      refreshOrderingButtons(ex);
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = list.querySelector('.dragging');
      if (!dragging || dragging === li) return;
      const rect = li.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      list.insertBefore(dragging, after ? li.nextElementSibling : li);
    });
  });
  refreshOrderingButtons(ex);
}

function refreshOrderingButtons(ex) {
  const items = [...ex.querySelectorAll('.ordering-item')];
  items.forEach((li, i) => {
    const btns = li.querySelectorAll('.ordering-buttons button');
    if (btns.length === 2) {
      btns[0].disabled = i === 0;
      btns[1].disabled = i === items.length - 1;
    }
  });
}

/* ------------------------------------------------------------
   diagram-label の操作 UI
   （ドラッグ＆ドロップ ＋ クリック配置 ＋ キーボード操作）
   キーボード: Tabでラベル/配置先を移動し、Enter/Spaceで
   「ラベルを選択 → 配置先に置く」の2ステップで配置できる。
   ------------------------------------------------------------ */
function setupDiagram(ex) {
  const wrap = ex.querySelector('.diagram-exercise');
  if (!wrap) return;
  let selected = null;

  const select = (lbl) => {
    if (selected) {
      selected.classList.remove('is-selected');
      selected.setAttribute('aria-pressed', 'false');
    }
    selected = lbl;
    if (lbl) {
      lbl.classList.add('is-selected');
      lbl.setAttribute('aria-pressed', 'true');
    }
  };

  /* Enter / Space をクリックと同等に扱う（role=buttonのキーボード対応） */
  const onActionKey = (handler) => (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handler();
    }
  };

  ex.querySelectorAll('.draggable-label').forEach((lbl) => {
    lbl.setAttribute('draggable', 'true');
    lbl.setAttribute('role', 'button');
    lbl.setAttribute('tabindex', '0');
    lbl.setAttribute('aria-pressed', 'false');
    const toggle = () => select(selected === lbl ? null : lbl);
    lbl.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', lbl.dataset.labelId); select(lbl); });
    lbl.addEventListener('click', toggle);
    lbl.addEventListener('keydown', onActionKey(toggle));
  });

  ex.querySelectorAll('.drop-zone').forEach((zone) => {
    zone.setAttribute('role', 'button');
    zone.setAttribute('tabindex', '0');
    if (!zone.getAttribute('aria-label')) {
      zone.setAttribute('aria-label', `配置先 ${zone.dataset.slot}（選択中のラベルをここに置く）`);
    }
    const placeSelected = () => { if (selected) { placeLabel(zone, selected); select(null); } };
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const lbl = ex.querySelector(`.draggable-label[data-label-id="${CSS.escape(id)}"]`);
      placeLabel(zone, lbl);
    });
    zone.addEventListener('click', placeSelected);
    zone.addEventListener('keydown', onActionKey(placeSelected));
  });

  function placeLabel(zone, lbl) {
    if (!lbl) return;
    // 既にこのゾーンにあるラベルは選択肢へ戻す
    const existing = zone.querySelector('.draggable-label');
    const pool = ex.querySelector('.label-choices');
    if (existing) pool.appendChild(existing);
    existing && existing.classList.remove('is-used');
    zone.appendChild(lbl);
    zone.classList.add('filled');
    lbl.classList.add('is-used');
    lbl.classList.remove('is-selected');
  }
}

function resetDiagram(ex) {
  const pool = ex.querySelector('.label-choices');
  ex.querySelectorAll('.drop-zone .draggable-label').forEach((lbl) => {
    pool.appendChild(lbl);
    lbl.classList.remove('is-used', 'is-selected');
  });
  ex.querySelectorAll('.drop-zone').forEach((z) => {
    z.classList.remove('filled'); z.style.pointerEvents = '';
    z.setAttribute('tabindex', '0'); z.removeAttribute('aria-disabled');
  });
  ex.querySelectorAll('.draggable-label').forEach((l) => {
    l.draggable = true; l.style.pointerEvents = '';
    l.setAttribute('tabindex', '0'); l.removeAttribute('aria-disabled');
    l.setAttribute('aria-pressed', 'false');
  });
}

/* ------------------------------------------------------------
   フィードバック表示（第7章 7.4）
   ------------------------------------------------------------ */
function showFeedback(ex, handler, data, isCorrect) {
  const fb = ex.querySelector('.exercise-feedback');
  if (!fb) return;
  fb.classList.remove('is-correct', 'is-incorrect');
  fb.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');

  const parts = [];
  const verdict = document.createElement('p');
  verdict.className = 'feedback-verdict';
  verdict.textContent = isCorrect ? '✓ 正解' : '✗ 不正解';
  parts.push(verdict);

  if (!isCorrect) {
    const ans = document.createElement('p');
    ans.className = 'feedback-correct-answer';
    ans.innerHTML = `<strong>正解:</strong> ${escapeHtml(handler.answerText(data, ex))}`;
    parts.push(ans);
  }

  if (data.explanation) {
    const exp = document.createElement('div');
    exp.className = 'feedback-explanation';
    exp.innerHTML = `<strong>解説:</strong> ${escapeHtml(data.explanation)}`;
    parts.push(exp);
  }

  // やり直すボタン（第7章 7.4）
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn-retry';
  retry.textContent = 'やり直す';
  retry.addEventListener('click', () => retryExercise(ex, handler));
  parts.push(retry);

  fb.replaceChildren(...parts);
  fb.hidden = false;

  handler.highlight(ex, data);
  handler.lock(ex);
  ex.classList.add('is-locked');

  const checkBtn = ex.querySelector('.btn-check');
  if (checkBtn) checkBtn.disabled = true;

  // 判定結果へフォーカスを移す。btn-check の disabled 化でフォーカスが
  // 迷子になるのを防ぎ、スクリーンリーダーにも結果を確実に届ける
  verdict.setAttribute('tabindex', '-1');
  verdict.focus();
}

function retryExercise(ex, handler) {
  const fb = ex.querySelector('.exercise-feedback');
  if (fb) { fb.hidden = true; fb.replaceChildren(); fb.classList.remove('is-correct', 'is-incorrect'); }
  handler.reset(ex);
  ex.classList.remove('is-locked');
  const checkBtn = ex.querySelector('.btn-check');
  if (checkBtn) {
    checkBtn.disabled = false;
    // 「やり直す」ボタンはフィードバックごと消えるため、フォーカスを戻す
    checkBtn.focus();
  }
  // 進捗を未着手に戻す（statusのみ削除。履歴は残る / 第8章 8.3）
  clearExerciseStatus(ex.dataset.exerciseId);
  // 前回結果の表示があれば消す
  const prev = ex.querySelector('.exercise-prev-result');
  if (prev) prev.remove();
  // 数字替え: バリアントを持つ演習は別の数字で解き直す（第7章 7.6）。
  // シナリオユニットでは個別に回転させない（数珠つなぎの整合を保つ）。
  if (!scenario.data) {
    const data = getAnswerData(ex);
    if (data && VARIANT_TYPES.indexOf(ex.dataset.type) !== -1 && variantCount(data) > 1) {
      setExerciseVariant(ex, data, pickOtherVariant(activeVariant(ex), variantCount(data)));
    }
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

/* ------------------------------------------------------------
   初期化
   ------------------------------------------------------------ */
function initExercise(ex) {
  const type = ex.dataset.type;
  const handler = types[type];
  if (!handler) {
    console.warn('未知の演習タイプ:', type, ex.dataset.exerciseId);
    return;
  }
  const data = getAnswerData(ex);
  if (!data) {
    console.warn('正解データが見つかりません:', ex.dataset.exerciseId);
    return;
  }

  if (type === 'ordering') setupOrdering(ex);
  if (type === 'diagram-label') setupDiagram(ex);
  saveVarOriginals(ex); // バリアント0の数字を保存（第7章 7.6）

  // フィードバック領域をライブリージョン化しておく（内容挿入前に設定して
  // おくことで、判定結果がスクリーンリーダーに読み上げられる）
  const fbRegion = ex.querySelector('.exercise-feedback');
  if (fbRegion) {
    fbRegion.setAttribute('role', 'status');
    fbRegion.setAttribute('aria-live', 'polite');
  }

  const checkBtn = ex.querySelector('.btn-check');
  if (!checkBtn) return;
  checkBtn.addEventListener('click', () => {
    const eff = effectiveData(ex, data); // 表示中バリアントの正解データで判定する
    const isCorrect = handler.judge(ex, eff);
    setExerciseStatus(ex.dataset.exerciseId, isCorrect ? 'correct' : 'incorrect');
    if (markReviewDone) markReviewDone(ex.dataset.exerciseId); // 当日の復習キューにあればdone記録
    showFeedback(ex, handler, eff, isCorrect);
    if (reviewTarget === ex.dataset.exerciseId) appendReviewReturnLink(ex);
  });
}

function init() {
  setupScenario(); // scenario-data があるユニットのみ動作
  document.querySelectorAll('.exercise[data-exercise-id]').forEach(initExercise);
  setupReviewMode(); // ?review=1&ex=… で開かれたときのみ動作
}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
