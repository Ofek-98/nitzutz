(function () {
  'use strict';
  const N = window.N, h = N.h;

  N.thinking = function (label) {
    return h('div', { class: 'thinking' }, N.mascot('think', { anim: 'bob' }),
      h('div', { class: 'stack', style: { gap: '4px' } }, h('b', null, label), h('span', { class: 'dots' }, h('span'), h('span'), h('span'))));
  };

  let keyHandler = null;
  N.openOverlay = function () {
    const host = document.getElementById('overlay');
    N.clear(host);
    const box = h('div', { class: 'overlay' });
    host.append(box);
    document.documentElement.style.overflow = 'hidden';
    N.inSession = true;
    return box;
  };
  N.closeOverlay = function () {
    N.clear(document.getElementById('overlay'));
    N.clear(document.getElementById('modal'));
    document.documentElement.style.overflow = '';
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    N.inSession = false;
    N.applyPendingRemote();
    N.scrollToCurrent = true;
    N.render();
    setTimeout(N.flushToasts, 350);
  };
  function onKeys(fn) {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = function (e) {
      if (document.querySelector('.modal-back')) return;
      fn(e);
    };
    document.addEventListener('keydown', keyHandler);
  }
  function stat(icon, value, label, color) {
    return h('div', { class: 'stat' },
      h('div', { class: 'v', style: color ? { color: color } : null }, N.icon(icon, { size: 22, fill: icon === 'bolt' || icon === 'flame' }), h('bdi', { dir: 'auto' }, String(value))),
      h('div', { class: 'k' }, label));
  }
  N.stat = stat;
  function fmtTime(ms) {
    const s = Math.max(1, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    return m ? m + ':' + String(s % 60).padStart(2, '0') : s + ' שנ׳';
  }
  function scoreRing(score) {
    const r = 30, c = 2 * Math.PI * r;
    const color = score >= 70 ? 'var(--good)' : score >= 45 ? 'var(--spark)' : 'var(--bad)';
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 76 76');
    svg.setAttribute('width', '76');
    svg.setAttribute('height', '76');
    svg.innerHTML = '<circle cx="38" cy="38" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="8"/>' +
      '<circle cx="38" cy="38" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - score / 100)) + '"/>';
    return h('div', { class: 'ring', style: { width: '76px', height: '76px' } }, svg,
      h('div', { class: 'rv' }, h('b', null, String(score)), h('span', null, 'מתוך 100')));
  }
  function gradeTitle(s) {
    if (s >= 90) return 'פרומפט ברמה גבוהה מאוד';
    if (s >= 75) return 'עבודה טובה';
    if (s >= 55) return 'בכיוון הנכון';
    return 'יש לאן לשפר';
  }
  function describeItem(it) {
    const P = N.plain;
    switch (it.type) {
      case 'mcq': case 'multi': return P(it.q) + '\nאפשרויות: ' + it.options.map(P).join(' / ');
      case 'tf': return 'קבע אם הטענה נכונה: ' + P(it.q);
      case 'order': return P(it.q) + '\nפריטים: ' + it.items.map(P).join(' / ');
      case 'match': return P(it.q || 'התאמה בין מונחים להסברים') + '\n' + it.pairs.map(function (p) { return P(p[0]) + ' = ' + P(p[1]); }).join('\n');
      case 'cloze': return P(it.q || 'השלם את החסר') + ': ' + P(it.text);
      case 'compare': return P(it.q || 'איזו אפשרות טובה יותר');
      case 'spot': return P(it.q || 'מצא את החלק הבעייתי');
      default: return '';
    }
  }
  const PRAISE = ['מעולה!', 'בדיוק!', 'יפה מאוד!', 'צודק!', 'אלוף!', 'מדויק!', 'כל הכבוד!', 'תותח!'];
  const TITLES = { lesson: 'שיעור הושלם!', review: 'חזרה הושלמה!', free: 'תרגול הושלם!', test: 'עברת את מבחן היחידה!', jump: 'דילגת קדימה!', daily: 'אתגר היום הושלם!' };

  // ================= lesson / review / test runner =================
  N.runSession = function (opts) {
    if (!opts.items || !opts.items.length) { N.toast('אין כרגע תרגילים לתרגול כאן', 'info'); return; }
    const box = N.openOverlay();
    const requeue = opts.requeue !== false;
    const queue = opts.items.map(function (it) { return { it: it, tries: 0 }; });
    const total = queue.length;
    let done = 0, combo = 0, bestCombo = 0, firstOk = 0, firstTotal = 0, writeXP = 0;
    const t0 = Date.now();
    let cur = null, ex = null, phase = 'answer', ready = false, ctl = null, selfBoxes = null;

    const bar = h('i');
    const comboEl = h('div', { class: 'combo hide', 'aria-live': 'polite' });
    const pbar = h('div', { class: 'pbar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'התקדמות' }, bar);
    const top = h('div', { class: 's-top' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'יציאה', onclick: askExit }, N.icon('x', { size: 26 })),
      pbar, comboEl);
    const inner = h('div', { class: 's-inner' });
    const body = h('div', { class: 's-body' }, inner);
    const fbHost = h('div');
    const skipBtn = h('button', { class: 'btn btn-text', type: 'button', onclick: onSkip }, 'לא יודע');
    const mainBtn = h('button', { class: 'btn btn-primary btn-main', type: 'button', onclick: onMain }, 'בדוק');
    const foot = h('div', { class: 's-foot' }, h('div', { class: 's-foot-in' }, fbHost, h('div', { class: 's-actions' }, skipBtn, mainBtn)));
    box.append(top, body, foot);

    N.current = function () { return cur && cur.it; };
    const api = {
      ready: function (v) { ready = v; if (phase === 'answer') mainBtn.disabled = !v; },
      auto: function (res) { if (phase === 'answer') resolve(res); }
    };

    onKeys(function (e) {
      const inText = e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT');
      if (e.key === 'Enter' && (!inText || e.ctrlKey || e.metaKey)) {
        if (e.target && e.target.tagName === 'BUTTON' && e.target !== mainBtn) return;
        e.preventDefault();
        onMain();
        return;
      }
      if (inText) return;
      if (phase === 'answer' && ex && ex.key && ex.key(e)) e.preventDefault();
    });

    function setProgress() {
      const pct = Math.round(done / total * 100);
      bar.style.width = pct + '%';
      pbar.setAttribute('aria-valuenow', String(pct));
    }
    function setCombo() {
      if (combo >= 3) {
        comboEl.classList.remove('hide');
        N.clear(comboEl).append(N.icon('flame', { size: 20, fill: true }), String(combo));
        comboEl.classList.remove('bump');
        void comboEl.offsetWidth;
        comboEl.classList.add('bump');
      } else comboEl.classList.add('hide');
    }

    function next() {
      if (ctl) { ctl.abort(); ctl = null; }
      if (!queue.length) return finish();
      cur = queue.shift();
      phase = 'answer';
      ready = false;
      selfBoxes = null;
      ex = N.EX[cur.it.type](cur.it, api);
      N.clear(inner);
      if (cur.tries > 0) inner.append(h('span', { class: 'pill', style: { justifySelf: 'start' } }, N.icon('refresh', { size: 14 }), 'טעות קודמת, הפעם זה ייכנס'));
      inner.append(ex.el);
      body.scrollTop = 0;
      N.clear(fbHost);
      foot.className = 's-foot';
      mainBtn.className = 'btn btn-primary btn-main';
      mainBtn.hidden = false;
      skipBtn.hidden = false;
      skipBtn.textContent = 'לא יודע';
      if (ex.learn) {
        mainBtn.textContent = 'הבנתי, המשך';
        mainBtn.disabled = false;
        skipBtn.hidden = true;
      } else if (ex.write) {
        mainBtn.textContent = N.ai.available() ? 'שלח לבדיקה' : 'בדוק את עצמך';
        mainBtn.disabled = true;
        skipBtn.textContent = 'דלג';
        ex.focus();
      } else if (ex.auto) {
        mainBtn.hidden = true;
        fbHost.append(h('div', { class: 'hint-line' }, ex.hint || ''));
      } else {
        mainBtn.textContent = 'בדוק';
        mainBtn.disabled = true;
      }
    }

    function onMain() {
      if (phase === 'answer') {
        if (!ex) return;
        if (ex.learn) { done++; setProgress(); N.sfx('tap'); next(); return; }
        if (!ready) return;
        if (ex.write) { submitWrite(); return; }
        resolve(ex.check());
      } else if (phase === 'self') {
        finishSelf();
      } else if (phase === 'feedback') {
        next();
      }
    }
    function onSkip() {
      if (phase !== 'answer' || !ex) return;
      if (ex.write) { done++; setProgress(); next(); return; }
      if (ex.auto) {
        const it = cur.it;
        resolve({ ok: false, skipped: true, correct: it.pairs.map(function (p) { return N.plain(p[0]) + ' = ' + N.plain(p[1]); }).join('\n') });
        return;
      }
      const r = ex.check();
      resolve({ ok: false, skipped: true, correct: r.correct, given: 'לא ידעתי', context: r.context, showCorrect: r.showCorrect });
    }

    function resolve(res) {
      phase = 'feedback';
      const it = cur.it, first = cur.tries === 0;
      const s = N.state;
      if (first) {
        firstTotal++;
        if (res.ok) firstOk++;
        if (opts.mode !== 'jump') N.srsRecord(it.key, res.ok, opts.mode === 'review');
      }
      s.stats.answered++;
      if (opts.mode === 'review' || opts.mode === 'free') s.stats.reviews++;
      if (res.ok) {
        s.stats.correct++;
        N.questEvent('correct', 1);
        combo++;
        bestCombo = Math.max(bestCombo, combo);
        done++;
        N.sfx('good');
        N.buzz(15);
      } else {
        combo = 0;
        N.sfx('bad');
        N.buzz([30, 40, 30]);
        if (requeue) { cur.tries++; queue.push(cur); } else done++;
      }
      setProgress();
      setCombo();
      showFeedback(res);
    }

    function showFeedback(res) {
      const it = cur.it;
      foot.className = 's-foot ' + (res.ok ? 'good' : 'bad');
      const parts = [];
      if (!res.ok && res.correct && res.showCorrect !== false) {
        parts.push(h('div', null, h('span', { class: 'muted' }, 'התשובה הנכונה: '), h('span', { class: 'fb-ans', style: { whiteSpace: 'pre-line' } }, res.correct)));
      }
      if (it.explain) parts.push(N.rich(it.explain));
      const aiOut = h('div', { class: 'fb-ai', hidden: true });
      if (N.ai.available()) {
        const link = h('button', { class: 'ai-link', type: 'button' }, N.icon('sparkle', { size: 16 }), 'הסבר לי לעומק');
        link.addEventListener('click', function () { explainMore(res, aiOut, link); });
        parts.push(link);
      }
      parts.push(aiOut);
      const title = res.ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : (res.skipped ? 'בוא נלמד את זה' : 'לא בדיוק');
      N.clear(fbHost).append(h('div', { class: 'fb', role: 'status' },
        h('div', { class: 'fb-ic' }, N.icon(res.ok ? 'check' : 'x', { size: 26, sw: 3 })),
        h('div', { class: 'stack', style: { gap: '6px', minWidth: '0' } },
          h('div', { class: 'fb-t' }, title),
          h('div', { class: 'fb-body' }, parts))));
      mainBtn.hidden = false;
      mainBtn.disabled = false;
      mainBtn.textContent = 'המשך';
      mainBtn.className = 'btn btn-main ' + (res.ok ? 'btn-good' : 'btn-bad');
      skipBtn.hidden = true;
      try { mainBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }

    function explainMore(res, out, link) {
      link.disabled = true;
      out.hidden = false;
      N.clear(out).append(h('span', { class: 'dots' }, h('span'), h('span'), h('span')));
      ctl = new AbortController();
      const it = cur.it;
      N.ai.explain({
        exercise: describeItem(it) + (res.context ? '\n' + res.context : ''),
        correct: res.correct, given: res.given, explain: N.plain(it.explain), ok: res.ok
      }, function (u) { N.clear(out).append(N.rich(u.text)); }, ctl.signal)
        .then(function () { link.remove(); })
        .catch(function (e) {
          const msg = N.ai.errorText(e);
          if (e && e.text) N.clear(out).append(N.rich(e.text));
          else if (msg) N.clear(out).append(h('p', { class: 'muted' }, msg));
          else out.hidden = true;
          link.disabled = false;
        });
    }

    // ----- writing -----
    async function submitWrite() {
      const it = cur.it, text = ex.value().trim();
      ex.lock();
      phase = 'busy';
      mainBtn.disabled = true;
      skipBtn.hidden = true;
      if (N.ai.available()) {
        foot.className = 's-foot info';
        N.clear(fbHost).append(N.thinking('קלוד קורא את מה שכתבת…'));
        ctl = new AbortController();
        const myCtl = ctl;
        try {
          const g = await N.ai.grade(it, text, myCtl.signal);
          if (myCtl.signal.aborted) return;
          ctl = null;
          showGrade(g);
          return;
        } catch (e) {
          if (myCtl.signal.aborted || (e && e.code === 'cancelled')) return;
          ctl = null;
          selfCheck(N.ai.errorText(e));
          return;
        }
      }
      selfCheck('');
    }
    function section(title, list, icon, color) {
      if (!list || !list.length) return null;
      return h('div', { class: 'stack', style: { gap: '6px' } },
        h('span', { class: 'eyebrow', style: { color: color } }, title),
        h('ul', null, list.map(function (t) { return h('li', null, N.inline(t)); })));
    }
    function showGrade(g) {
      const it = cur.it;
      const copyBtn = g.improved ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, N.icon('copy', { size: 16 }), 'העתק') : null;
      if (copyBtn) copyBtn.addEventListener('click', function () { N.copyText(g.improved, copyBtn); });
      const card = h('div', { class: 'grade card' },
        h('div', { class: 'grade-head' }, scoreRing(g.score),
          h('div', { class: 'stack', style: { gap: '4px' } },
            h('span', { class: 'pill ai', style: { justifySelf: 'start' } }, N.icon('sparkle', { size: 14 }), 'משוב מקלוד'),
            h('h3', null, gradeTitle(g.score)),
            g.summary ? h('p', { class: 'muted' }, g.summary) : null)),
        (it.rubric || []).length ? h('div', { class: 'crit' }, it.rubric.map(function (r, i) {
          const c = g.criteria[i] || { ok: false, note: '' };
          return h('div', { class: 'crit-row' },
            h('span', { class: 'crit-dot ' + (c.ok ? 'y' : 'n') }, N.icon(c.ok ? 'check' : 'x', { size: 14, sw: 3 })),
            h('div', null, h('b', null, N.inline(r)), c.note ? h('span', { class: 'muted small' }, c.note) : null));
        })) : null,
        section('מה עבד טוב', g.strengths, 'check', 'var(--good-ink)'),
        section('מה אפשר לשפר', g.improve, 'bulb', 'var(--spark-deep)'),
        g.improved ? h('details', { class: 'more' }, h('summary', null, 'הגרסה המשופרת של התשובה שלך'),
          h('div', { class: 'stack' }, N.promptBlock(g.improved), copyBtn)) : null,
        it.sample ? h('details', { class: 'more' }, h('summary', null, 'תשובה לדוגמה'), N.promptBlock(it.sample)) : null);
      inner.append(card);
      setTimeout(function () { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      recordWrite(g.score);
    }
    function selfCheck(errMsg) {
      const it = cur.it;
      phase = 'self';
      selfBoxes = (it.rubric || []).map(function (r, i) {
        const cb = h('input', { type: 'checkbox', id: 'sc-' + i });
        return { cb: cb, el: h('label', { for: 'sc-' + i }, cb, h('span', null, N.inline(r))) };
      });
      const card = h('div', { class: 'grade card selfcheck' },
        h('span', { class: 'pill', style: { justifySelf: 'start' } }, N.icon('check', { size: 14 }), 'בדיקה עצמית'),
        errMsg ? h('p', { class: 'muted small' }, errMsg) : null,
        it.sample ? h('div', { class: 'stack', style: { gap: '6px' } }, h('span', { class: 'eyebrow' }, 'תשובה לדוגמה'), N.promptBlock(it.sample)) : null,
        selfBoxes.length ? h('span', { class: 'eyebrow' }, 'סמן כל קריטריון שמופיע גם בתשובה שלך') : null,
        h('div', { class: 'stack', style: { gap: '8px' } }, selfBoxes.map(function (b) { return b.el; })));
      inner.append(card);
      setTimeout(function () { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      foot.className = 's-foot info';
      N.clear(fbHost).append(h('div', { class: 'hint-line' }, 'השווה בכנות לתשובה לדוגמה, ואז לחץ ״סיימתי לבדוק״.'));
      mainBtn.disabled = false;
      mainBtn.textContent = 'סיימתי לבדוק';
      mainBtn.className = 'btn btn-primary btn-main';
    }
    function finishSelf() {
      const n = selfBoxes.length;
      const k = selfBoxes.filter(function (b) { return b.cb.checked; }).length;
      selfBoxes.forEach(function (b) { b.cb.disabled = true; });
      recordWrite(n ? Math.round(k / n * 100) : 70);
    }
    function recordWrite(score) {
      const xp = Math.round(score / 10) + 2;
      writeXP += xp;
      const s = N.state;
      s.stats.writes++;
      s.writes.push({ l: cur.it.lessonId || 'daily', s: score, at: Date.now() });
      N.questEvent('write', 1);
      done++;
      setProgress();
      phase = 'feedback';
      const passed = score >= 70;
      foot.className = 's-foot ' + (passed ? 'good' : 'info');
      N.clear(fbHost).append(h('div', { class: 'fb', role: 'status' },
        h('div', { class: 'fb-ic' }, N.icon(passed ? 'check' : 'bulb', { size: 26, sw: passed ? 3 : 2.2 })),
        h('div', { class: 'stack', style: { gap: '4px' } },
          h('div', { class: 'fb-t' }, passed ? 'כתיבה טובה!' : 'יש על מה לעבוד'),
          h('div', { class: 'muted' }, 'ציון ' + score + ' · ', N.ltr('+' + xp + ' XP')))));
      mainBtn.disabled = false;
      mainBtn.textContent = 'המשך';
      mainBtn.className = 'btn btn-main ' + (passed ? 'btn-good' : 'btn-primary');
      N.sfx(passed ? 'good' : 'tap');
    }

    // ----- exit / finish -----
    function askExit() {
      N.modal({
        title: 'רגע, לצאת?',
        body: h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, N.mascot('sad', { size: 64 }), h('p', { class: 'muted' }, 'אם תצא עכשיו, השיעור לא יסומן כהושלם וה־XP שלו לא יישמר.')),
        actions: [
          { label: 'להמשיך ללמוד', kind: 'btn-primary' },
          { label: 'לצאת', kind: 'btn-ghost', onClick: function () { if (ctl) ctl.abort(); N.save(); N.closeOverlay(); } }
        ]
      });
    }

    function finish() {
      const s = N.state;
      const ms = Date.now() - t0;
      const acc = firstTotal ? Math.round(firstOk / firstTotal * 100) : 100;
      s.stats.ms += ms;
      s.stats.bestCombo = Math.max(s.stats.bestCombo, bestCombo);
      N.questEvent('combo', bestCombo);
      let xp = 0;
      const extra = {};
      const hr = new Date().getHours();
      if (opts.mode === 'lesson') {
        const l = opts.lesson;
        const rec = s.lessons[l.id] || { n: 0, best: 0, stars: 0 };
        const replay = rec.n > 0;
        const stars = acc >= 95 ? 3 : acc >= 75 ? 2 : 1;
        xp = (replay ? 5 : 10) + firstOk + (acc === 100 ? 5 : 0) + Math.floor(bestCombo / 5) * 2 + writeXP;
        rec.n++;
        rec.best = Math.max(rec.best, acc);
        rec.stars = Math.max(rec.stars, stars);
        s.lessons[l.id] = rec;
        s.stats.lessons++;
        if (acc === 100) { s.stats.perfect++; N.questEvent('perfect', 1); }
        N.questEvent('lesson', 1);
        if (hr >= 23 || hr < 4) s.stats.owl = true;
        if (hr >= 4 && hr < 7) s.stats.bird = true;
        extra.stars = stars;
        extra.replay = replay;
        extra.unitNowComplete = !replay && N.unitLessonsDone(l.unit) && !N.unitDone(l.unit);
      } else if (opts.mode === 'review' || opts.mode === 'free') {
        xp = 5 + firstOk + writeXP;
        N.questEvent('review', 1);
      } else if (opts.mode === 'test') {
        extra.pass = acc >= opts.passAt;
        xp = extra.pass ? 30 : 5;
        if (extra.pass) {
          const wasDone = N.unitDone(opts.unit);
          s.units[opts.unit.id] = Object.assign(s.units[opts.unit.id] || {}, { done: s.units[opts.unit.id] && s.units[opts.unit.id].done || Date.now(), acc: Math.max(acc, (s.units[opts.unit.id] || {}).acc || 0) });
          if (!wasDone) { s.gems += 20; extra.unlocked = N.units[opts.unit.index + 1] || null; }
        }
      } else if (opts.mode === 'jump') {
        extra.pass = acc >= opts.passAt;
        xp = extra.pass ? 20 : 3;
        if (extra.pass) {
          N.units.slice(0, opts.unit.index).forEach(function (u) {
            u.lessons.forEach(function (l) { if (!N.lessonDone(l.id)) s.lessons[l.id] = { n: 1, best: acc, stars: 1 }; });
            if (!N.unitDone(u)) s.units[u.id] = Object.assign(s.units[u.id] || {}, { done: Date.now(), acc: acc, jumped: true });
          });
        }
      } else if (opts.mode === 'daily') {
        xp = writeXP + 5;
        if (s.daily) s.daily.done = true;
      }
      const res = N.addXP(xp);
      N.checkBadges();
      N.save(true);
      showResults({ acc: acc, xp: xp, ms: ms, bestCombo: bestCombo, res: res, extra: extra });
    }

    function showResults(r) {
      N.clear(box);
      const failed = (opts.mode === 'test' || opts.mode === 'jump') && !r.extra.pass;
      let sub;
      if (failed) sub = 'צריך ' + opts.passAt + '% כדי לעבור, וקיבלת ' + r.acc + '%. סבב חזרה קצר, ואז נסה שוב.';
      else if (opts.mode === 'test') sub = r.extra.unlocked ? 'היחידה הבאה, ״' + r.extra.unlocked.title + '״, פתוחה עכשיו.' : 'השלמת את כל המסלול. אתה אלוף.';
      else if (opts.mode === 'jump') sub = 'השיעורים הקודמים סומנו כהושלמו. ממשיכים מכאן.';
      else if (opts.mode === 'lesson' && r.extra.unitNowComplete) sub = 'סיימת את כל השיעורים ביחידה. מבחן היחידה מחכה לך בסוף המסלול שלה.';
      else if (opts.mode === 'lesson') sub = r.acc === 100 ? 'בלי אף טעות. מרשים.' : r.acc >= 80 ? 'עבודה יפה. ככה בונים שליטה.' : 'כל טעות היום היא חזרה מחר. ככה לומדים.';
      else sub = 'ככה נשאר חד.';
      const goal = N.state.profile.goal, today = N.todayXP();
      const stars = opts.mode === 'lesson'
        ? h('div', { class: 'big-stars', 'aria-label': r.extra.stars + ' כוכבים' }, [1, 2, 3].map(function (i) { return h('span', { class: i <= r.extra.stars ? 'on' : '' }, N.icon('star', { size: 44, fill: true })); }))
        : null;
      const content = h('div', { class: 'result' },
        N.mascot(failed ? 'sad' : 'happy', { anim: failed ? 'wiggle' : 'jump' }),
        stars,
        h('h1', null, failed ? 'כמעט!' : TITLES[opts.mode] || 'כל הכבוד!'),
        h('p', { class: 'muted' }, sub),
        h('div', { class: 'tile-grid' },
          stat('bolt', '+' + r.xp, 'XP', 'var(--spark-deep)'),
          stat('target', r.acc + '%', 'דיוק', 'var(--good)'),
          stat('clock', fmtTime(r.ms), 'זמן', 'var(--gem)'),
          r.bestCombo >= 3 ? stat('flame', r.bestCombo, 'רצף נכונות', 'var(--flame)') : null),
        h('div', { class: 'card', style: { width: '100%', textAlign: 'start' } },
          h('div', { class: 'card-h' }, h('b', null, 'היעד היומי'), h('span', { class: 'muted small' }, Math.min(today, goal) + ' / ' + goal + ' XP')),
          h('div', { class: 'qbar' }, h('i', { style: { width: Math.min(100, Math.round(today / goal * 100)) + '%', background: today >= goal ? 'var(--good)' : 'var(--spark)' } })),
          r.res.goalMet ? h('span', { class: 'pill good', style: { justifySelf: 'start' } }, N.icon('check', { size: 14 }), 'עמדת ביעד היומי!') : null),
        r.res.levelUp ? h('div', { class: 'pill', style: { fontSize: '.95rem' } }, N.icon('crown', { size: 16 }), 'עלית לרמה ' + r.res.levelUp.lvl + ': ' + r.res.levelUp.title) : null);
      const cont = h('button', { class: 'btn btn-primary btn-main', type: 'button' }, 'המשך');
      cont.addEventListener('click', function () { if (r.res.streak) showStreak(r.res.streak); else N.closeOverlay(); });
      const actions = [cont];
      if (failed && opts.mode === 'test') {
        actions.unshift(h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { N.closeOverlay(); N.startReview(opts.unit); } }, 'סבב חזרה'));
      }
      box.append(h('div', { class: 's-body' }, content), h('div', { class: 's-foot' }, h('div', { class: 's-foot-in' }, h('div', { class: 's-actions' }, actions))));
      onKeys(function (e) { if (e.key === 'Enter') { e.preventDefault(); cont.click(); } });
      if (!failed) { N.sfx('done'); N.confetti(); } else N.sfx('fail');
      setTimeout(function () { try { cont.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 80);
    }

    function showStreak(st) {
      N.clear(box);
      const tNum = N.dayNum(N.today());
      const frozen = N.state.streak.frozen;
      const dots = [];
      for (let i = 6; i >= 0; i--) {
        const key = N.keyFromNum(tNum - i);
        const on = (N.state.days[key] || 0) > 0;
        const frz = frozen.indexOf(key) >= 0;
        dots.push(h('div', { class: 'wd' + (on ? ' on' : frz ? ' frz' : '') },
          h('i', null, on ? N.icon('check', { size: 16, sw: 3 }) : frz ? N.icon('snow', { size: 16 }) : null),
          N.DAYS_HE[N.weekday(key)]));
      }
      const msg = st.count === 1 ? 'כל רצף מתחיל ביום אחד. נתראה מחר!' : st.count < 7 ? 'תחזור מחר כדי לשמור על הרצף.' : 'אתה בונה הרגל אמיתי. ככה הופכים למומחים.';
      const content = h('div', { class: 'result' },
        h('div', { class: 'flame-big' }, N.icon('flame', { size: 120, fill: true })),
        h('div', { class: 'streak-num' }, String(st.count)),
        h('h1', null, st.count === 1 ? 'יום ראשון ברצף!' : 'ימים ברצף!'),
        h('p', { class: 'muted' }, msg),
        h('div', { class: 'week-dots' }, dots),
        st.freeze ? h('div', { class: 'note', style: { textAlign: 'start' } }, N.icon('snow', { size: 20 }), h('span', null, 'זכית בהקפאת רצף! אם תפספס יום, היא תשמור לך על הרצף.')) : null);
      const cont = h('button', { class: 'btn btn-primary btn-main', type: 'button', onclick: function () { N.closeOverlay(); } }, 'המשך');
      box.append(h('div', { class: 's-body' }, content), h('div', { class: 's-foot' }, h('div', { class: 's-foot-in' }, h('div', { class: 's-actions' }, cont))));
      onKeys(function (e) { if (e.key === 'Enter') { e.preventDefault(); cont.click(); } });
      N.sfx('done');
      setTimeout(function () { try { cont.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 80);
    }

    next();
    setProgress();
  };

  // ================= starters =================
  N.startLesson = function (l) {
    N.runSession({ mode: 'lesson', lesson: l, items: l.items });
  };
  function quizItems(lessons) {
    const out = [];
    lessons.forEach(function (l) { l.items.forEach(function (it) { if (N.QUIZ_TYPES.indexOf(it.type) >= 0) out.push(it); }); });
    return out;
  }
  function spread(items, n) {
    // pick n items spread across lessons, shuffled
    const byLesson = {};
    items.forEach(function (it) { (byLesson[it.lessonId] = byLesson[it.lessonId] || []).push(it); });
    const groups = Object.keys(byLesson).map(function (k) { return N.shuffle(byLesson[k]); });
    const out = [];
    let i = 0;
    while (out.length < n && groups.some(function (g) { return g.length; })) {
      const g = groups[i % groups.length];
      if (g.length) out.push(g.pop());
      i++;
    }
    return N.shuffle(out);
  }
  N.startTest = function (u) {
    N.runSession({ mode: 'test', unit: u, items: spread(quizItems(u.lessons), 10), requeue: false, passAt: 70 });
  };
  N.startJump = function (u) {
    const lessons = [];
    N.units.slice(0, u.index).forEach(function (x) { lessons.push.apply(lessons, x.lessons); });
    N.runSession({ mode: 'jump', unit: u, items: spread(quizItems(lessons), 12), requeue: false, passAt: 75 });
  };
  N.startReview = function (unit) {
    let due = N.dueItems();
    if (unit) due = due.filter(function (it) { return N.lessonById[it.lessonId] && N.lessonById[it.lessonId].unit === unit; });
    let items = due.slice(0, 12);
    let mode = 'review';
    if (items.length < 6) {
      let pool = unit ? quizItems(unit.lessons.filter(function (l) { return N.lessonDone(l.id); })) : N.seenQuizItems();
      pool = pool.filter(function (it) { return items.indexOf(it) < 0; });
      items = items.concat(spread(pool, 8 - items.length));
      if (!due.length) mode = 'free';
    }
    N.runSession({ mode: mode, items: items });
  };
  N.startLessonPractice = function (l) {
    N.runSession({ mode: 'free', items: N.shuffle(quizItems([l])).slice(0, 8) });
  };

  // ================= lightning round =================
  N.lightningPool = function () {
    const tf = function (ls) { const o = []; ls.forEach(function (l) { l.items.forEach(function (it) { if (it.type === 'tf') o.push(it); }); }); return o; };
    let pool = tf(N.doneLessons());
    if (pool.length < 15) {
      const open = N.lessons.filter(function (l) { return N.unitUnlocked(l.unit); });
      pool = tf(open);
    }
    return pool;
  };
  N.runLightning = function () {
    const pool = N.shuffle(N.lightningPool());
    if (pool.length < 5) { N.toast('צריך עוד כמה שיעורים כדי לפתוח את סבב הברק', 'bolt'); return; }
    const box = N.openOverlay();
    const DUR = 60000;
    let score = 0, idx = 0, locked = false, ended = false;
    const t0 = Date.now();
    const tbar = h('i', { style: { width: '100%' } });
    const scoreEl = h('div', { class: 'lscore', 'aria-live': 'polite' }, '0');
    const card = h('div', { class: 'lcard' });
    const yes = h('button', { class: 'opt', type: 'button', onclick: function () { answer(true); } }, N.icon('check', { size: 22 }), 'נכון');
    const no = h('button', { class: 'opt', type: 'button', onclick: function () { answer(false); } }, N.icon('x', { size: 22 }), 'לא נכון');
    box.append(
      h('div', { class: 's-top' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'יציאה', onclick: function () { ended = true; N.closeOverlay(); } }, N.icon('x', { size: 26 })),
        h('div', { class: 'timer' }, tbar), scoreEl),
      h('div', { class: 's-body' }, h('div', { class: 's-inner' },
        h('div', { class: 'ex-kind' }, N.icon('bolt', { size: 18, fill: true }), 'סבב ברק: כמה שיותר תשובות נכונות בדקה'),
        card)),
      h('div', { class: 's-foot' }, h('div', { class: 's-foot-in' }, h('div', { class: 'tf' }, yes, no))));
    function show() {
      const it = pool[idx % pool.length];
      card.className = 'lcard';
      N.clear(card).append(N.rich(it.q));
    }
    function answer(v) {
      if (locked || ended) return;
      const it = pool[idx % pool.length];
      const ok = v === it.answer;
      locked = true;
      if (ok) { score++; scoreEl.textContent = String(score); N.sfx('good'); card.classList.add('ok'); }
      else { N.sfx('bad'); N.buzz(40); card.classList.add('no'); }
      setTimeout(function () { locked = false; idx++; if (!ended) show(); }, ok ? 280 : 650);
    }
    onKeys(function (e) {
      if (e.key === '1' || e.key === 'ArrowRight') { e.preventDefault(); answer(true); }
      if (e.key === '2' || e.key === 'ArrowLeft') { e.preventDefault(); answer(false); }
    });
    const timer = setInterval(function () {
      if (ended) { clearInterval(timer); return; }
      const left = Math.max(0, DUR - (Date.now() - t0));
      tbar.style.width = (left / DUR * 100) + '%';
      if (left <= 0) { clearInterval(timer); end(); }
    }, 200);
    function end() {
      ended = true;
      const s = N.state;
      const best = s.stats.lightning;
      const record = score > best;
      s.stats.lightning = Math.max(best, score);
      N.questEvent('lightning', score);
      const res = N.addXP(score);
      N.checkBadges();
      N.save(true);
      N.clear(box);
      const content = h('div', { class: 'result' },
        N.mascot(score >= 10 ? 'happy' : 'idle', { anim: 'jump' }),
        h('h1', null, record ? 'שיא חדש!' : 'סבב הסתיים'),
        h('p', { class: 'muted' }, record ? 'השיא הקודם שלך היה ' + best + '.' : 'השיא שלך: ' + s.stats.lightning),
        h('div', { class: 'tile-grid' }, stat('bolt', score, 'תשובות נכונות', 'var(--gem)'), stat('star', '+' + score, 'XP', 'var(--spark-deep)')));
      const cont = h('button', { class: 'btn btn-primary btn-main', type: 'button', onclick: function () { N.closeOverlay(); } }, 'המשך');
      const again = h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { N.closeOverlay(); N.runLightning(); } }, 'עוד סבב');
      box.append(h('div', { class: 's-body' }, content), h('div', { class: 's-foot' }, h('div', { class: 's-foot-in' }, h('div', { class: 's-actions' }, again, cont))));
      if (score > 0) { N.sfx('done'); if (record) N.confetti(90); }
      void res;
    }
    show();
  };
})();
