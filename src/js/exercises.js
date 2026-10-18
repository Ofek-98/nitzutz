(function () {
  'use strict';
  const N = window.N, h = N.h;
  const E = N.EX = {};

  const KIND = {
    mcq: ['בחר את התשובה הנכונה', 'target'],
    tf: ['נכון או לא נכון?', 'check'],
    multi: ['סמן את כל התשובות הנכונות', 'list'],
    order: ['סדר לפי הסדר הנכון', 'list'],
    match: ['התאם בין הזוגות', 'layers'],
    cloze: ['השלם את החסר', 'pen'],
    compare: ['מה עדיף?', 'sparkle'],
    spot: ['מצא את החלק הבעייתי', 'search'],
    write: ['אתגר כתיבה', 'pen']
  };
  function kind(type, label) {
    const k = KIND[type];
    return h('div', { class: 'ex-kind' }, N.icon(k[1], { size: 18 }), label || k[0]);
  }
  N.plain = function (t) { return String(t == null ? '' : t).replace(/\*\*|`/g, ''); };
  const plain = N.plain;
  function norm(t) { return plain(t).trim().replace(/\s+/g, ' '); }
  function numKey(e, max) {
    const n = parseInt(e.key, 10);
    return n >= 1 && n <= max ? n - 1 : -1;
  }

  // ---------- learn ----------
  E.learn = function (it, api) {
    api.ready(true);
    const el = h('div', { class: 'ex' },
      h('article', { class: 'learn' },
        h('div', { class: 'learn-h' },
          N.mascot('idle', { anim: 'bob' }),
          h('div', { class: 'stack', style: { gap: '2px' } },
            h('span', { class: 'eyebrow' }, 'רעיון חדש'),
            h('h2', null, N.inline(it.title || '')))),
        it.body ? N.rich(it.body) : null,
        it.example && it.example.text ? N.promptBlock(it.example.text, it.example.label || 'דוגמה') : null,
        it.note ? h('div', { class: 'note' }, N.icon('bulb', { size: 20 }), N.rich(it.note)) : null));
    return { el: el, learn: true };
  };

  // ---------- multiple choice ----------
  E.mcq = function (it, api) {
    const order = N.shuffle(it.options.map(function (_, i) { return i; }));
    let sel = null, locked = false;
    const btns = order.map(function (oi, pos) {
      return h('button', { class: 'opt', type: 'button', onclick: function () { pick(pos); } },
        h('span', { class: 'opt-k' }, String(pos + 1)),
        h('span', { class: 'opt-t' }, N.inline(it.options[oi])));
    });
    function pick(pos) {
      if (locked) return;
      sel = pos;
      btns.forEach(function (b, i) { b.classList.toggle('sel', i === pos); });
      N.sfx('tap');
      api.ready(true);
    }
    const el = h('div', { class: 'ex' }, kind('mcq'), h('div', { class: 'ex-q' }, N.rich(it.q)), h('div', { class: 'opts' }, btns));
    return {
      el: el,
      key: function (e) { const k = numKey(e, btns.length); if (k >= 0) { pick(k); return true; } return false; },
      check: function () {
        locked = true;
        const ok = order[sel] === it.answer;
        btns.forEach(function (b, i) {
          b.disabled = true;
          b.classList.remove('sel');
          if (order[i] === it.answer) b.classList.add('right');
          else if (i === sel) b.classList.add('wrong');
        });
        return { ok: ok, correct: plain(it.options[it.answer]), given: plain(it.options[order[sel]]) };
      }
    };
  };

  // ---------- true / false ----------
  E.tf = function (it, api) {
    let sel = null, locked = false;
    const vals = [true, false];
    const btns = vals.map(function (v, i) {
      return h('button', { class: 'opt', type: 'button', onclick: function () { pick(i); } },
        N.icon(v ? 'check' : 'x', { size: 22 }), v ? 'נכון' : 'לא נכון');
    });
    function pick(i) {
      if (locked) return;
      sel = i;
      btns.forEach(function (b, j) { b.classList.toggle('sel', j === i); });
      N.sfx('tap');
      api.ready(true);
    }
    const el = h('div', { class: 'ex' }, kind('tf'), h('div', { class: 'statement' }, N.rich(it.q)), h('div', { class: 'tf' }, btns));
    return {
      el: el,
      key: function (e) { const k = numKey(e, 2); if (k >= 0) { pick(k); return true; } return false; },
      check: function () {
        locked = true;
        const ok = vals[sel] === it.answer;
        btns.forEach(function (b, i) {
          b.disabled = true;
          b.classList.remove('sel');
          if (vals[i] === it.answer) b.classList.add('right');
          else if (i === sel) b.classList.add('wrong');
        });
        return { ok: ok, correct: it.answer ? 'נכון' : 'לא נכון', given: vals[sel] ? 'נכון' : 'לא נכון' };
      }
    };
  };

  // ---------- select all that apply ----------
  E.multi = function (it, api) {
    const order = N.shuffle(it.options.map(function (_, i) { return i; }));
    const chosen = new Set();
    let locked = false;
    const btns = order.map(function (oi, pos) {
      return h('button', { class: 'opt', type: 'button', 'aria-pressed': 'false', onclick: function () { toggle(pos); } },
        h('span', { class: 'opt-box' }, N.icon('check', { size: 16, sw: 3 })),
        h('span', { class: 'opt-t' }, N.inline(it.options[oi])));
    });
    function toggle(pos) {
      if (locked) return;
      if (chosen.has(pos)) chosen.delete(pos); else chosen.add(pos);
      btns[pos].classList.toggle('sel', chosen.has(pos));
      btns[pos].setAttribute('aria-pressed', String(chosen.has(pos)));
      N.sfx('tap');
      api.ready(chosen.size > 0);
    }
    const el = h('div', { class: 'ex' }, kind('multi'), h('div', { class: 'ex-q' }, N.rich(it.q)), h('div', { class: 'opts' }, btns));
    return {
      el: el,
      key: function (e) { const k = numKey(e, btns.length); if (k >= 0) { toggle(k); return true; } return false; },
      check: function () {
        locked = true;
        const right = new Set(it.answers);
        let ok = true;
        btns.forEach(function (b, pos) {
          b.disabled = true;
          const isRight = right.has(order[pos]), picked = chosen.has(pos);
          if (isRight && picked) b.classList.add('right');
          else if (!isRight && picked) { b.classList.add('wrong'); ok = false; }
          else if (isRight && !picked) { b.classList.add('missed'); ok = false; }
          b.classList.remove('sel');
        });
        return {
          ok: ok,
          correct: it.answers.map(function (i) { return plain(it.options[i]); }).join(' | '),
          given: Array.from(chosen).map(function (p) { return plain(it.options[order[p]]); }).join(' | ')
        };
      }
    };
  };

  // ---------- ordering ----------
  E.order = function (it, api) {
    const n = it.items.length;
    let bank = N.shuffle(it.items.map(function (_, i) { return i; }));
    if (bank.every(function (v, i) { return v === i; })) bank = bank.reverse();
    const placed = [];
    let locked = false;
    const slotsEl = h('div', { class: 'slots', 'aria-label': 'הסדר שלך' });
    const bankEl = h('div', { class: 'bank' });
    function render() {
      N.clear(slotsEl);
      N.clear(bankEl);
      placed.forEach(function (idx, pos) {
        slotsEl.append(h('button', {
          class: 'card-chip', type: 'button', 'data-idx': idx,
          onclick: function () { if (locked) return; placed.splice(pos, 1); N.sfx('tap'); render(); }
        }, h('span', { class: 'num' }, String(pos + 1)), h('span', { class: 'grow' }, N.inline(it.items[idx]))));
      });
      for (let k = placed.length; k < n; k++) slotsEl.append(h('div', { class: 'slot-empty' }, String(k + 1)));
      bank.forEach(function (idx) {
        if (placed.indexOf(idx) >= 0) return;
        bankEl.append(h('button', {
          class: 'card-chip', type: 'button',
          onclick: function () { if (locked) return; placed.push(idx); N.sfx('tap'); render(); }
        }, h('span', { class: 'grow' }, N.inline(it.items[idx]))));
      });
      api.ready(placed.length === n);
    }
    render();
    const el = h('div', { class: 'ex' }, kind('order'), h('div', { class: 'ex-q' }, N.rich(it.q || 'סדר את השלבים')), slotsEl, bankEl);
    return {
      el: el,
      check: function () {
        locked = true;
        const ok = placed.length === n && placed.every(function (v, i) { return v === i; });
        Array.prototype.forEach.call(slotsEl.querySelectorAll('.card-chip'), function (b, pos) {
          b.disabled = true;
          b.classList.add(Number(b.getAttribute('data-idx')) === pos ? 'right' : 'wrong');
        });
        if (!ok) {
          el.append(h('div', { class: 'card' },
            h('span', { class: 'eyebrow' }, 'הסדר הנכון'),
            h('ol', { class: 'correct-order' }, it.items.map(function (t) { return h('li', null, N.inline(t)); }))));
        }
        return {
          ok: ok,
          correct: it.items.map(function (t, i) { return (i + 1) + '. ' + plain(t); }).join('\n'),
          given: placed.map(function (idx, i) { return (i + 1) + '. ' + plain(it.items[idx]); }).join('\n'),
          showCorrect: false
        };
      }
    };
  };

  // ---------- matching pairs ----------
  E.match = function (it, api) {
    const pairs = it.pairs.slice(0, 6);
    const Lo = N.shuffle(pairs.map(function (_, i) { return i; }));
    const Ro = N.shuffle(pairs.map(function (_, i) { return i; }));
    let selL = null, selR = null, mistakes = 0, matched = 0;
    const L = {}, R = {};
    const colL = h('div', { class: 'match-col' }), colR = h('div', { class: 'match-col' });
    Lo.forEach(function (i) {
      const b = h('button', { class: 'mt term', type: 'button', onclick: function () { choose('L', i); } }, N.inline(pairs[i][0]));
      L[i] = b; colL.append(b);
    });
    Ro.forEach(function (i) {
      const b = h('button', { class: 'mt', type: 'button', onclick: function () { choose('R', i); } }, N.inline(pairs[i][1]));
      R[i] = b; colR.append(b);
    });
    function paint() {
      Object.keys(L).forEach(function (k) { L[k].classList.toggle('sel', Number(k) === selL); });
      Object.keys(R).forEach(function (k) { R[k].classList.toggle('sel', Number(k) === selR); });
    }
    function choose(side, i) {
      const map = side === 'L' ? L : R;
      if (map[i].disabled) return;
      if (side === 'L') selL = selL === i ? null : i; else selR = selR === i ? null : i;
      paint();
      if (selL == null || selR == null) { N.sfx('tap'); return; }
      const a = L[selL], b = R[selR];
      a.classList.remove('sel'); b.classList.remove('sel');
      if (selL === selR) {
        a.disabled = true; b.disabled = true;
        a.classList.add('ok'); b.classList.add('ok');
        N.sfx('match');
        matched++;
        setTimeout(function () { a.classList.remove('ok'); b.classList.remove('ok'); a.classList.add('done'); b.classList.add('done'); }, 420);
        if (matched === pairs.length) {
          setTimeout(function () {
            api.auto({ ok: mistakes === 0, mistakes: mistakes, correct: pairs.map(function (p) { return plain(p[0]) + ' = ' + plain(p[1]); }).join('\n'), given: mistakes + ' טעויות בהתאמה' });
          }, 480);
        }
      } else {
        mistakes++;
        a.classList.add('no'); b.classList.add('no');
        N.sfx('bad'); N.buzz(40);
        setTimeout(function () { a.classList.remove('no'); b.classList.remove('no'); }, 420);
      }
      selL = null; selR = null;
    }
    const el = h('div', { class: 'ex' }, kind('match'), it.q ? h('div', { class: 'ex-q' }, N.rich(it.q)) : null, h('div', { class: 'match' }, colL, colR));
    return { el: el, auto: true, hint: 'הקש על מונח ואז על ההסבר שמתאים לו' };
  };

  // ---------- fill in the blanks ----------
  E.cloze = function (it, api) {
    const parts = it.text.split('___');
    const chips = N.shuffle(it.blanks.concat(it.bank || [])).map(function (t, i) { return { t: t, id: i }; });
    const slots = it.blanks.map(function () { return null; });
    let locked = false;
    const textEl = h('div', { class: 'cloze-text' });
    const bankEl = h('div', { class: 'word-bank' });
    const slotBtns = [];
    parts.forEach(function (p, i) {
      textEl.append(N.inline(p));
      if (i < parts.length - 1) {
        const b = h('button', {
          class: 'blank', type: 'button', 'aria-label': 'מקום ריק ' + (i + 1),
          onclick: function () { if (locked || slots[i] == null) return; slots[i] = null; N.sfx('tap'); render(); }
        });
        slotBtns.push(b);
        textEl.append(b);
      }
    });
    const chipBtns = chips.map(function (c) {
      const b = h('button', {
        class: 'word', type: 'button',
        onclick: function () {
          if (locked || slots.indexOf(c.id) >= 0) return;
          const k = slots.indexOf(null);
          if (k < 0) return;
          slots[k] = c.id;
          N.sfx('tap');
          render();
        }
      }, N.inline(c.t));
      bankEl.append(b);
      return b;
    });
    function render() {
      slotBtns.forEach(function (b, i) {
        N.clear(b);
        const cid = slots[i];
        if (cid == null) { b.textContent = ' '; b.classList.remove('filled'); }
        else { b.append(N.inline(chips[cid].t)); b.classList.add('filled'); }
      });
      chipBtns.forEach(function (b, i) { b.classList.toggle('used', slots.indexOf(i) >= 0); });
      api.ready(slots.every(function (x) { return x != null; }));
    }
    render();
    const el = h('div', { class: 'ex' }, kind('cloze'), it.q ? h('div', { class: 'ex-q' }, N.rich(it.q)) : null, textEl, bankEl);
    function filled(arr) {
      let s = '';
      parts.forEach(function (p, i) { s += plain(p); if (i < parts.length - 1) s += '[' + plain(arr[i]) + ']'; });
      return s;
    }
    return {
      el: el,
      check: function () {
        locked = true;
        let ok = true;
        slotBtns.forEach(function (b, i) {
          b.disabled = true;
          const right = slots[i] != null && norm(chips[slots[i]].t) === norm(it.blanks[i]);
          if (right) b.classList.add('right');
          else { ok = false; b.classList.add('wrong'); b.append(h('span', { class: 'fix' }, N.inline(it.blanks[i]))); }
        });
        chipBtns.forEach(function (b) { b.disabled = true; });
        return { ok: ok, correct: filled(it.blanks), given: filled(slots.map(function (cid) { return cid == null ? '?' : chips[cid].t; })) };
      }
    };
  };

  // ---------- which is better ----------
  E.compare = function (it, api) {
    let sel = null, locked = false;
    const keys = ['a', 'b'];
    const btns = keys.map(function (k, i) {
      return h('button', { class: 'cmp', type: 'button', onclick: function () { pick(i); } },
        h('div', { class: 'cmp-h' }, h('b', null, i ? 'ב' : 'א'), i ? 'אפשרות ב׳' : 'אפשרות א׳'),
        N.promptBlock(it[k]));
    });
    function pick(i) {
      if (locked) return;
      sel = i;
      btns.forEach(function (b, j) { b.classList.toggle('sel', j === i); });
      N.sfx('tap');
      api.ready(true);
    }
    const side = String(it.a).length + String(it.b).length < 520;
    const el = h('div', { class: 'ex' }, kind('compare'), h('div', { class: 'ex-q' }, N.rich(it.q || 'איזו אפשרות טובה יותר?')), h('div', { class: 'compare' + (side ? ' side' : '') }, btns));
    const name = function (k) { return k === 'a' ? 'אפשרות א׳' : 'אפשרות ב׳'; };
    return {
      el: el,
      key: function (e) { const k = numKey(e, 2); if (k >= 0) { pick(k); return true; } return false; },
      check: function () {
        locked = true;
        const ok = keys[sel] === it.answer;
        btns.forEach(function (b, i) {
          b.disabled = true;
          b.classList.remove('sel');
          if (keys[i] === it.answer) b.classList.add('right');
          else if (i === sel) b.classList.add('wrong');
        });
        return {
          ok: ok, correct: name(it.answer), given: name(keys[sel]),
          context: 'א: ' + plain(it.a) + '\nב: ' + plain(it.b)
        };
      }
    };
  };

  // ---------- spot the problem ----------
  E.spot = function (it, api) {
    let sel = null, locked = false;
    const btns = it.parts.map(function (p, i) {
      return h('button', { class: 'part', type: 'button', dir: 'auto', onclick: function () { pick(i); } }, N.inline(p));
    });
    function pick(i) {
      if (locked) return;
      sel = i;
      btns.forEach(function (b, j) { b.classList.toggle('sel', j === i); });
      N.sfx('tap');
      api.ready(true);
    }
    const el = h('div', { class: 'ex' }, kind('spot'), h('div', { class: 'ex-q' }, N.rich(it.q || 'איזה חלק בעייתי?')), h('div', { class: 'spot' }, btns));
    return {
      el: el,
      key: function (e) { const k = numKey(e, btns.length); if (k >= 0) { pick(k); return true; } return false; },
      check: function () {
        locked = true;
        const ok = sel === it.answer;
        btns.forEach(function (b, i) {
          b.disabled = true;
          b.classList.remove('sel');
          if (i === it.answer) b.classList.add('right');
          else if (i === sel) b.classList.add('wrong');
        });
        return { ok: ok, correct: plain(it.parts[it.answer]), given: plain(it.parts[sel]), context: it.parts.map(plain).join(' ') };
      }
    };
  };

  // ---------- free writing ----------
  E.write = function (it, api) {
    const id = 'w-' + String(it.key || 'daily').replace(/[^a-zA-Z0-9]/g, '-');
    const ta = h('textarea', { class: 'write-area', id: id, dir: 'auto', placeholder: 'כתוב כאן את התשובה שלך…', 'aria-label': 'התשובה שלך' });
    const count = h('span', null, '0 תווים');
    ta.addEventListener('input', function () {
      count.textContent = N.fmt(ta.value.length) + ' תווים';
      api.ready(ta.value.trim().length >= 15);
    });
    const rub = (it.rubric || []).length
      ? h('div', { class: 'stack', style: { gap: '6px' } },
        h('span', { class: 'eyebrow' }, 'מה ייבדק'),
        h('div', { class: 'rubric-chips' }, it.rubric.map(function (r) { return h('span', { class: 'pill' }, N.inline(r)); })))
      : null;
    const el = h('div', { class: 'ex' },
      kind('write', it.title ? 'אתגר כתיבה: ' + it.title : null),
      h('div', { class: 'task' }, N.rich(it.task), rub),
      ta,
      h('div', { class: 'write-meta' },
        h('span', null, N.ai.available() ? 'קלוד יקרא ויחזיר לך משוב' : 'תשווה את עצמך לתשובה לדוגמה'),
        count));
    return {
      el: el,
      write: true,
      value: function () { return ta.value; },
      lock: function () { ta.readOnly = true; },
      focus: function () { if (!window.matchMedia('(pointer: coarse)').matches) ta.focus({ preventScroll: true }); }
    };
  };
})();
