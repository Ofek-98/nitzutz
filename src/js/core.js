(function () {
  'use strict';
  const N = window.N = window.N || {};
  document.documentElement.lang = 'he';
  document.documentElement.dir = 'rtl';

  // ---------- events ----------
  const handlers = {};
  N.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); };
  N.emit = function (ev, data) {
    (handlers[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } });
  };

  // ---------- DOM ----------
  N.h = function (tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'text') el.textContent = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { append(el, k); }); return; }
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  N.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  // isolate a short Latin/number run such as "+10 XP" so it keeps its order inside Hebrew text
  N.ltr = function (text) { return N.h('bdi', { dir: 'ltr' }, text); };

  // ---------- rich text: **bold**, `code`, lists, paragraphs ----------
  N.inline = function (text) {
    const frag = document.createDocumentFragment();
    const s = String(text == null ? '' : text);
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) frag.append(s.slice(last, m.index));
      const tok = m[0];
      if (tok.charAt(0) === '*') {
        const b = document.createElement('strong');
        b.append(N.inline(tok.slice(2, -2)));
        frag.append(b);
      } else {
        const c = document.createElement('code');
        c.className = 'c';
        c.dir = 'ltr';
        c.textContent = tok.slice(1, -1);
        frag.append(c);
      }
      last = m.index + tok.length;
    }
    if (last < s.length) frag.append(s.slice(last));
    return frag;
  };
  const LIST_RE = /^\s*([-•*]|\d+[.)])\s+/;
  N.rich = function (text, cls) {
    const wrap = document.createElement('div');
    wrap.className = 'rich' + (cls ? ' ' + cls : '');
    const lines = String(text == null ? '' : text).replace(/\r/g, '').split('\n');
    let para = null, list = null;
    lines.forEach(function (raw) {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) { para = null; list = null; return; }
      const hm = line.match(/^\s*#{1,4}\s+(.*)$/);
      if (hm) {
        list = null;
        para = null;
        const p = document.createElement('p');
        const b = document.createElement('strong');
        b.append(N.inline(hm[1]));
        p.append(b);
        wrap.append(p);
        return;
      }
      if (LIST_RE.test(line)) {
        para = null;
        const ordered = /^\s*\d/.test(line);
        if (!list || (list.tagName === 'OL') !== ordered) {
          list = document.createElement(ordered ? 'ol' : 'ul');
          wrap.append(list);
        }
        const li = document.createElement('li');
        li.append(N.inline(line.replace(LIST_RE, '')));
        list.append(li);
        return;
      }
      list = null;
      if (!para) { para = document.createElement('p'); wrap.append(para); }
      else para.append(document.createElement('br'));
      para.append(N.inline(line));
    });
    return wrap;
  };
  N.promptBlock = function (text, label) {
    const box = N.h('div', { class: 'prompt' });
    if (label) box.append(N.h('span', { class: 'prompt-label' }, label));
    String(text == null ? '' : text).split('\n').forEach(function (line) {
      if (!line.trim()) { box.append(N.h('div', { class: 'pl blank' })); return; }
      const d = N.h('div', { class: 'pl', dir: 'auto' });
      d.append(N.inline(line));
      box.append(d);
    });
    return box;
  };

  // ---------- misc utils ----------
  N.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  N.pick = function (arr, n) { return N.shuffle(arr).slice(0, n); };
  N.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  N.seeded = function (seedStr) {
    let a = hash(seedStr);
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  N.fmt = function (n) { return Number(n || 0).toLocaleString('he-IL'); };

  // ---------- dates (local days) ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  N.dayKey = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  N.today = function () { return N.dayKey(new Date()); };
  N.dayNum = function (key) {
    if (!key) return null;
    const p = key.split('-').map(Number);
    return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5);
  };
  N.keyFromNum = function (n) {
    const d = new Date(n * 864e5);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  };
  N.DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  N.weekday = function (key) { const n = N.dayNum(key); return (n + 4) % 7; }; // 1970-01-01 was a Thursday (4)

  // ---------- state ----------
  function defaults() {
    return {
      v: 1,
      createdAt: Date.now(),
      updatedAt: 0,
      profile: { onboarded: false, goal: 40, sound: true, exp: 'some' },
      xp: 0,
      gems: 25,
      streak: { count: 0, best: 0, last: null, freezes: 0, frozen: [] },
      days: {},
      lessons: {},
      units: {},
      items: {},
      quests: { day: null, list: [], bonus: false },
      missions: {},
      badges: {},
      writes: [],
      stats: { answered: 0, correct: 0, perfect: 0, bestCombo: 0, lightning: 0, reviews: 0, writes: 0, lessons: 0, ms: 0, tutor: 0 },
      skin: 'spark',
      owned: ['spark'],
      chat: [],
      daily: null
    };
  }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, src) {
    if (!isObj(src)) return base;
    Object.keys(src).forEach(function (k) {
      if (isObj(base[k]) && isObj(src[k])) base[k] = merge(base[k], src[k]);
      else base[k] = src[k];
    });
    return base;
  }
  N.migrate = function (s) { return merge(defaults(), JSON.parse(JSON.stringify(s || {}))); };
  N.fresh = defaults;

  const LS_KEY = 'nitzutz.v1';
  function loadLocal() {
    try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(N.state)); } catch (e) { /* storage unavailable */ }
  }
  N.state = N.migrate(loadLocal());

  function prune() {
    const s = N.state;
    const keys = Object.keys(s.days).sort();
    if (keys.length > 420) keys.slice(0, keys.length - 420).forEach(function (k) { delete s.days[k]; });
    if (s.writes.length > 40) s.writes = s.writes.slice(-40);
    if (s.chat.length > 30) s.chat = s.chat.slice(-30);
    if (s.streak.frozen.length > 60) s.streak.frozen = s.streak.frozen.slice(-60);
  }

  // ---------- cloud sync (db capability) ----------
  N.store = { ref: null, status: 'local', lastSync: 0 };
  N.inSession = false;
  let pushTimer = null, pushing = false, dirty = false;

  N.save = function (immediate) {
    N.state.updatedAt = Date.now();
    prune();
    saveLocal();
    if (!N.store.ref) return;
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(flush, immediate ? 0 : 700);
  };
  async function flush() {
    if (pushing || !dirty || !N.store.ref) return;
    pushing = true;
    dirty = false;
    let retry = false;
    try {
      await N.store.ref.set(JSON.parse(JSON.stringify(N.state)));
      N.store.status = 'cloud';
      N.store.lastSync = Date.now();
    } catch (e) {
      console.warn('sync failed', e);
      N.store.status = 'error';
      N.store.error = e && e.code;
      if (e && ['unavailable', 'resource_exhausted', 'network', 'gh_error'].indexOf(e.code) >= 0) { dirty = true; retry = true; }
    } finally {
      pushing = false;
      N.emit('sync');
      if (dirty) setTimeout(flush, retry ? 4000 + Math.random() * 3000 : 0);
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && dirty) { clearTimeout(pushTimer); flush(); }
  });

  let pendingRemote = null;
  function adopt(remote) {
    N.state = N.migrate(remote);
    saveLocal();
    N.emit('state:replaced');
  }
  N.applyPendingRemote = function () {
    if (pendingRemote && (pendingRemote.updatedAt || 0) > (N.state.updatedAt || 0)) adopt(pendingRemote);
    pendingRemote = null;
  };

  // Generic store: ref = { get() -> Promise<state|null>, set(state) -> Promise }. Used by the GitHub sync (sync.js).
  N.connectStore = async function (ref) {
    N.store.status = 'syncing';
    N.emit('sync');
    const remote = await ref.get();
    N.store.ref = ref;
    if (remote && (remote.updatedAt || 0) > (N.state.updatedAt || 0)) {
      adopt(remote);
      N.store.status = 'cloud';
      N.store.lastSync = Date.now();
    } else if (!remote || (N.state.updatedAt || 0) > (remote.updatedAt || 0)) {
      dirty = true;
      await flush();
    } else {
      N.store.status = 'cloud';
      N.store.lastSync = Date.now();
    }
    N.emit('sync');
  };
  N.pullStore = async function () {
    const ref = N.store.ref;
    if (!ref || pushing || dirty) return;
    try {
      const r = await ref.get();
      N.store.status = 'cloud';
      N.store.lastSync = Date.now();
      if (r && (r.updatedAt || 0) > (N.state.updatedAt || 0)) {
        if (N.inSession) pendingRemote = r; else adopt(r);
      }
    } catch (e) {
      N.store.status = 'error';
      N.store.error = e && e.code;
    }
    N.emit('sync');
  };
  N.disconnectStore = function () {
    N.store.ref = null;
    N.store.status = 'local';
    N.store.error = null;
    dirty = false;
    N.emit('sync');
  };

  N.initCloud = async function () {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    try {
      const both = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const db = both[0], user = both[1];
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const ref = db.doc('data/users/' + id + '/state');
      N.store.status = 'syncing';
      N.emit('sync');
      const snap = await ref.get();
      const remote = snap.exists ? snap.data() : null;
      N.store.ref = ref;
      if (remote && (remote.updatedAt || 0) > (N.state.updatedAt || 0)) {
        adopt(remote);
        N.store.status = 'cloud';
      } else if (!remote || (N.state.updatedAt || 0) > (remote.updatedAt || 0)) {
        dirty = true;
        await flush();
      } else {
        N.store.status = 'cloud';
      }
      N.emit('sync');
      ref.onSnapshot(function (s) {
        if (!s.exists || s.metadata.hasPendingWrites) return;
        const r = s.data();
        if ((r.updatedAt || 0) <= (N.state.updatedAt || 0)) return;
        if (N.inSession) { pendingRemote = r; return; }
        adopt(r);
      }, function (e) { console.warn('sync listener ended', e); });
    } catch (e) {
      console.warn('cloud unavailable', e);
      N.store.status = 'local';
      N.emit('sync');
    }
  };

  // ---------- curriculum index ----------
  function validItem(it) {
    try {
      switch (it.type) {
        case 'learn': return !!(it.title || it.body);
        case 'mcq': return !!it.q && Array.isArray(it.options) && it.options.length >= 2 && Number.isInteger(it.answer) && it.answer >= 0 && it.answer < it.options.length;
        case 'tf': return !!it.q && typeof it.answer === 'boolean';
        case 'multi': return !!it.q && Array.isArray(it.options) && Array.isArray(it.answers) && it.answers.length > 0 && it.answers.every(function (a) { return Number.isInteger(a) && a >= 0 && a < it.options.length; });
        case 'order': return Array.isArray(it.items) && it.items.length >= 2;
        case 'match': return Array.isArray(it.pairs) && it.pairs.length >= 2 && it.pairs.every(function (p) { return Array.isArray(p) && p.length === 2; });
        case 'cloze': return typeof it.text === 'string' && Array.isArray(it.blanks) && it.blanks.length >= 1 && it.text.split('___').length - 1 === it.blanks.length;
        case 'compare': return !!it.a && !!it.b && (it.answer === 'a' || it.answer === 'b');
        case 'spot': return Array.isArray(it.parts) && it.parts.length >= 2 && Number.isInteger(it.answer) && it.answer >= 0 && it.answer < it.parts.length;
        case 'write': return !!it.task;
        default: return false;
      }
    } catch (e) { return false; }
  }
  N.QUIZ_TYPES = ['mcq', 'tf', 'multi', 'order', 'match', 'cloze', 'compare', 'spot'];

  N.buildIndex = function () {
    const units = (window.CURRICULUM || []).filter(function (u) { return u && u.id && Array.isArray(u.lessons); })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    N.units = units;
    N.unitById = {};
    N.lessonById = {};
    N.itemByKey = {};
    N.lessons = [];
    N.glossary = [];
    N.missions = [];
    units.forEach(function (u, ui) {
      u.index = ui;
      u.color = u.color || 'amber';
      u.guide = u.guide || [];
      u.tips = u.tips || [];
      N.unitById[u.id] = u;
      u.lessons = u.lessons.filter(function (l) { return l && l.id && Array.isArray(l.items); });
      u.lessons.forEach(function (l, li) {
        l.unit = u;
        l.index = li;
        N.lessonById[l.id] = l;
        N.lessons.push(l);
        l.items = l.items.map(function (it, i) {
          const c = Object.assign({}, it, { key: l.id + ':' + i, lessonId: l.id });
          return c;
        }).filter(function (it) {
          const ok = validItem(it);
          if (!ok) console.warn('Skipping invalid item', it.key, it);
          return ok;
        });
        l.items.forEach(function (it) { N.itemByKey[it.key] = it; });
      });
      (u.glossary || []).forEach(function (g) { if (g && g.term) N.glossary.push(Object.assign({ unit: u }, g)); });
      u.missions = (u.missions || []).filter(function (m) { return m && m.id && m.title; });
      u.missions.forEach(function (m) { m.unit = u; N.missions.push(m); });
    });
  };

  // ---------- progress ----------
  N.lessonDone = function (id) { const r = N.state.lessons[id]; return !!(r && r.n > 0); };
  N.unitDone = function (u) { return !!(u && N.state.units[u.id] && N.state.units[u.id].done); };
  N.unitLessonsDone = function (u) { return u.lessons.length > 0 && u.lessons.every(function (l) { return N.lessonDone(l.id); }); };
  N.unitUnlocked = function (u) {
    if (u.index === 0) return true;
    return N.unitDone(N.units[u.index - 1]) || u.lessons.some(function (l) { return N.lessonDone(l.id); });
  };
  N.lessonUnlocked = function (l) {
    return N.unitUnlocked(l.unit) && (l.index === 0 || N.lessonDone(l.unit.lessons[l.index - 1].id));
  };
  N.nextStep = function () {
    for (let i = 0; i < N.units.length; i++) {
      const u = N.units[i];
      if (!N.unitUnlocked(u)) return { type: 'locked', unit: u };
      const l = u.lessons.find(function (x) { return !N.lessonDone(x.id); });
      if (l) return { type: 'lesson', lesson: l, unit: u };
      if (!N.unitDone(u)) return { type: 'test', unit: u };
    }
    return { type: 'done' };
  };
  N.currentUnit = function () {
    const s = N.nextStep();
    return s.unit || N.units[N.units.length - 1];
  };
  N.doneLessons = function () { return N.lessons.filter(function (l) { return N.lessonDone(l.id); }); };
  N.glossaryUnlocked = function (g) { return g.lesson ? N.lessonDone(g.lesson) : N.unitUnlocked(g.unit); };
  N.missionUnlocked = function (m) { return m.unit.lessons.length > 0 && N.lessonDone(m.unit.lessons[0].id); };

  // ---------- XP, levels, streak ----------
  const TITLES = ['ניצוץ ראשון', 'סקרן', 'מתנסה', 'שואל שאלות טובות', 'מנסח', 'מנסח מיומן', 'בונה הקשר', 'אדריכל פרומפטים',
    'בודק עובדות', 'שולט בכלים', 'מפעיל סוכנים', 'בונה כלים', 'מאוטמט', 'מנטור', 'אמן ה־AI', 'אגדה חיה'];
  N.levelInfo = function (xp) {
    let lvl = 1, base = 0, need = 60;
    while (xp >= base + need) { base += need; lvl++; need += 30; }
    return { lvl: lvl, into: xp - base, need: need, title: TITLES[Math.min(lvl - 1, TITLES.length - 1)] };
  };

  N.reconcileStreak = function () {
    const s = N.state.streak, t = N.today();
    if (!s.last || s.last === t) return null;
    const gap = N.dayNum(t) - N.dayNum(s.last);
    if (gap <= 1) return null;
    const missed = gap - 1;
    if (s.count > 0 && s.freezes >= missed) {
      const lastNum = N.dayNum(s.last);
      s.freezes -= missed;
      for (let i = 1; i <= missed; i++) s.frozen.push(N.keyFromNum(lastNum + i));
      s.last = N.keyFromNum(N.dayNum(t) - 1);
      N.save();
      return { used: missed };
    }
    if (s.count > 0) {
      const lost = s.count;
      s.count = 0;
      N.save();
      return { lost: lost };
    }
    return null;
  };
  function touchStreak() {
    const s = N.state.streak, t = N.today();
    if (s.last === t) return null;
    const gap = s.last ? N.dayNum(t) - N.dayNum(s.last) : null;
    s.count = gap === 1 ? s.count + 1 : 1;
    s.last = t;
    s.best = Math.max(s.best, s.count);
    let freeze = false;
    if (s.count % 7 === 0 && s.freezes < 2) { s.freezes++; freeze = true; }
    return { count: s.count, freeze: freeze };
  }
  N.todayXP = function () { return N.state.days[N.today()] || 0; };
  N.addXP = function (amount) {
    amount = Math.max(0, Math.round(amount));
    const s = N.state, t = N.today();
    const before = s.days[t] || 0;
    s.xp += amount;
    s.days[t] = before + amount;
    const lvlBefore = N.levelInfo(s.xp - amount).lvl;
    const streak = amount > 0 ? touchStreak() : null;
    N.questEvent('xp', amount);
    const goal = s.profile.goal;
    return {
      amount: amount,
      streak: streak,
      goalMet: before < goal && s.days[t] >= goal,
      levelUp: N.levelInfo(s.xp).lvl > lvlBefore ? N.levelInfo(s.xp) : null
    };
  };

  // ---------- daily quests ----------
  N.QUESTS = {
    xp: { title: function (n) { return 'צבור ' + n + ' XP היום'; }, target: function () { return N.state.profile.goal + 10; }, ev: 'xp', gems: 10, icon: 'bolt' },
    lessons2: { title: function () { return 'השלם 2 שיעורים'; }, target: function () { return 2; }, ev: 'lesson', gems: 15, icon: 'star' },
    combo: { title: function (n) { return n + ' תשובות נכונות ברצף'; }, target: function () { return 6; }, ev: 'combo', max: true, gems: 10, icon: 'flame' },
    perfect: { title: function () { return 'סיים שיעור בלי אף טעות'; }, target: function () { return 1; }, ev: 'perfect', gems: 20, icon: 'crown' },
    write: { title: function () { return 'השלם אתגר כתיבה'; }, target: function () { return 1; }, ev: 'write', gems: 15, icon: 'pen' },
    review: { title: function () { return 'סיים סבב חזרה'; }, target: function () { return 1; }, ev: 'review', gems: 10, icon: 'refresh' },
    lightning: { title: function (n) { return n + ' נכונות בסבב ברק'; }, target: function () { return 10; }, ev: 'lightning', max: true, gems: 15, icon: 'bolt' },
    correct: { title: function (n) { return 'ענה נכון על ' + n + ' תרגילים'; }, target: function () { return 20; }, ev: 'correct', gems: 10, icon: 'check' },
    tutor: { title: function () { return 'שאל את ניצי שאלה'; }, target: function () { return 1; }, ev: 'tutor', gems: 10, icon: 'chat' }
  };
  N.ensureQuests = function () {
    const q = N.state.quests, t = N.today();
    if (q.day === t && q.list.length) return;
    const rnd = N.seeded('q' + t);
    const pool = ['lessons2', 'combo', 'perfect', 'write', 'review', 'lightning', 'correct', 'tutor'];
    const chosen = ['xp'];
    while (chosen.length < 3) {
      const p = pool[Math.floor(rnd() * pool.length)];
      if (chosen.indexOf(p) < 0) chosen.push(p);
    }
    q.day = t;
    q.bonus = false;
    q.list = chosen.map(function (id) { return { id: id, p: 0, t: N.QUESTS[id].target(), done: false }; });
  };
  N.pendingToasts = [];
  N.questEvent = function (ev, amount) {
    N.ensureQuests();
    const q = N.state.quests;
    q.list.forEach(function (it) {
      const def = N.QUESTS[it.id];
      if (!def || def.ev !== ev || it.done) return;
      it.p = def.max ? Math.max(it.p, amount) : it.p + amount;
      if (it.p >= it.t) {
        it.p = it.t;
        it.done = true;
        N.state.gems += def.gems;
        N.pendingToasts.push({ text: 'משימה יומית הושלמה! קיבלת ' + def.gems + ' יהלומים', icon: 'gem' });
      }
    });
    if (!q.bonus && q.list.length && q.list.every(function (it) { return it.done; })) {
      q.bonus = true;
      N.state.gems += 15;
      N.pendingToasts.push({ text: 'כל המשימות של היום! בונוס של 15 יהלומים', icon: 'crown' });
    }
  };

  // ---------- badges ----------
  function unitsDone() { return N.units.filter(N.unitDone).length; }
  N.BADGES = [
    { id: 'first', t: 'צעד ראשון', d: 'השלמת שיעור ראשון', icon: 'rocket', test: function (s) { return s.stats.lessons >= 1; } },
    { id: 'l10', t: 'מתמיד', d: '10 שיעורים', icon: 'star', test: function (s) { return s.stats.lessons >= 10; } },
    { id: 'l30', t: 'חרוץ', d: '30 שיעורים', icon: 'star', test: function (s) { return s.stats.lessons >= 30; } },
    { id: 's3', t: 'שלושה ברצף', d: 'רצף של 3 ימים', icon: 'flame', test: function (s) { return s.streak.best >= 3; } },
    { id: 's7', t: 'שבוע בוער', d: 'רצף של 7 ימים', icon: 'flame', test: function (s) { return s.streak.best >= 7; } },
    { id: 's30', t: 'חודש של אש', d: 'רצף של 30 ימים', icon: 'flame', test: function (s) { return s.streak.best >= 30; } },
    { id: 's100', t: 'מאה ימים', d: 'רצף של 100 ימים', icon: 'trophy', test: function (s) { return s.streak.best >= 100; } },
    { id: 'p1', t: 'בלי פספוס', d: 'שיעור מושלם', icon: 'crown', test: function (s) { return s.stats.perfect >= 1; } },
    { id: 'p10', t: 'דיוק כירורגי', d: '10 שיעורים מושלמים', icon: 'crown', test: function (s) { return s.stats.perfect >= 10; } },
    { id: 'c10', t: 'על הגל', d: '10 נכונות ברצף', icon: 'bolt', test: function (s) { return s.stats.bestCombo >= 10; } },
    { id: 'c25', t: 'בלתי ניתן לעצירה', d: '25 נכונות ברצף', icon: 'bolt', test: function (s) { return s.stats.bestCombo >= 25; } },
    { id: 'w1', t: 'המילה הראשונה', d: 'אתגר כתיבה ראשון', icon: 'pen', test: function (s) { return s.stats.writes >= 1; } },
    { id: 'w90', t: 'פרומפט מופתי', d: 'ציון 90 ומעלה', icon: 'sparkle', test: function (s) { return s.writes.some(function (w) { return w.s >= 90; }); } },
    { id: 'w15', t: 'כותב סדרתי', d: '15 אתגרי כתיבה', icon: 'pen', test: function (s) { return s.stats.writes >= 15; } },
    { id: 'u1', t: 'יחידה ראשונה', d: 'עברת מבחן יחידה', icon: 'trophy', test: function () { return unitsDone() >= 1; } },
    { id: 'u4', t: 'חצי הדרך', d: '4 יחידות', icon: 'trophy', test: function () { return unitsDone() >= 4; } },
    { id: 'u8', t: 'בוגר ניצוץ', d: 'כל היחידות', icon: 'medal', test: function () { return N.units.length > 0 && unitsDone() >= N.units.length; } },
    { id: 'owl', t: 'ינשוף לילה', d: 'שיעור אחרי 23:00', icon: 'clock', test: function (s) { return !!s.stats.owl; } },
    { id: 'bird', t: 'ציפור מוקדמת', d: 'שיעור לפני 07:00', icon: 'clock', test: function (s) { return !!s.stats.bird; } },
    { id: 'lt20', t: 'ברק', d: '20 בסבב ברק', icon: 'bolt', test: function (s) { return s.stats.lightning >= 20; } },
    { id: 'rv50', t: 'זיכרון של פיל', d: '50 תשובות בחזרה', icon: 'refresh', test: function (s) { return s.stats.reviews >= 50; } },
    { id: 'm1', t: 'יצאת לשטח', d: 'משימת שטח ראשונה', icon: 'flag', test: function (s) { return Object.keys(s.missions).length >= 1; } },
    { id: 'm6', t: 'איש שטח', d: '6 משימות שטח', icon: 'flag', test: function (s) { return Object.keys(s.missions).length >= 6; } },
    { id: 'x1k', t: 'אלף ניצוצות', d: '1,000 XP', icon: 'sparkle', test: function (s) { return s.xp >= 1000; } },
    { id: 'x5k', t: 'זיקוקים', d: '5,000 XP', icon: 'sparkle', test: function (s) { return s.xp >= 5000; } },
    { id: 'tutor', t: 'שאלה טובה', d: 'שאלת את ניצי', icon: 'chat', test: function (s) { return s.stats.tutor >= 1; } }
  ];
  N.checkBadges = function () {
    const s = N.state, earned = [];
    N.BADGES.forEach(function (b) {
      if (s.badges[b.id]) return;
      let ok = false;
      try { ok = b.test(s); } catch (e) { ok = false; }
      if (ok) { s.badges[b.id] = Date.now(); earned.push(b); }
    });
    earned.forEach(function (b) { N.pendingToasts.push({ text: 'הישג חדש: ' + b.t, icon: 'medal' }); });
    return earned;
  };

  // ---------- spaced repetition ----------
  const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
  N.srsRecord = function (key, ok, inReview) {
    if (!key) return;
    const t = N.dayNum(N.today());
    const it = N.state.items[key] || [0, t, 0, 0];
    if (ok) {
      it[0] = inReview ? Math.min(it[0] + 1, 6) : Math.max(it[0], 2);
      it[1] = t + INTERVALS[it[0]];
      it[3]++;
    } else {
      it[0] = 0;
      it[1] = inReview ? t + 1 : t;
      it[2]++;
    }
    N.state.items[key] = it;
  };
  N.dueItems = function () {
    const t = N.dayNum(N.today());
    return Object.keys(N.state.items)
      .filter(function (k) { return N.itemByKey[k] && N.state.items[k][1] <= t; })
      .sort(function (a, b) {
        const A = N.state.items[a], B = N.state.items[b];
        return A[0] - B[0] || B[2] - A[2];
      })
      .map(function (k) { return N.itemByKey[k]; });
  };
  N.seenQuizItems = function () {
    const out = [];
    N.doneLessons().forEach(function (l) {
      l.items.forEach(function (it) { if (N.QUIZ_TYPES.indexOf(it.type) >= 0) out.push(it); });
    });
    return out;
  };

  // ---------- sound & haptics ----------
  let actx = null;
  function ctx() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') actx.resume().catch(function () {});
    return actx;
  }
  function tone(freq, start, dur, type, gain) {
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime + start;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.16, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  const SFX = {
    tap: function () { tone(880, 0, 0.05, 'triangle', 0.05); },
    good: function () { tone(784, 0, 0.12, 'sine', 0.16); tone(1175, 0.09, 0.22, 'sine', 0.16); },
    bad: function () { tone(220, 0, 0.16, 'triangle', 0.14); tone(185, 0.12, 0.22, 'triangle', 0.12); },
    match: function () { tone(988, 0, 0.1, 'sine', 0.1); },
    done: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.1, 0.28, 'sine', 0.14); }); tone(1568, 0.42, 0.4, 'sine', 0.07); },
    gem: function () { tone(1568, 0, 0.1, 'sine', 0.08); tone(2093, 0.07, 0.18, 'sine', 0.08); },
    fail: function () { [392, 330, 262].forEach(function (f, i) { tone(f, i * 0.13, 0.25, 'triangle', 0.1); }); }
  };
  N.sfx = function (name) {
    if (!N.state.profile.sound) return;
    try { SFX[name] && SFX[name](); } catch (e) { /* audio unavailable */ }
  };
  N.buzz = function (ms) {
    try {
      if (!navigator.vibrate || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return;
      navigator.vibrate(ms);
    } catch (e) { /* no vibration */ }
  };

  // ---------- confetti ----------
  N.confetti = function (amount) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.getElementById('confetti');
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    const colors = ['#FFB31F', '#FF7A59', '#8B5CF6', '#14B8A6', '#2F9BFF', '#F43F5E', '#74C11A'];
    const parts = [];
    const n = amount || 140;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.35,
        vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 4,
        r: Math.random() * 6 + 4, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
        c: colors[i % colors.length], shape: Math.random() < 0.5
      });
    }
    let frame = 0;
    function step() {
      frame++;
      g.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.a);
        g.fillStyle = p.c;
        if (p.shape) g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        else { g.beginPath(); g.arc(0, 0, p.r / 2.4, 0, Math.PI * 2); g.fill(); }
        g.restore();
      });
      if (frame < 150) requestAnimationFrame(step);
      else g.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(step);
  };

  // ---------- toasts ----------
  N.toast = function (text, icon) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = N.h('div', { class: 'toast' }, icon ? N.icon(icon, { size: 20, fill: icon === 'gem' || icon === 'flame' || icon === 'star' }) : null, N.h('span', null, text));
    box.append(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, 3200);
  };
  N.flushToasts = function () {
    const list = N.pendingToasts.splice(0);
    list.forEach(function (t, i) { setTimeout(function () { N.toast(t.text, t.icon); if (t.icon === 'gem') N.sfx('gem'); }, i * 650); });
  };

  // ---------- modal ----------
  N.modal = function (opts) {
    const host = document.getElementById('modal');
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      back.remove();
      document.removeEventListener('keydown', onKey, true);
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    const actions = (opts.actions || []).map(function (a) {
      return N.h('button', {
        class: 'btn ' + (a.kind || 'btn-ghost') + ' btn-block', type: 'button',
        onclick: function () { if (a.onClick) { const r = a.onClick(); if (r === false) return; } close(); }
      }, a.icon ? N.icon(a.icon) : null, a.label);
    });
    const sheet = N.h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || '' },
      N.h('div', { class: 'sheet-h' },
        N.h('div', { class: 'grow stack', style: { gap: '4px' } },
          opts.eyebrow ? N.h('span', { class: 'eyebrow' }, opts.eyebrow) : null,
          opts.title ? N.h('h2', null, opts.title) : null),
        opts.noClose ? null : N.h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'סגור', onclick: close }, N.icon('x'))),
      opts.body || null,
      actions.length ? N.h('div', { class: 'sheet-actions' }, actions) : null);
    const back = N.h('div', { class: 'modal-back', onclick: function (e) { if (e.target === back && !opts.noClose) close(); } }, sheet);
    host.append(back);
    document.addEventListener('keydown', onKey, true);
    const f = sheet.querySelector(opts.focus || '.btn, textarea, input');
    if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 60);
    return { close: close, sheet: sheet };
  };

  N.copyText = function (text, btn) {
    function done() { N.toast('הועתק', 'copy'); }
    try {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } catch (e) { fallback(); }
    function fallback() {
      const ta = N.h('textarea', { style: { position: 'fixed', opacity: '0' } });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
      ta.remove();
      if (btn) btn.focus();
    }
  };
})();
