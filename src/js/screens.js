(function () {
  'use strict';
  const N = window.N, h = N.h;

  const TABS = [
    { id: 'learn', label: 'מסלול', icon: 'home' },
    { id: 'practice', label: 'תרגול', icon: 'dumbbell' },
    { id: 'missions', label: 'משימות', icon: 'flag' },
    { id: 'words', label: 'מילון', icon: 'book' },
    { id: 'me', label: 'פרופיל', icon: 'user' }
  ];
  const UNIT_HEX = { amber: 'var(--amber)', coral: 'var(--coral)', violet: 'var(--violet)', teal: 'var(--teal)', rose: 'var(--rose)', sky: 'var(--sky)', lime: 'var(--lime)', indigo: 'var(--indigo)' };

  N.route = 'learn';
  N.sub = null;
  try { const t = localStorage.getItem('nitzutz.tab'); if (t && TABS.some(function (x) { return x.id === t; })) N.route = t; } catch (e) { /* ignore */ }
  N.go = function (route, sub) {
    N.route = route;
    N.sub = sub || null;
    try { localStorage.setItem('nitzutz.tab', route); } catch (e) { /* ignore */ }
    N.render();
    window.scrollTo(0, 0);
  };

  let openPop = null;
  document.addEventListener('click', function () { closePop(); });
  function closePop() { if (openPop) { openPop.pop.remove(); openPop.w.classList.remove('open'); openPop = null; } }

  N.render = function () {
    const app = document.getElementById('app');
    closePop();
    if (!N.state.profile.onboarded) { renderOnboarding(app); return; }
    N.ensureQuests();
    N.clear(app);
    const view = h('div', { class: 'view', id: 'view' });
    app.append(h('div', { class: 'shell' }, sidenav(), h('main', { class: 'main' }, topbar(), view), rail(), tabbar()));
    (VIEWS[N.route] || VIEWS.learn)(view);
    if (N.scrollToCurrent && N.route === 'learn') {
      N.scrollToCurrent = false;
      requestAnimationFrame(function () {
        const c = document.querySelector('.nw.current');
        if (c) {
          const r = c.getBoundingClientRect();
          if (r.top > window.innerHeight * 0.7 || r.top < 0) c.scrollIntoView({ block: 'center' });
        }
      });
    }
  };

  // ---------- chrome ----------
  function chips() {
    const s = N.state, st = s.streak, li = N.levelInfo(s.xp);
    const active = st.last === N.today();
    return h('div', { class: 'chips' },
      h('button', { class: 'chip flame' + (active ? '' : ' cold'), type: 'button', title: 'רצף ימים', 'aria-label': 'רצף: ' + st.count + ' ימים', onclick: showStreakInfo },
        N.icon('flame', { size: 22, fill: true }), String(st.count)),
      h('button', { class: 'chip gem', type: 'button', title: 'יהלומים', 'aria-label': s.gems + ' יהלומים', onclick: function () { N.go('me'); setTimeout(function () { const el = document.getElementById('shop'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 60); } },
        N.icon('gem', { size: 21, fill: true }), String(s.gems)),
      h('button', { class: 'chip lvl', type: 'button', title: 'רמה', 'aria-label': 'רמה ' + li.lvl, onclick: function () { N.go('me'); } },
        h('span', { class: 'lvl-badge' }, String(li.lvl)), h('span', { class: 'sr' }, li.title)));
  }
  function brand() { return h('div', { class: 'brand' }, N.mascot('idle', { avatar: 'spark' }), 'ניצוץ'); }
  function topbar() { return h('header', { class: 'topbar' }, brand(), chips()); }
  function sidenav() {
    return h('nav', { class: 'sidenav', 'aria-label': 'ניווט ראשי' }, brand(),
      TABS.map(function (t) {
        return h('button', { class: 'navlink' + (N.route === t.id ? ' on' : ''), type: 'button', 'aria-current': N.route === t.id ? 'page' : null, onclick: function () { N.go(t.id); } },
          N.icon(t.icon, { size: 26 }), t.label);
      }),
      h('div', { style: { flex: '1' } }),
      syncLine());
  }
  function tabbar() {
    return h('nav', { class: 'tabbar', 'aria-label': 'ניווט ראשי' }, TABS.map(function (t) {
      return h('button', { class: 'tab' + (N.route === t.id ? ' on' : ''), type: 'button', 'aria-current': N.route === t.id ? 'page' : null, onclick: function () { N.go(t.id); } },
        N.icon(t.icon), t.label);
    }));
  }
  function rail() {
    return h('aside', { class: 'rail' }, chips(), goalCard(), questsCard(), tipCard());
  }
  function syncLine() {
    const st = N.store.status;
    const local = N.hosted ? 'נשמר במכשיר הזה' : 'נשמר במחשב הזה';
    const text = { cloud: 'מסונכרן לענן', syncing: 'מסנכרן…', error: 'הסנכרון נכשל, נשמר במכשיר', local: local }[st] || local;
    return h('div', { class: 'sync ' + st }, h('span', { class: 'dot' }), h('span', null, text));
  }
  N.on('sync', function () {
    document.querySelectorAll('.sync').forEach(function (el) { el.replaceWith(syncLine()); });
  });

  // ---------- shared cards ----------
  function ring(val, goal, size) {
    size = size || 84;
    const r = size / 2 - 7, c = 2 * Math.PI * r, pct = Math.min(1, goal ? val / goal : 0);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    const color = pct >= 1 ? 'var(--good)' : 'var(--spark)';
    svg.innerHTML = '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="9"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - pct)) + '" style="transition:stroke-dashoffset .6s"/>';
    return h('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' } }, svg,
      h('div', { class: 'rv' }, h('b', null, String(Math.min(val, 9999))), h('span', null, 'מתוך ' + goal)));
  }
  function greeting() {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'בוקר טוב';
    if (hr >= 12 && hr < 17) return 'צהריים טובים';
    if (hr >= 17 && hr < 22) return 'ערב טוב';
    return 'לילה טוב';
  }
  function startNext() {
    const ns = N.nextStep();
    if (ns.type === 'lesson') N.startLesson(ns.lesson);
    else if (ns.type === 'test') confirmTest(ns.unit);
    else N.startReview();
  }
  function todayCard() {
    const goal = N.state.profile.goal, t = N.todayXP(), st = N.state.streak;
    const ns = N.nextStep();
    let msg, risk = false;
    if (t >= goal) msg = 'עמדת ביעד היומי. מכאן כל XP הוא בונוס.';
    else if (st.count > 0 && st.last !== N.today()) { msg = 'הרצף שלך, ' + st.count + ' ימים, מחכה לשיעור של היום.'; risk = true; }
    else if (t > 0) msg = 'עוד ' + (goal - t) + ' XP ליעד היומי.';
    else msg = 'שיעור אחד קצר, ואתה בדרך.';
    let label;
    if (ns.type === 'lesson') label = (N.lessonDone(ns.lesson.unit.lessons[0].id) || ns.lesson.index > 0 || ns.unit.index > 0 ? 'המשך: ' : 'התחל: ') + ns.lesson.title;
    else if (ns.type === 'test') label = 'מבחן יחידה: ' + ns.unit.title;
    else label = 'חזרה חכמה';
    return h('section', { class: 'today-card' },
      ring(t, goal),
      h('div', { class: 'stack', style: { gap: '4px' } },
        h('span', { class: 'eyebrow' }, 'היעד היומי'),
        h('h2', null, greeting()),
        h('p', { class: 'today-msg' + (risk ? ' risk' : '') }, msg)),
      h('button', { class: 'btn btn-primary btn-block cta', type: 'button', onclick: startNext }, N.icon('play', { size: 18, fill: true }), label));
  }
  function goalCard() {
    const goal = N.state.profile.goal, t = N.todayXP();
    return h('div', { class: 'card' },
      h('div', { class: 'card-h' }, h('h3', null, 'היעד היומי'), h('span', { class: 'muted small' }, Math.min(t, goal) + ' / ' + goal + ' XP')),
      h('div', { class: 'qbar' }, h('i', { style: { width: Math.min(100, Math.round(t / goal * 100)) + '%', background: t >= goal ? 'var(--good)' : 'var(--spark)' } })));
  }
  function questsCard(cls) {
    N.ensureQuests();
    const q = N.state.quests;
    return h('div', { class: 'card' + (cls ? ' ' + cls : '') },
      h('div', { class: 'card-h' }, h('h3', null, 'משימות יומיות'), h('span', { class: 'pill' }, N.icon('gem', { size: 14, fill: true }), 'פרסים')),
      q.list.map(function (it) {
        const def = N.QUESTS[it.id];
        if (!def) return null;
        return h('div', { class: 'quest' + (it.done ? ' done' : '') },
          h('div', { class: 'quest-ic' }, N.icon(it.done ? 'check' : def.icon, { size: 22, fill: !it.done && (def.icon === 'bolt' || def.icon === 'flame' || def.icon === 'star') })),
          h('div', { style: { minWidth: '0' } },
            h('div', { class: 'quest-t' }, h('span', null, def.title(it.t)), h('span', { class: 'muted small' }, it.p + '/' + it.t)),
            h('div', { class: 'qbar' }, h('i', { style: { width: Math.round(it.p / it.t * 100) + '%' } }))));
      }));
  }
  function tipCard() {
    const tips = [];
    N.units.forEach(function (u) { if (N.unitUnlocked(u)) u.tips.forEach(function (t) { tips.push({ t: typeof t === 'string' ? t : (t.text || t.t || ''), u: u }); }); });
    if (!tips.length) return null;
    const pick = tips[Math.floor(N.seeded('tip' + N.today())() * tips.length)];
    return h('div', { class: 'card' },
      h('div', { class: 'card-h' }, h('h3', null, 'טיפ היום'), N.icon('bulb', { size: 22, cls: 'muted' })),
      N.rich(pick.t),
      h('span', { class: 'muted small' }, 'מתוך: ' + pick.u.title));
  }
  function pageHead(title, sub) {
    return h('div', { class: 'page-h' }, h('h1', null, title), sub ? h('p', { class: 'muted' }, sub) : null);
  }

  // ---------- path ----------
  const OFF = [0, 46, 74, 46, 0, -46, -74, -46];
  function unitSection(u, next) {
    const unlocked = N.unitUnlocked(u);
    const doneCount = u.lessons.filter(function (l) { return N.lessonDone(l.id); }).length;
    const sec = h('section', { class: 'unit u-' + u.color + (unlocked ? '' : ' locked'), id: 'unit-' + u.id });
    sec.append(h('header', { class: 'unit-head' },
      h('div', { class: 'uic' }, N.icon(unlocked ? (u.icon || 'star') : 'lock', { size: 26 })),
      h('div', { class: 'grow stack', style: { gap: '2px' } },
        h('span', { class: 'eyebrow' }, 'יחידה ' + (u.index + 1) + (N.unitDone(u) ? ' · הושלמה' : unlocked ? ' · ' + doneCount + ' מתוך ' + u.lessons.length + ' שיעורים' : '')),
        h('h2', null, u.title),
        u.subtitle ? h('p', null, u.subtitle) : null),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'aria-label': 'מדריך היחידה', onclick: function () { showGuide(u); } }, N.icon('guide', { size: 18 }), h('span', { class: 'hide-xs' }, 'מדריך'))));
    if (!unlocked && next.type === 'locked' && next.unit === u) {
      // first locked unit: nothing to jump past yet
    }
    if (!unlocked) {
      sec.append(h('div', { class: 'unit-jump', style: { marginTop: '10px' } },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { confirmJump(u); } }, N.icon('rocket', { size: 18 }), 'כבר מכיר את החומר? דלג לכאן')));
    }
    const trail = h('div', { class: 'trail' });
    const nodes = [];
    u.lessons.forEach(function (l, i) { nodes.push({ type: 'lesson', l: l }); if (i === 2 && u.lessons.length > 3) nodes.push({ type: 'chest' }); });
    nodes.push({ type: 'test' });
    const shift = (u.index % 2) * 4;
    nodes.forEach(function (nd, i) { trail.append(nodeEl(u, nd, OFF[(i + shift) % OFF.length], next)); });
    const midX = OFF[(2 + shift) % OFF.length];
    const deco = h('div', { class: 'trail-mascot', style: midX >= 0 ? { left: '4%' } : { right: '4%' } }, N.mascot(unlocked ? 'idle' : 'think', { anim: unlocked ? 'bob' : null }));
    trail.append(deco);
    sec.append(trail);
    return sec;
  }
  function nodeEl(u, nd, x, next) {
    const w = h('div', { class: 'nw' });
    w.style.setProperty('--x', x + 'px');
    let state, icon, label, isCur = false;
    const urec = N.state.units[u.id] || {};
    if (nd.type === 'lesson') {
      const l = nd.l;
      const done = N.lessonDone(l.id), open = N.lessonUnlocked(l);
      isCur = next.type === 'lesson' && next.lesson === l;
      state = done ? 'done' : open ? 'open' : 'locked';
      icon = done ? 'check' : open ? 'star' : 'lock';
      label = 'שיעור ' + (l.index + 1) + ': ' + l.title;
    } else if (nd.type === 'chest') {
      const open = N.lessonDone(u.lessons[2].id);
      state = urec.chest ? 'done' : open ? 'open' : 'locked';
      icon = urec.chest ? 'check' : 'chest';
      label = 'תיבת אוצר';
      isCur = open && !urec.chest;
    } else {
      const open = N.unitLessonsDone(u);
      state = N.unitDone(u) ? 'done' : open ? 'open' : 'locked';
      icon = 'trophy';
      label = 'מבחן יחידה';
      isCur = next.type === 'test' && next.unit === u;
    }
    const btn = h('button', {
      class: 'node' + (state === 'locked' ? ' locked' : '') + (nd.type === 'test' ? ' big' : ''), type: 'button', 'aria-label': label,
      onclick: function (e) { e.stopPropagation(); togglePop(w, u, nd, state); }
    }, N.icon(icon, { size: nd.type === 'test' ? 38 : 32, fill: icon === 'star' || icon === 'trophy', sw: 3 }));
    w.append(btn);
    if (nd.type === 'lesson' && state === 'done') {
      const rec = N.state.lessons[nd.l.id];
      w.append(h('div', { class: 'stars', 'aria-label': rec.stars + ' כוכבים' }, [1, 2, 3].map(function (i) { return h('span', { class: i <= rec.stars ? 'on' : '' }, N.icon('star', { size: 16, fill: true })); })));
    }
    if (isCur) {
      w.classList.add('current');
      w.append(h('div', { class: 'bubble' }, nd.type === 'test' ? 'מבחן!' : nd.type === 'chest' ? 'פתח!' : (N.doneLessons().length ? 'המשך' : 'התחל')));
    }
    return w;
  }
  function togglePop(w, u, nd, state) {
    if (openPop && openPop.w === w) { closePop(); return; }
    closePop();
    const kids = [];
    let locked = state === 'locked';
    if (nd.type === 'lesson') {
      const l = nd.l, rec = N.state.lessons[l.id];
      kids.push(h('span', { class: 'eyebrow', style: { color: 'inherit', opacity: '.85' } }, 'שיעור ' + (l.index + 1) + ' מתוך ' + u.lessons.length));
      kids.push(h('h4', null, l.title));
      if (locked) kids.push(h('p', null, 'השלם את השיעורים הקודמים כדי לפתוח את השיעור הזה.'));
      else {
        if (l.goal) kids.push(h('p', null, l.goal));
        if (rec) kids.push(h('p', null, 'השיא שלך: ' + rec.best + '% · ' + rec.n + ' פעמים'));
        kids.push(h('button', { class: 'btn btn-block', type: 'button', onclick: function () { closePop(); N.startLesson(l); } }, rec ? ['תרגל שוב · ', N.ltr('+5 XP')] : ['התחל שיעור · ', N.ltr('+10 XP')]));
        if (rec) kids.push(h('button', { class: 'btn btn-block btn-sm', type: 'button', onclick: function () { closePop(); N.startLessonPractice(l); } }, 'תרגול מהיר בלי כרטיסי לימוד'));
      }
    } else if (nd.type === 'chest') {
      kids.push(h('h4', null, 'תיבת אוצר'));
      if (locked) kids.push(h('p', null, 'השלם שלושה שיעורים ביחידה כדי לפתוח אותה.'));
      else if (state === 'done') kids.push(h('p', null, 'כבר פתחת את התיבה הזו. יש עוד תיבות בהמשך המסלול.'));
      else {
        kids.push(h('p', null, 'הגעת לאמצע היחידה. מגיע לך משהו.'));
        kids.push(h('button', { class: 'btn btn-block', type: 'button', onclick: function () { closePop(); claimChest(u); } }, N.icon('gem', { size: 18, fill: true }), 'פתח את התיבה'));
      }
    } else {
      const rec = N.state.units[u.id] || {};
      kids.push(h('h4', null, 'מבחן יחידה'));
      if (locked) kids.push(h('p', null, 'השלם את כל השיעורים ביחידה כדי לפתוח את המבחן.'));
      else {
        kids.push(h('p', null, rec.done ? 'עברת את המבחן' + (rec.acc ? ' עם ' + rec.acc + '%' : '') + '. אפשר לנסות שוב בשביל XP.' : '10 שאלות מכל היחידה, בלי תיקונים. צריך 70% כדי לעבור ולפתוח את היחידה הבאה.'));
        kids.push(h('button', { class: 'btn btn-block', type: 'button', onclick: function () { closePop(); N.startTest(u); } }, rec.done ? 'נסה שוב' : 'התחל מבחן'));
      }
    }
    const pop = h('div', { class: 'pop' + (locked ? ' locked' : ''), role: 'dialog', onclick: function (e) { e.stopPropagation(); } }, kids);
    w.append(pop);
    w.classList.add('open');
    openPop = { w: w, pop: pop };
    N.sfx('tap');
    requestAnimationFrame(function () {
      const r = pop.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 90) window.scrollBy({ top: r.bottom - window.innerHeight + 110, behavior: 'smooth' });
    });
  }
  function claimChest(u) {
    const s = N.state;
    s.units[u.id] = Object.assign(s.units[u.id] || {}, { chest: Date.now() });
    const gems = 15 + Math.floor(Math.random() * 11);
    s.gems += gems;
    N.save();
    N.sfx('gem');
    N.confetti(80);
    N.modal({
      title: 'מצאת ' + gems + ' יהלומים!',
      body: h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, N.mascot('happy', { size: 70, anim: 'jump' }),
        h('p', { class: 'muted' }, 'אפשר להשתמש ביהלומים בחנות: הקפאת רצף לימים עמוסים, או צבע חדש לניצי.')),
      actions: [{ label: 'מעולה', kind: 'btn-primary' }],
      onClose: function () { N.render(); }
    });
  }
  function confirmTest(u) {
    N.modal({
      eyebrow: 'יחידה ' + (u.index + 1), title: 'מבחן יחידה: ' + u.title,
      body: h('p', { class: 'muted' }, '10 שאלות מכל השיעורים ביחידה. אין תיקונים באמצע, וצריך 70% כדי לעבור. אם תעבור, היחידה הבאה תיפתח ותקבל 20 יהלומים.'),
      actions: [{ label: 'בוא נתחיל', kind: 'btn-primary', onClick: function () { setTimeout(function () { N.startTest(u); }, 50); } }, { label: 'אחר כך' }]
    });
  }
  function confirmJump(u) {
    N.modal({
      eyebrow: 'דילוג קדימה', title: 'לדלג ליחידה ' + (u.index + 1) + '?',
      body: h('div', { class: 'stack' },
        h('p', { class: 'muted' }, 'מבחן קצר של 12 שאלות מכל היחידות שלפני ״' + u.title + '״. צריך 75% כדי לעבור.'),
        h('p', { class: 'muted' }, 'אם תעבור, כל השיעורים הקודמים יסומנו כהושלמו, ותוכל תמיד לחזור אליהם.')),
      actions: [{ label: 'התחל מבחן דילוג', kind: 'btn-primary', onClick: function () { setTimeout(function () { N.startJump(u); }, 50); } }, { label: 'ביטול' }]
    });
  }
  function showGuide(u) {
    const body = h('div', { class: 'stack', style: { gap: '18px' } },
      u.guide.map(function (g) { return h('div', { class: 'stack', style: { gap: '6px' } }, h('h3', null, N.inline(g.h || '')), N.rich(g.p || '')); }),
      u.tips.length ? h('div', { class: 'card', style: { background: 'var(--spark-soft)', borderColor: 'transparent' } },
        h('div', { class: 'row' }, N.icon('bulb', { size: 20 }), h('b', null, 'טיפים מהיחידה')),
        h('ul', null, u.tips.map(function (t) { return h('li', null, N.inline(typeof t === 'string' ? t : (t.text || ''))); }))) : null);
    N.modal({ eyebrow: 'מדריך · יחידה ' + (u.index + 1), title: u.title, body: body });
  }
  function showStreakInfo() {
    const st = N.state.streak;
    const tNum = N.dayNum(N.today());
    const dots = [];
    for (let i = 6; i >= 0; i--) {
      const key = N.keyFromNum(tNum - i);
      const on = (N.state.days[key] || 0) > 0, frz = st.frozen.indexOf(key) >= 0;
      dots.push(h('div', { class: 'wd' + (on ? ' on' : frz ? ' frz' : '') }, h('i', null, on ? N.icon('check', { size: 16, sw: 3 }) : frz ? N.icon('snow', { size: 16 }) : null), N.DAYS_HE[N.weekday(key)]));
    }
    N.modal({
      eyebrow: 'הרצף שלך', title: st.count ? st.count + ' ימים ברצף' : 'עוד אין רצף',
      body: h('div', { class: 'stack', style: { gap: '16px' } },
        h('div', { class: 'week-dots', style: { justifyContent: 'center' } }, dots),
        h('div', { class: 'tile-grid' },
          N.stat('flame', st.best, 'השיא שלך', 'var(--flame)'),
          N.stat('snow', st.freezes + '/2', 'הקפאות רצף', 'var(--gem)')),
        h('p', { class: 'muted small' }, 'כל יום שבו אתה צובר XP שומר על הרצף. הקפאת רצף נכנסת לפעולה לבד אם פספסת יום. מקבלים אחת על כל שבוע רצוף, ואפשר גם לקנות בחנות.')),
      actions: [{ label: 'סגור', kind: 'btn-primary' }]
    });
  }

  // ---------- views ----------
  const VIEWS = {};
  VIEWS.learn = function (view) {
    view.append(todayCard());
    view.append(questsCard('only-narrow'));
    if (!N.units.length) {
      view.append(h('div', { class: 'card' }, h('h3', null, 'התוכן לא נטען'), h('p', { class: 'muted' }, 'נסה לרענן את הדף.')));
      return;
    }
    const next = N.nextStep();
    N.units.forEach(function (u) { view.append(unitSection(u, next)); });
    view.append(h('div', { class: 'stack', style: { justifyItems: 'center', textAlign: 'center', padding: '20px 0' } },
      N.mascot(next.type === 'done' ? 'happy' : 'idle', { size: 80 }),
      h('p', { class: 'muted' }, next.type === 'done' ? 'סיימת את כל המסלול. מכאן: חזרות, אתגרים יומיים ומשימות שטח.' : 'בסוף המסלול מחכה לך תעודת בוגר ניצוץ.')));
  };

  VIEWS.practice = function (view) {
    if (N.sub === 'tutor') { tutorView(view); return; }
    view.append(pageHead('תרגול', 'חזרות, אתגרים וסבבים מהירים. כאן מחזקים את מה שכבר למדת.'));
    const due = N.dueItems().length, seen = N.seenQuizItems().length;
    const aiOn = N.ai.available();
    const dailyDone = N.state.daily && N.state.daily.day === N.today() && N.state.daily.done;
    const writes = writePool();
    const lpool = N.lightningPool().length;
    function card(o) {
      return h('button', { class: 'prac', type: 'button', disabled: o.disabled, onclick: o.onClick },
        h('div', { class: 'pic', style: { background: o.color } }, N.icon(o.icon, { size: 26, fill: o.fill })),
        h('div', { class: 'stack', style: { gap: '4px' } }, h('h3', null, o.title), h('p', null, o.text), o.pills ? h('div', { class: 'row' }, o.pills) : null));
    }
    view.append(h('div', { class: 'prac-grid' },
      card({
        title: 'חזרה חכמה', icon: 'refresh', color: 'var(--violet)',
        text: due === 1 ? 'תרגיל אחד מחכה לחזרה.' : due ? due + ' תרגילים מחכים לחזרה, לפי מה שקשה לך.' : seen ? 'אין חזרות שמחכות. תרגול חופשי מהשיעורים שסיימת.' : 'נפתח אחרי השיעור הראשון.',
        disabled: !due && !seen, onClick: function () { N.startReview(); },
        pills: due ? [h('span', { class: 'pill' }, N.icon('clock', { size: 14 }), 'מחכה לך')] : null
      }),
      card({
        title: 'אתגר היום', icon: 'pen', color: 'var(--coral)',
        text: aiOn ? 'תרחיש חדש כל יום. כותבים פרומפט, וקלוד בודק ונותן משוב.' : 'אתגר כתיבה מהשיעורים שלך, עם בדיקה עצמית.',
        disabled: !aiOn && !writes.length, onClick: startDaily,
        pills: [aiOn ? h('span', { class: 'pill ai' }, N.icon('sparkle', { size: 14 }), 'קלוד בודק') : null, dailyDone ? h('span', { class: 'pill good' }, N.icon('check', { size: 14 }), 'הושלם היום') : null]
      }),
      card({
        title: 'סבב ברק', icon: 'bolt', fill: true, color: 'var(--sky)',
        text: lpool >= 5 ? 'דקה אחת של נכון או לא נכון. השיא שלך: ' + N.state.stats.lightning + '.' : 'נפתח אחרי שתשלים כמה שיעורים.',
        disabled: lpool < 5, onClick: function () { N.runLightning(); }
      }),
      card({
        title: 'שאל את ' + N.guideName(), icon: 'chat', color: 'var(--teal)',
        text: aiOn ? 'מורה פרטי לכל שאלה על קלוד, פרומפטים ובנייה עם AI.' : N.hosted ? 'המורה זמין כשקלוד מחובר לאפליקציה.' : 'חבר את קלוד בפרופיל כדי להפעיל את המורה.',
        disabled: !aiOn && N.hosted, onClick: function () { if (aiOn) N.go('practice', 'tutor'); else goAiSettings(); },
        pills: aiOn ? [h('span', { class: 'pill ai' }, N.icon('sparkle', { size: 14 }), 'קלוד')] : null
      })));
    const weak = weakLessons();
    if (weak.length) {
      view.append(h('div', { class: 'card' },
        h('div', { class: 'card-h' }, h('h3', null, 'נקודות לחיזוק'), h('span', { class: 'muted small' }, 'לפי הטעויות שלך')),
        weak.map(function (w) {
          return h('div', { class: 'row', style: { flexWrap: 'nowrap' } },
            h('div', { class: 'grow' }, h('b', null, w.l.title), h('div', { class: 'muted small' }, w.l.unit.title + ' · ' + w.n + ' טעויות')),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { N.startLessonPractice(w.l); } }, 'תרגל'));
        })));
    }
  };
  function goAiSettings() {
    N.go('me');
    setTimeout(function () { const el = document.getElementById('ai-card'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  }
  N.goAiSettings = goAiSettings;
  function weakLessons() {
    const by = {};
    Object.keys(N.state.items).forEach(function (k) {
      const it = N.itemByKey[k];
      if (!it) return;
      by[it.lessonId] = (by[it.lessonId] || 0) + N.state.items[k][2];
    });
    return Object.keys(by).filter(function (id) { return by[id] > 0 && N.lessonById[id]; })
      .sort(function (a, b) { return by[b] - by[a]; }).slice(0, 3)
      .map(function (id) { return { l: N.lessonById[id], n: by[id] }; });
  }
  function writePool() {
    const out = [];
    N.doneLessons().forEach(function (l) { l.items.forEach(function (it) { if (it.type === 'write') out.push(it); }); });
    return out;
  }
  async function startDaily() {
    const day = N.today();
    const d = N.state.daily;
    if (d && d.day === day && d.item) { run(d.item); return; }
    if (N.ai.available()) {
      let cancelled = false;
      const m = N.modal({ title: 'מכין את אתגר היום', body: N.thinking(N.guideName() + ' ממציא תרחיש בשבילך…'), onClose: function () { cancelled = true; } });
      try {
        const g = await N.ai.daily(N.currentUnit(), day);
        if (cancelled) return;
        m.close();
        const item = { type: 'write', key: 'daily:' + day, title: g.title, task: g.task, rubric: g.rubric, sample: g.sample };
        N.state.daily = { day: day, item: item, done: false };
        N.save();
        run(item);
        return;
      } catch (e) {
        if (cancelled) return;
        m.close();
        const msg = N.ai.errorText(e);
        if (msg) N.toast(msg, 'info');
      }
    }
    const pool = writePool().length ? writePool() : (N.lessons[0] ? N.lessons[0].unit.lessons.reduce(function (a, l) { return a.concat(l.items.filter(function (it) { return it.type === 'write'; })); }, []) : []);
    if (!pool.length) { N.toast('עוד אין אתגרי כתיבה זמינים', 'info'); return; }
    const item = pool[Math.floor(N.seeded('daily' + day)() * pool.length)];
    N.state.daily = { day: day, item: item, done: false };
    N.save();
    run(item);
    function run(item) { N.runSession({ mode: 'daily', items: [item] }); }
  }

  function tutorView(view) {
    view.append(h('div', { class: 'row', style: { flexWrap: 'nowrap' } },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'חזרה לתרגול', onclick: function () { N.go('practice'); } }, N.icon('back', { size: 26 })),
      h('div', { class: 'grow page-h' }, h('h1', null, 'שאל את ' + N.guideName()), h('p', { class: 'muted small' }, 'מורה פרטי שמכיר את מה שלמדת')),
      N.state.chat.length ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { N.state.chat = []; N.save(); N.render(); } }, N.icon('trash', { size: 16 }), 'שיחה חדשה') : null));
    if (!N.ai.available()) {
      view.append(h('div', { class: 'card' },
        h('p', { class: 'muted' }, N.hosted ? 'המורה עובד כשקלוד מחובר לאפליקציה ומאושר לשימוש.' : 'כדי לדבר עם ' + N.guideName() + ', חבר את קלוד עם מפתח API בפרופיל.'),
        N.hosted ? null : h('button', { class: 'btn btn-primary btn-sm', type: 'button', style: { justifySelf: 'start' }, onclick: goAiSettings }, 'לחיבור קלוד')));
      return;
    }
    const list = h('div', { class: 'chat', 'aria-live': 'polite' });
    function bubble(role, text, err) {
      const b = h('div', { class: 'msg ' + (role === 'user' ? 'me' : 'bot') + (err ? ' err' : '') });
      if (role === 'user') b.textContent = text; else b.append(N.rich(text));
      return b;
    }
    if (!N.state.chat.length) {
      list.append(h('div', { class: 'row', style: { flexWrap: 'nowrap', alignItems: 'flex-end', justifySelf: 'end' } },
        h('div', { class: 'msg bot' }, N.rich('היי! אני ' + N.guideName() + '. אפשר לשאול אותי כל דבר על קלוד, על כתיבת פרומפטים, על סוכנים ועל בנייה עם AI. אפשר גם לבקש ממני תרגיל קטן על מה שלמדת.')),
        N.mascot('happy', { size: 46 })));
    }
    N.state.chat.forEach(function (m) { list.append(bubble(m.role, m.content)); });
    const ta = h('textarea', { id: 'tutor-input', rows: '1', dir: 'auto', placeholder: 'מה תרצה לשאול?', 'aria-label': 'שאלה ל' + N.guideName() });
    const send = h('button', { class: 'btn btn-primary btn-sm', type: 'button', 'aria-label': 'שלח' }, N.icon('send', { size: 18 }));
    let busy = false;
    function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; }
    ta.addEventListener('input', grow);
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
    send.addEventListener('click', go);
    const suggest = h('div', { class: 'suggest' }, [
      'מה ההבדל בין פרויקט לארטיפקט?',
      'איך כותבים פרומפט טוב לסיכום דו״ח כספי?',
      'תן לי תרגיל קטן על מה שלמדתי',
      'מה זה MCP במילים פשוטות?'
    ].map(function (q) { return h('button', { type: 'button', onclick: function () { ta.value = q; go(); } }, q); }));
    if (N.state.chat.length) suggest.hidden = true;
    async function go() {
      const text = ta.value.trim();
      if (!text || busy) return;
      busy = true;
      send.disabled = true;
      suggest.hidden = true;
      ta.value = '';
      grow();
      N.state.chat.push({ role: 'user', content: text });
      list.append(bubble('user', text));
      const out = h('div', { class: 'msg bot' }, h('span', { class: 'dots' }, h('span'), h('span'), h('span')));
      list.append(out);
      out.scrollIntoView({ block: 'end', behavior: 'smooth' });
      let turns = N.state.chat.slice(-12);
      while (turns.length && turns[0].role !== 'user') turns = turns.slice(1);
      try {
        const r = await N.ai.tutor(turns.map(function (m) { return { role: m.role, content: m.content }; }), function (u) { N.clear(out).append(N.rich(u.text)); });
        N.state.chat.push({ role: 'assistant', content: r.text });
        N.state.stats.tutor++;
        N.questEvent('tutor', 1);
        N.checkBadges();
        N.save();
        N.flushToasts();
      } catch (e) {
        const msg = N.ai.errorText(e);
        N.clear(out);
        out.classList.add('err');
        if (e && e.text) out.append(N.rich(e.text));
        out.append(h('p', null, msg || 'משהו השתבש.'));
      } finally {
        busy = false;
        send.disabled = false;
      }
    }
    view.append(list, suggest, h('div', { class: 'composer' }, ta, send));
    if (N.state.chat.length) requestAnimationFrame(function () { list.lastChild && list.lastChild.scrollIntoView({ block: 'end' }); });
  }

  VIEWS.missions = function (view) {
    const total = N.missions.length, done = Object.keys(N.state.missions).length;
    view.append(pageHead('משימות שטח', 'לומדים הכי טוב כשעושים. כל משימה היא תרגול אמיתי בקלוד, מחוץ לאפליקציה. בסוף כותבים מה למדת.'));
    view.append(h('div', { class: 'card' },
      h('div', { class: 'card-h' }, h('b', null, 'השלמת ' + done + ' מתוך ' + total), N.icon('flag', { size: 22, cls: 'muted' })),
      h('div', { class: 'qbar' }, h('i', { style: { width: (total ? Math.round(done / total * 100) : 0) + '%', background: 'var(--good)' } }))));
    N.units.forEach(function (u) {
      if (!u.missions.length) return;
      view.append(h('section', { class: 'stack u-' + u.color },
        h('div', { class: 'row' }, h('span', { class: 'eyebrow', style: { color: 'var(--u-ink)' } }, 'יחידה ' + (u.index + 1)), h('b', null, u.title)),
        u.missions.map(function (m) {
          const open = N.missionUnlocked(m), rec = N.state.missions[m.id];
          return h('button', { class: 'mission' + (rec ? ' done' : ''), type: 'button', disabled: !open, onclick: function () { openMission(m); } },
            h('div', { class: 'mic' }, N.icon(rec ? 'check' : open ? 'flag' : 'lock', { size: 22, sw: rec ? 3 : 2.2 })),
            h('div', { class: 'stack', style: { gap: '2px', minWidth: '0' } }, h('h4', null, m.title), h('p', null, open ? (m.why || '') : 'נפתח אחרי השיעור הראשון ביחידה')),
            h('span', { class: 'pill' }, N.ltr('+' + (m.xp || 30) + ' XP')));
        })));
    });
  };
  function openMission(m) {
    const rec = N.state.missions[m.id];
    const ta = h('textarea', { class: 'write-area', id: 'reflect-' + m.id, dir: 'auto', style: { minHeight: '120px' }, placeholder: 'מה עשית, מה יצא, ומה למדת?' });
    ta.value = rec ? rec.note || '' : '';
    const fbBox = h('div', { class: 'fb-ai', hidden: true });
    const doneBtn = h('button', { class: 'btn btn-good btn-block', type: 'button' }, N.icon('check', { size: 18, sw: 3 }), rec ? 'עדכן' : ['סיימתי · ', N.ltr('+' + (m.xp || 30) + ' XP')]);
    const aiBtn = N.ai.available() ? h('button', { class: 'btn btn-ghost btn-block', type: 'button' }, N.icon('sparkle', { size: 18 }), 'קבל משוב מקלוד') : null;
    const body = h('div', { class: 'stack', style: { gap: '16px' } },
      m.why ? h('p', { class: 'muted' }, N.inline(m.why)) : null,
      h('div', { class: 'stack', style: { gap: '8px' } }, h('span', { class: 'eyebrow' }, 'מה עושים'),
        h('div', { class: 'steps' }, (m.steps || []).map(function (s) { return h('div', { class: 'step' }, h('div', null, N.inline(s))); }))),
      h('div', { class: 'stack', style: { gap: '8px' } }, h('span', { class: 'eyebrow' }, 'אחרי שעשית'),
        h('b', null, N.inline(m.reflect || 'מה למדת?')), ta),
      fbBox,
      h('div', { class: 'sheet-actions' }, doneBtn, aiBtn),
      rec ? h('p', { class: 'muted small' }, 'הושלמה ב־' + new Date(rec.at).toLocaleDateString('he-IL')) : null);
    const md = N.modal({ eyebrow: 'משימת שטח · ' + m.unit.title, title: m.title, body: body, focus: '.btn' });
    doneBtn.addEventListener('click', function () {
      const note = ta.value.trim();
      if (note.length < 10) { ta.focus(); N.toast('כתוב כמה מילים על מה שעשית', 'pen'); return; }
      const first = !N.state.missions[m.id];
      N.state.missions[m.id] = { at: first ? Date.now() : N.state.missions[m.id].at, note: note };
      if (first) {
        const res = N.addXP(m.xp || 30);
        N.sfx('done');
        N.confetti(90);
        N.toast('משימה הושלמה! קיבלת ' + (m.xp || 30) + ' XP', 'flag');
        if (res.streak) N.pendingToasts.push({ text: 'הרצף שלך: ' + res.streak.count + ' ימים', icon: 'flame' });
      }
      N.checkBadges();
      N.save(true);
      md.close();
      N.render();
      setTimeout(N.flushToasts, 500);
    });
    if (aiBtn) aiBtn.addEventListener('click', function () {
      const note = ta.value.trim();
      if (note.length < 10) { ta.focus(); N.toast('כתוב קודם מה עשית', 'pen'); return; }
      aiBtn.disabled = true;
      fbBox.hidden = false;
      N.clear(fbBox).append(h('span', { class: 'dots' }, h('span'), h('span'), h('span')));
      N.ai.missionFeedback(m, note, function (u) { N.clear(fbBox).append(N.rich(u.text)); })
        .catch(function (e) { const msg = N.ai.errorText(e); N.clear(fbBox).append(h('p', { class: 'muted' }, msg || 'משהו השתבש.')); })
        .then(function () { aiBtn.disabled = false; });
    });
  }

  VIEWS.words = function (view) {
    const seen = {};
    const all = N.glossary.filter(function (g) { const k = N.plain(g.term).trim(); if (seen[k]) return false; seen[k] = true; return true; });
    const open = all.filter(N.glossaryUnlocked);
    view.append(pageHead('מילון', 'נפתחו ' + open.length + ' מתוך ' + all.length + ' מונחים. כל שיעור פותח מונחים חדשים.'));
    const input = h('input', { class: 'search', id: 'gloss-search', type: 'search', placeholder: 'חיפוש מונח…', 'aria-label': 'חיפוש במילון' });
    const list = h('div', { class: 'stack' });
    function draw() {
      const q = input.value.trim().toLowerCase();
      N.clear(list);
      const match = function (g) { return !q || (N.plain(g.term) + ' ' + (g.en || '') + ' ' + N.plain(g.def)).toLowerCase().indexOf(q) >= 0; };
      const o = open.filter(match);
      o.forEach(function (g) {
        list.append(h('div', { class: 'term u-' + g.unit.color },
          h('h4', null, N.inline(g.term), g.en ? h('code', { class: 'c', dir: 'ltr' }, g.en) : null),
          h('p', null, N.inline(g.def || ''))));
      });
      if (!q) {
        all.filter(function (g) { return !N.glossaryUnlocked(g); }).forEach(function (g) {
          const l = g.lesson && N.lessonById[g.lesson];
          list.append(h('div', { class: 'term locked' },
            h('h4', null, N.icon('lock', { size: 16 }), '• • • • •'),
            h('p', null, 'נפתח בשיעור: ' + (l ? l.title : g.unit.title))));
        });
      }
      if (!list.childNodes.length) list.append(h('p', { class: 'muted' }, 'לא נמצאו מונחים.'));
    }
    input.addEventListener('input', draw);
    view.append(input, list);
    draw();
  };

  VIEWS.me = function (view) {
    const s = N.state, li = N.levelInfo(s.xp);
    const acc = s.stats.answered ? Math.round(s.stats.correct / s.stats.answered * 100) : 0;
    const wAvg = s.writes.length ? Math.round(s.writes.reduce(function (a, w) { return a + w.s; }, 0) / s.writes.length) : null;
    view.append(h('section', { class: 'card hero-me' },
      N.mascot('happy', { anim: 'bob' }),
      h('div', { class: 'stack', style: { gap: '6px' } },
        h('span', { class: 'eyebrow' }, 'רמה ' + li.lvl),
        h('h1', { style: { fontSize: '1.6rem' } }, li.title),
        h('div', { class: 'lvlbar' }, h('i', { style: { width: Math.round(li.into / li.need * 100) + '%' } })),
        h('span', { class: 'muted small' }, li.into + ' / ' + li.need + ' XP לרמה הבאה'))));
    view.append(h('div', { class: 'tile-grid' },
      N.stat('flame', s.streak.count, 'רצף נוכחי', 'var(--flame)'),
      N.stat('crown', s.streak.best, 'שיא רצף', 'var(--spark-deep)'),
      N.stat('bolt', N.fmt(s.xp), 'סך הכל XP', 'var(--spark-deep)'),
      N.stat('star', N.doneLessons().length + '/' + N.lessons.length, 'שיעורים', 'var(--violet)'),
      N.stat('target', acc + '%', 'דיוק', 'var(--good)'),
      N.stat('pen', wAvg == null ? '—' : wAvg, 'ממוצע כתיבה', 'var(--coral)'),
      N.stat('clock', Math.round(s.stats.ms / 60000), 'דקות למידה', 'var(--gem)'),
      N.stat('gem', s.gems, 'יהלומים', 'var(--gem)')));
    view.append(avatarCard(), weekCard(), heatCard(), badgesCard(), shopCard(), N.syncCard ? N.syncCard() : null, aiCard(), settingsCard(), backupCard());
  };
  function aiCard() {
    if (N.hosted) {
      return h('div', { class: 'card', id: 'ai-card' },
        h('h3', null, 'קלוד בתוך האפליקציה'),
        h('p', { class: 'muted' }, N.ai.available() ? 'מחובר דרך החשבון שלך בקלוד. הבדיקות נספרות במכסה הרגילה שלך.' : 'קלוד לא זמין בתצוגה הזו, אז הבדיקה עצמית.'));
    }
    const has = !!N.ai.apiKey();
    const out = h('p', { class: 'muted small', 'aria-live': 'polite' });
    const input = h('input', {
      class: 'search', id: 'api-key', type: 'password', autocomplete: 'off', spellcheck: 'false', dir: 'ltr',
      placeholder: has ? 'המפתח שמור. אפשר להדביק מפתח חדש' : 'sk-ant-…', 'aria-label': 'מפתח API'
    });
    const save = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, 'שמור');
    save.addEventListener('click', function () {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      N.ai.setApiKey(v);
      input.value = '';
      out.textContent = 'בודק את החיבור…';
      save.disabled = true;
      N.ai.test().then(function () { N.toast('קלוד מחובר!', 'sparkle'); N.render(); goAiSettings(); })
        .catch(function (e) { out.textContent = N.ai.errorText(e) || 'החיבור נכשל.'; save.disabled = false; });
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') save.click(); });
    const test = has ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, 'בדוק חיבור') : null;
    if (test) test.addEventListener('click', function () {
      out.textContent = 'בודק…';
      N.ai.test().then(function (r) { out.textContent = 'עובד. קלוד ענה: ' + r.text.trim().slice(0, 40); })
        .catch(function (e) { out.textContent = N.ai.errorText(e) || 'החיבור נכשל.'; });
    });
    const remove = has ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { N.ai.setApiKey(''); N.render(); goAiSettings(); } }, 'נתק') : null;
    const models = h('div', { class: 'seg' }, N.ai.MODELS.map(function (m) {
      const on = N.ai.model() === m.id;
      return h('button', { type: 'button', class: on ? 'on' : '', 'aria-pressed': String(on), onclick: function () { N.ai.setModel(m.id); N.render(); goAiSettings(); } },
        h('b', { dir: 'ltr' }, m.name), h('span', null, m.note));
    }));
    return h('div', { class: 'card', id: 'ai-card' },
      h('div', { class: 'card-h' }, h('h3', null, 'קלוד בתוך האפליקציה'), h('span', { class: 'pill ai' }, N.icon('sparkle', { size: 14 }), 'אופציונלי')),
      h('p', { class: 'muted' }, 'עם מפתח API, קלוד בודק את מה שאתה כותב, מסביר לעומק, ממציא לך אתגר יומי ומשמש כמורה פרטי. בלי מפתח הכל עובד, והבדיקה עצמית מול תשובה לדוגמה.'),
      h('div', { class: 'sync' + (has ? ' cloud' : '') }, h('span', { class: 'dot' }), h('span', null, has ? 'מחובר עם מפתח API' : 'לא מחובר')),
      h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('div', { class: 'grow' }, input), save),
      out,
      has ? h('div', { class: 'row' }, test, remove) : null,
      h('div', { class: 'stack', style: { gap: '8px' } }, h('b', null, 'מודל'), models),
      h('div', { class: 'note' }, N.icon('info', { size: 20 }),
        h('div', { class: 'rich' },
          h('p', null, 'המפתח נשמר רק בדפדפן במחשב הזה, ונשלח רק לשרת של קלוד.'),
          h('p', null, 'יוצרים מפתח באתר ', h('a', { href: 'https://console.anthropic.com', target: '_blank', rel: 'noopener' }, N.ltr('console.anthropic.com')),
            '. התשלום לפי שימוש ונפרד מהמנוי לקלוד, אז כדאי להגדיר שם תקרת הוצאה חודשית.'))));
  }
  function backupCard() {
    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', id: 'restore-file', hidden: true });
    fileIn.addEventListener('change', function () {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = function () { restore(String(r.result)); };
      r.readAsText(f);
      fileIn.value = '';
    });
    return h('div', { class: 'card' },
      h('h3', null, 'גיבוי והעברה'),
      h('p', { class: 'muted' }, N.hosted ? 'אפשר להעתיק את ההתקדמות ולהעביר אותה לגרסה העצמאית של ניצוץ.' : 'ההתקדמות נשמרת בדפדפן במחשב הזה. שמור גיבוי מדי פעם, ותוכל להעביר אותה למחשב אחר.'),
      h('div', { class: 'row' },
        N.hosted ? null : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: downloadBackup }, N.icon('copy', { size: 16 }), 'הורד קובץ גיבוי'),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function (e) { N.copyText(JSON.stringify(N.state), e.currentTarget); } }, 'העתק גיבוי'),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: pasteRestore }, 'שחזר מטקסט'),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { fileIn.click(); } }, 'שחזר מקובץ')),
      fileIn);
  }
  function downloadBackup() {
    const blob = new Blob([JSON.stringify(N.state, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: 'nitzutz-backup-' + N.today() + '.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }
  function pasteRestore() {
    const ta = h('textarea', { class: 'write-area', id: 'restore-text', dir: 'ltr', style: { minHeight: '140px' }, placeholder: 'הדבק כאן את טקסט הגיבוי' });
    N.modal({
      title: 'שחזור מגיבוי',
      body: h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'הדבק את הטקסט שהעתקת בכפתור ״העתק גיבוי״.'), ta),
      focus: 'textarea',
      actions: [{ label: 'המשך', kind: 'btn-primary', onClick: function () { return restore(ta.value); } }, { label: 'ביטול' }]
    });
  }
  function restore(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { N.toast('הגיבוי לא תקין', 'info'); return false; }
    if (!obj || typeof obj !== 'object' || typeof obj.xp !== 'number' || !obj.profile) { N.toast('זה לא נראה כמו גיבוי של ניצוץ', 'info'); return false; }
    setTimeout(function () {
      N.modal({
        title: 'להחליף את ההתקדמות?',
        body: h('p', { class: 'muted' }, (function () {
          const n = Object.keys(obj.lessons || {}).length;
          return 'בגיבוי יש ' + N.fmt(obj.xp) + ' XP ו' + (n === 1 ? 'שיעור אחד שהושלם' : '־' + n + ' שיעורים שהושלמו') + '. ההתקדמות הנוכחית תוחלף בו.';
        })()),
        actions: [
          { label: 'כן, שחזר', kind: 'btn-primary', onClick: function () { N.state = N.migrate(obj); N.state.updatedAt = Date.now(); N.save(true); N.toast('ההתקדמות שוחזרה', 'check'); setTimeout(function () { N.go('learn'); }, 50); } },
          { label: 'ביטול' }
        ]
      });
    }, 30);
    return true;
  }
  function weekCard() {
    const goal = N.state.profile.goal, tNum = N.dayNum(N.today());
    const vals = [];
    for (let i = 6; i >= 0; i--) { const k = N.keyFromNum(tNum - i); vals.push({ k: k, v: N.state.days[k] || 0, today: i === 0 }); }
    const max = Math.max(goal, Math.max.apply(null, vals.map(function (x) { return x.v; })));
    const sum = vals.reduce(function (a, x) { return a + x.v; }, 0);
    const bars = h('div', { class: 'bars' },
      h('div', { class: 'goal-line', style: { bottom: 'calc(' + (goal / max).toFixed(4) + ' * (100% - 42px) + 22px)' }, 'aria-hidden': 'true' }),
      vals.map(function (x) {
        return h('div', { class: 'bar' + (x.v >= goal ? ' met' : '') + (x.today ? ' today' : '') },
          h('span', { class: 'bv' }, x.v ? String(x.v) : ''),
          h('div', { class: 'track' }, h('span', { class: 'bt', style: { height: Math.round(x.v / max * 100) + '%' } })),
          h('span', { class: 'bd' }, N.DAYS_HE[N.weekday(x.k)]));
      }));
    return h('div', { class: 'card' },
      h('div', { class: 'card-h' }, h('h3', null, 'השבוע שלך'), h('span', { class: 'muted small' }, N.fmt(sum) + ' XP · הקו המקווקו הוא היעד')),
      bars);
  }
  function heatCard() {
    const weeks = 18, tNum = N.dayNum(N.today()), wd = N.weekday(N.today());
    const start = tNum - wd - (weeks - 1) * 7;
    const grid = h('div', { class: 'heat', role: 'img', 'aria-label': 'פעילות ב־18 השבועות האחרונים' });
    const frozen = N.state.streak.frozen;
    for (let d = 0; d < weeks * 7; d++) {
      const n = start + d, k = N.keyFromNum(n), v = N.state.days[k] || 0;
      let cls = '';
      if (n > tNum) cls = 'fut';
      else if (v > 0) { const r = v / N.state.profile.goal; cls = r >= 1.5 ? 'l4' : r >= 1 ? 'l3' : r >= 0.5 ? 'l2' : 'l1'; }
      else if (frozen.indexOf(k) >= 0) cls = 'frz';
      if (n === tNum) cls += ' today';
      grid.append(h('i', { class: cls, title: k + (v ? ' · ' + v + ' XP' : '') }));
    }
    const active = Object.keys(N.state.days).filter(function (k) { return N.state.days[k] > 0; }).length;
    return h('div', { class: 'card' },
      h('div', { class: 'card-h' }, h('h3', null, 'לוח פעילות'), h('span', { class: 'muted small' }, active + ' ימי למידה')),
      grid,
      h('div', { class: 'row muted small', style: { gap: '6px' } }, 'פחות',
        ['var(--surface-2)', 'color-mix(in srgb, var(--spark) 30%, var(--surface-2))', 'color-mix(in srgb, var(--spark) 55%, var(--surface-2))', 'color-mix(in srgb, var(--spark) 80%, var(--surface-2))', 'var(--spark-deep)'].map(function (c) { return h('i', { style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: c } }); }),
        'יותר'));
  }
  function badgesCard() {
    const got = N.BADGES.filter(function (b) { return N.state.badges[b.id]; }).length;
    return h('div', { class: 'card' },
      h('div', { class: 'card-h' }, h('h3', null, 'הישגים'), h('span', { class: 'muted small' }, got + ' מתוך ' + N.BADGES.length)),
      h('div', { class: 'badges' }, N.BADGES.map(function (b) {
        const on = !!N.state.badges[b.id];
        return h('div', { class: 'badge' + (on ? '' : ' locked'), title: b.d },
          h('div', { class: 'bic' }, N.icon(on ? b.icon : 'lock', { size: 24, fill: on && (b.icon === 'flame' || b.icon === 'star' || b.icon === 'bolt' || b.icon === 'crown' || b.icon === 'trophy') })),
          h('b', null, b.t),
          h('span', { class: 'muted small' }, b.d));
      })));
  }
  function shopCard() {
    const s = N.state;
    const items = [];
    items.push(h('div', { class: 'shop-item' },
      h('div', { class: 'shop-ic' }, N.icon('snow', { size: 24 })),
      h('div', null, h('b', null, 'הקפאת רצף'), h('div', { class: 'muted small' }, 'שומרת על הרצף ביום שפספסת. יש לך ' + s.streak.freezes + ' מתוך 2.')),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', disabled: s.streak.freezes >= 2 || s.gems < 50, onclick: function () { buy('freeze', 50); } }, N.icon('gem', { size: 16, fill: true }), '50')));
    N.SKINS.forEach(function (sk) {
      const owned = s.owned.indexOf(sk.id) >= 0, on = s.skin === sk.id;
      items.push(h('div', { class: 'shop-item' },
        N.mascot('happy', { skin: sk.id, avatar: 'spark' }),
        h('div', null, h('b', null, 'ניצי: ' + sk.name), h('div', { class: 'muted small' }, on ? 'בשימוש עכשיו' : owned ? 'שלך' : 'צבע חדש לניצי')),
        on ? h('span', { class: 'pill good' }, N.icon('check', { size: 14 }), 'פעיל')
          : owned ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { s.skin = sk.id; N.save(); N.render(); } }, 'בחר')
            : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', disabled: s.gems < sk.price, onclick: function () { buy('skin:' + sk.id, sk.price); } }, N.icon('gem', { size: 16, fill: true }), String(sk.price))));
    });
    return h('div', { class: 'card', id: 'shop' },
      h('div', { class: 'card-h' }, h('h3', null, 'חנות'), h('span', { class: 'pill' }, N.icon('gem', { size: 14, fill: true }), s.gems + ' יהלומים')),
      h('div', { class: 'stack', style: { gap: '14px' } }, items));
  }
  function buy(what, price) {
    const s = N.state;
    if (s.gems < price) return;
    s.gems -= price;
    if (what === 'freeze') { s.streak.freezes = Math.min(2, s.streak.freezes + 1); N.toast('הקפאת רצף נוספה', 'snow'); }
    else { const id = what.split(':')[1]; s.owned.push(id); s.skin = id; N.toast('ניצי בצבע חדש!', 'sparkle'); }
    N.sfx('gem');
    N.save();
    N.render();
    setTimeout(function () { const el = document.getElementById('shop'); if (el) el.scrollIntoView({ block: 'center' }); }, 30);
  }
  const GOALS = [
    { v: 20, t: 'קליל', d: 'כ־5 דקות ביום' },
    { v: 40, t: 'רגיל', d: 'כ־10 דקות ביום' },
    { v: 70, t: 'רציני', d: 'כ־15 דקות ביום' },
    { v: 100, t: 'אינטנסיבי', d: 'כ־20 דקות ביום' }
  ];
  function goalSeg(onPick) {
    return h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'יעד יומי' }, GOALS.map(function (g) {
      const on = N.state.profile.goal === g.v;
      return h('button', { type: 'button', class: on ? 'on' : '', role: 'radio', 'aria-checked': String(on), onclick: function () { N.state.profile.goal = g.v; N.save(); onPick(); } },
        h('b', null, g.t), h('span', null, g.d, ' · ', N.ltr(g.v + ' XP')));
    }));
  }
  // ---------- guide picker ----------
  function avatarGrid(onPick) {
    return h('div', { class: 'avatar-grid', role: 'radiogroup', 'aria-label': 'בחירת מדריך' }, N.AVATARS.map(function (a) {
      const on = N.avatar().id === a.id;
      return h('button', {
        type: 'button', class: 'avatar-opt' + (on ? ' on' : ''), role: 'radio', 'aria-checked': String(on),
        onclick: function () {
          if (N.state.avatar === a.id) return;
          N.state.avatar = a.id;
          N.save();
          N.sfx('tap');
          onPick(a);
        }
      }, N.mascot(on ? 'happy' : 'idle', { avatar: a.id, anim: on ? 'bob' : null }), h('b', null, a.name), h('span', null, a.desc));
    }));
  }
  function avatarCard() {
    return h('div', { class: 'card', id: 'avatar-card' },
      h('div', { class: 'card-h' }, h('h3', null, 'המדריך שלך'), h('span', { class: 'muted small' }, 'מלווה אותך בשיעורים ובצ׳אט')),
      avatarGrid(function (a) {
        N.render();
        setTimeout(function () { const el = document.getElementById('avatar-card'); if (el) el.scrollIntoView({ block: 'center' }); }, 30);
        N.toast(a.name + ' מצטרף אליך!', 'sparkle');
      }));
  }
  const THEMES = [
    { v: 'system', t: 'אוטומטי', icon: 'phone' },
    { v: 'light', t: 'בהיר', icon: 'sun' },
    { v: 'dark', t: 'כהה', icon: 'moon' }
  ];
  function themeSeg() {
    const cur = N.getTheme();
    return h('div', { class: 'seg theme-seg', role: 'radiogroup', 'aria-label': 'מצב תצוגה' }, THEMES.map(function (o) {
      const on = cur === o.v;
      return h('button', { type: 'button', class: on ? 'on' : '', role: 'radio', 'aria-checked': String(on), onclick: function () { N.setTheme(o.v); N.render(); setTimeout(function () { const el = document.getElementById('settings-card'); if (el) el.scrollIntoView({ block: 'center' }); }, 30); } },
        N.icon(o.icon, { size: 20 }), h('b', null, o.t));
    }));
  }

  function settingsCard() {
    const p = N.state.profile;
    const snd = h('button', { class: 'toggle' + (p.sound ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': String(!!p.sound), 'aria-label': 'צלילים' });
    snd.addEventListener('click', function () { p.sound = !p.sound; N.save(); snd.classList.toggle('on', p.sound); snd.setAttribute('aria-checked', String(p.sound)); if (p.sound) N.sfx('good'); });
    return h('div', { class: 'card', id: 'settings-card' },
      h('h3', null, 'הגדרות'),
      N.hosted ? null : h('div', { class: 'stack', style: { gap: '8px' } }, h('b', null, 'מצב תצוגה'), themeSeg(), h('span', { class: 'muted small' }, 'נשמר בכל מכשיר בנפרד.')),
      h('div', { class: 'stack', style: { gap: '8px' } }, h('b', null, 'יעד יומי'), goalSeg(function () { N.render(); })),
      h('div', { class: 'switch' }, h('div', null, h('b', null, 'צלילים'), h('div', { class: 'muted small' }, 'צלילים קצרים לתשובות ולהישגים')), snd),
      h('div', { class: 'switch' }, h('div', null, h('b', null, 'שמירה'), syncLine())),
      h('div', { class: 'switch' }, h('div', null, h('b', null, 'איפוס התקדמות'), h('div', { class: 'muted small' }, 'מוחק את כל ההתקדמות ומתחיל מההתחלה')),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: confirmReset }, N.icon('trash', { size: 16 }), 'איפוס')));
  }
  function confirmReset() {
    N.modal({
      title: 'לאפס את כל ההתקדמות?',
      body: h('p', { class: 'muted' }, 'כל השיעורים, ה־XP, הרצף וההישגים יימחקו' + (N.store.ref ? ', גם מהענן' : '') + '. אי אפשר לבטל את זה, אלא אם שמרת גיבוי.'),
      actions: [
        { label: 'ביטול', kind: 'btn-primary' },
        { label: 'כן, לאפס הכל', kind: 'btn-bad', onClick: function () { N.state = N.fresh(); N.save(true); N.go('learn'); } }
      ]
    });
  }

  // ---------- onboarding ----------
  function renderOnboarding(app) {
    let step = 0;
    const p = N.state.profile;
    function draw() {
      N.clear(app);
      let content;
      if (step === 0) {
        content = [
          N.mascot('happy', { anim: 'jump' }),
          h('h1', null, 'היי, אני ניצי'),
          h('p', null, 'אני אלמד אותך לעבוד עם קלוד ברמה של מקצוען: פרומפטים, כלים, סוכנים ובנייה עם AI. כמה דקות ביום, משימות קצרות ומגוונות, וקלוד עצמו בודק את מה שאתה כותב.'),
          h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: function () { step = 1; draw(); } }, 'יאללה, מתחילים')
        ];
      } else if (step === 1) {
        const opts = [
          { v: 'new', t: 'כמעט לא השתמשתי בקלוד' },
          { v: 'some', t: 'משתמש מדי פעם, בעיקר בצ׳אט' },
          { v: 'lots', t: 'משתמש הרבה, ורוצה להעמיק' }
        ];
        content = [
          N.mascot('think', { anim: 'bob' }),
          h('div', { class: 'speech' }, 'כמה אתה כבר מכיר את קלוד?'),
          h('div', { class: 'choice' }, opts.map(function (o) {
            return h('button', { class: 'opt' + (p.exp === o.v ? ' sel' : ''), type: 'button', onclick: function () { p.exp = o.v; step = 2; draw(); } }, h('span', { class: 'opt-t' }, o.t));
          }))
        ];
      } else if (step === 2) {
        content = [
          h('div', { class: 'speech' }, 'מי ילווה אותך בדרך?'),
          avatarGrid(draw),
          h('p', { class: 'small' }, 'אפשר להחליף בכל רגע בפרופיל.'),
          h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: function () { step = 3; draw(); } }, 'ממשיכים עם ' + N.guideName())
        ];
      } else if (step === 3) {
        content = [
          N.mascot('idle', { anim: 'bob' }),
          h('div', { class: 'speech' }, 'מה היעד היומי שלך?'),
          goalSeg(draw),
          h('p', { class: 'small' }, 'אפשר לשנות בכל רגע בפרופיל.'),
          h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: function () { step = 4; draw(); } }, 'המשך')
        ];
      } else {
        content = [
          N.mascot('happy', { anim: 'jump' }),
          h('h1', null, 'מוכן?'),
          h('p', null, p.exp === 'lots'
            ? 'נתחיל ביחידה הראשונה. אם החומר מוכר לך, בכל יחידה נעולה יש כפתור ״דלג לכאן״ עם מבחן קצר.'
            : 'נתחיל מהבסיס: איך קלוד בכלל חושב. בכל יום מחכים לך שיעור, משימות יומיות וטיפ.'),
          h('div', { class: 'note', style: { textAlign: 'start' } }, N.icon('sparkle', { size: 20 }),
            h('span', null, N.hosted
              ? 'בפעם הראשונה שקלוד יבדוק תשובה שלך, תתבקש לאשר לאפליקציה להשתמש בקלוד. זה מה שמאפשר משוב אמיתי.'
              : 'רוצה שקלוד יבדוק את מה שאתה כותב? אפשר לחבר מפתח API בפרופיל. בלי זה הכל עובד, והבדיקה עצמית.')),
          h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: function () { p.onboarded = true; N.ensureQuests(); N.save(true); N.route = 'learn'; N.render(); } }, 'לשיעור הראשון')
        ];
      }
      app.append(h('div', { class: 'onb' }, content));
    }
    draw();
  }
})();
