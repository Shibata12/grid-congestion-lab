/* ============================================================
   系統混雑ラボ  演習エンジン（exercise-engine.js）
   第7章 演習エンジン仕様に準拠。全7タイプの判定を実装する。
   choice / multi-choice / numeric / fill-in / ordering / matrix / diagram-label
   すべてクライアントサイドで完結（外部通信なし）。
   ※ common.js が公開する window.GCL を利用する（クラシックスクリプト方式 / DESIGN.md 2.1）。
   ============================================================ */

(function () {
  'use strict';

  const { setExerciseStatus, clearExerciseStatus } = window.GCL;

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
    ex.querySelectorAll('.draggable-label').forEach((l) => { l.draggable = false; l.style.pointerEvents = 'none'; });
    ex.querySelectorAll('.drop-zone').forEach((z) => { z.style.pointerEvents = 'none'; });
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
   diagram-label の操作 UI（ドラッグ＆ドロップ ＋ クリック配置）
   ------------------------------------------------------------ */
function setupDiagram(ex) {
  const wrap = ex.querySelector('.diagram-exercise');
  if (!wrap) return;
  let selected = null;

  const select = (lbl) => {
    if (selected) selected.classList.remove('is-selected');
    selected = lbl;
    if (lbl) lbl.classList.add('is-selected');
  };

  ex.querySelectorAll('.draggable-label').forEach((lbl) => {
    lbl.setAttribute('draggable', 'true');
    lbl.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', lbl.dataset.labelId); select(lbl); });
    lbl.addEventListener('click', () => select(selected === lbl ? null : lbl));
  });

  ex.querySelectorAll('.drop-zone').forEach((zone) => {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const lbl = ex.querySelector(`.draggable-label[data-label-id="${CSS.escape(id)}"]`);
      placeLabel(zone, lbl);
    });
    zone.addEventListener('click', () => { if (selected) { placeLabel(zone, selected); select(null); } });
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
  ex.querySelectorAll('.drop-zone').forEach((z) => { z.classList.remove('filled'); z.style.pointerEvents = ''; });
  ex.querySelectorAll('.draggable-label').forEach((l) => { l.draggable = true; l.style.pointerEvents = ''; });
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
}

function retryExercise(ex, handler) {
  const fb = ex.querySelector('.exercise-feedback');
  if (fb) { fb.hidden = true; fb.replaceChildren(); fb.classList.remove('is-correct', 'is-incorrect'); }
  handler.reset(ex);
  ex.classList.remove('is-locked');
  const checkBtn = ex.querySelector('.btn-check');
  if (checkBtn) checkBtn.disabled = false;
  // 進捗を未着手に戻す（第8章 8.3）
  clearExerciseStatus(ex.dataset.exerciseId);
  // 前回結果の表示があれば消す
  const prev = ex.querySelector('.exercise-prev-result');
  if (prev) prev.remove();
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

  const checkBtn = ex.querySelector('.btn-check');
  if (!checkBtn) return;
  checkBtn.addEventListener('click', () => {
    const isCorrect = handler.judge(ex, data);
    setExerciseStatus(ex.dataset.exerciseId, isCorrect ? 'correct' : 'incorrect');
    showFeedback(ex, handler, data, isCorrect);
  });
}

function init() {
  document.querySelectorAll('.exercise[data-exercise-id]').forEach(initExercise);
}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
