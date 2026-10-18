(function () {
  'use strict';
  // Sync between devices for the standalone app: progress lives in one private GitHub Gist.
  // The learner pastes a GitHub token (gist permission only) once; other devices connect by scanning a QR code.
  const N = window.N, h = N.h;
  const FILE = 'nitzutz-progress.json';
  const TOKEN_LS = 'nitzutz.gh.token', GIST_LS = 'nitzutz.gh.gist', KEY_LS = 'nitzutz.apikey';
  const sync = N.sync = {};

  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }

  async function gh(token, path, opts) {
    opts = opts || {};
    const headers = { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token };
    if (opts.body) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch('https://api.github.com' + path, { method: opts.method || 'GET', headers: headers, body: opts.body, cache: 'no-store' });
    } catch (e) {
      throw { code: 'network' };
    }
    if (!res.ok) {
      const code = res.status === 401 ? 'bad_token' : (res.status === 403 || res.status === 404) ? 'no_access' : 'gh_error';
      throw { code: code, status: res.status };
    }
    return res.status === 204 ? null : res.json();
  }

  async function findOrCreate(token) {
    for (let page = 1; page <= 5; page++) {
      const list = await gh(token, '/gists?per_page=100&page=' + page);
      const hit = list.find(function (g) { return g.files && g.files[FILE]; });
      if (hit) return hit.id;
      if (list.length < 100) break;
    }
    const files = {};
    files[FILE] = { content: JSON.stringify(N.state) };
    const created = await gh(token, '/gists', { method: 'POST', body: JSON.stringify({ description: 'Nitzutz progress (private)', public: false, files: files }) });
    return created.id;
  }

  function gistRef(token, id) {
    return {
      get: async function () {
        const g = await gh(token, '/gists/' + id);
        const f = g.files && g.files[FILE];
        if (!f) return null;
        let text = f.content;
        if (f.truncated && f.raw_url) {
          try { text = await (await fetch(f.raw_url, { cache: 'no-store' })).text(); } catch (e) { throw { code: 'network' }; }
        }
        try { return JSON.parse(text); } catch (e) { return null; }
      },
      set: function (data) {
        const files = {};
        files[FILE] = { content: JSON.stringify(data) };
        return gh(token, '/gists/' + id, { method: 'PATCH', body: JSON.stringify({ files: files }) });
      }
    };
  }

  sync.connected = function () { return !!(lsGet(TOKEN_LS) && lsGet(GIST_LS)); };

  sync.errorText = function (e) {
    switch (e && e.code) {
      case 'bad_token': return 'ה־token לא התקבל. ייתכן שפג תוקפו או שהועתק לא שלם.';
      case 'no_access': return 'ל־token אין הרשאה ל־Gists. צור token עם הרשאת Gists לקריאה וכתיבה.';
      case 'network': return 'אין חיבור ל־GitHub. בדוק את החיבור לאינטרנט.';
      default: return 'הסנכרון עם GitHub נכשל. נסה שוב.';
    }
  };

  // Connect with a token (first device) or with token + gist id (from the QR code).
  sync.connect = async function (token, gistId) {
    token = String(token || '').trim();
    if (!token) throw { code: 'bad_token' };
    const id = gistId || await findOrCreate(token);
    lsSet(TOKEN_LS, token);
    lsSet(GIST_LS, id);
    await N.connectStore(gistRef(token, id));
  };

  sync.disconnect = function () {
    lsSet(TOKEN_LS, '');
    lsSet(GIST_LS, '');
    N.disconnectStore();
  };

  // A link that connects another device: everything after # stays on the device and is never sent to a server.
  sync.pairLink = function (withKey) {
    const parts = [lsGet(TOKEN_LS), lsGet(GIST_LS)];
    if (withKey && lsGet(KEY_LS)) parts.push(lsGet(KEY_LS));
    const base = location.href.split('#')[0];
    return base + '#sync=' + encodeURIComponent(btoa(parts.join('|')));
  };

  // Accepts a full pairing link (…#sync=…) and returns {token, gist, key}, or null.
  sync.parsePairing = function (text) {
    const m = String(text || '').trim().match(/#sync=([^\s]+)/);
    if (!m) return null;
    try {
      const parts = atob(decodeURIComponent(m[1])).split('|');
      if (parts.length >= 2 && parts[0] && parts[1]) return { token: parts[0], gist: parts[1], key: parts[2] || '' };
    } catch (e) { /* malformed link */ }
    return null;
  };
  function readPairing() {
    if (!/^#sync=/.test(location.hash)) return null;
    const pair = sync.parsePairing(location.hash);
    try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* ignore */ }
    return pair;
  }
  sync.pair = async function (pair) {
    if (pair.key) N.ai.setApiKey(pair.key);
    await sync.connect(pair.token, pair.gist);
    if (!N.state.profile.onboarded) { N.state.profile.onboarded = true; N.save(true); }
  };

  sync.init = async function () {
    if (N.hosted) return;
    const pair = readPairing();
    if (pair) {
      try {
        await sync.pair(pair);
        N.toast('המכשיר חובר לסנכרון', 'cloud');
        N.render();
      } catch (e) {
        N.toast(sync.errorText(e), 'info');
      }
      return;
    }
    if (sync.connected()) {
      try { await N.connectStore(gistRef(lsGet(TOKEN_LS), lsGet(GIST_LS))); }
      catch (e) { N.store.status = 'error'; N.store.error = e && e.code; N.emit('sync'); }
    }
  };

  // Pick up progress made on the other device when the app comes back to the foreground.
  function maybePull() { if (document.visibilityState === 'visible' && N.store.ref && !N.hosted) N.pullStore(); }
  document.addEventListener('visibilitychange', maybePull);
  window.addEventListener('focus', maybePull);
  setInterval(maybePull, 90000);

  // ---------- QR code (library loaded on demand) ----------
  let qrLib = null;
  function loadQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (qrLib) return qrLib;
    qrLib = new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
      s.onload = function () { window.qrcode ? resolve(window.qrcode) : reject(new Error('qr')); };
      s.onerror = function () { qrLib = null; reject(new Error('qr')); };
      document.head.append(s);
    });
    return qrLib;
  }

  function showPairing() {
    const hasKey = !!lsGet(KEY_LS);
    const withKey = h('input', { type: 'checkbox', id: 'pair-key', checked: hasKey });
    const qrBox = h('div', { style: { display: 'grid', placeItems: 'center', minHeight: '220px', background: '#fff', borderRadius: '16px', padding: '12px' } }, h('span', { class: 'dots' }, h('span'), h('span'), h('span')));
    const copyBtn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, N.icon('copy', { size: 16 }), 'העתק קישור חיבור');
    function draw() {
      const link = sync.pairLink(withKey.checked);
      loadQr().then(function (qrcode) {
        const qr = qrcode(0, 'L');
        qr.addData(link);
        qr.make();
        N.clear(qrBox).append(h('img', { src: qr.createDataURL(5, 2), alt: 'קוד QR לחיבור הטלפון', style: { width: '220px', maxWidth: '100%', imageRendering: 'pixelated' } }));
      }).catch(function () {
        N.clear(qrBox).append(h('p', { class: 'muted small', style: { color: '#565C80' } }, 'לא הצלחתי לטעון את קוד ה־QR. אפשר להעתיק את הקישור ולפתוח אותו בטלפון.'));
      });
    }
    withKey.addEventListener('change', draw);
    copyBtn.addEventListener('click', function () { N.copyText(sync.pairLink(withKey.checked), copyBtn); });
    const local = location.protocol === 'file:';
    N.modal({
      eyebrow: 'סנכרון', title: 'חיבור הטלפון',
      body: h('div', { class: 'stack', style: { gap: '14px' } },
        local
          ? h('div', { class: 'note' }, N.icon('info', { size: 20 }), h('span', null, 'האפליקציה פתוחה מקובץ במחשב, אז הקישור לא יעבוד בטלפון. פתח אותה מהכתובת שלה ב־GitHub Pages ונסה שוב.'))
          : h('p', { class: 'muted' }, 'סרוק את הקוד במצלמה של הטלפון. הטלפון יתחבר לאותה התקדמות.'),
        qrBox,
        hasKey ? h('label', { class: 'row', for: 'pair-key', style: { flexWrap: 'nowrap', cursor: 'pointer' } }, withKey, h('span', null, 'לחבר גם את קלוד (מפתח ה־API)')) : null,
        h('div', { class: 'note' }, N.icon('shield', { size: 20 }), h('span', null, 'הקוד מכיל את הגישה לסנכרון שלך. אל תצלם ואל תשלח אותו לאחרים.')),
        copyBtn)
    });
    draw();
  }

  // ---------- profile card ----------
  N.syncCard = function () {
    if (N.hosted) return null;
    const on = sync.connected();
    const out = h('p', { class: 'muted small', 'aria-live': 'polite' });
    const card = h('div', { class: 'card', id: 'sync-card' });
    const head = h('div', { class: 'card-h' }, h('h3', null, 'סנכרון בין מכשירים'), N.icon('cloud', { size: 22, cls: 'muted' }));
    if (on) {
      const st = N.store.status;
      const when = N.store.lastSync ? new Date(N.store.lastSync).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
      const line = st === 'error' ? sync.errorText({ code: N.store.error }) : st === 'syncing' ? 'מסנכרן…' : 'מסונכרן' + (when ? ' · עודכן ב־' + when : '');
      card.append(head,
        h('div', { class: 'sync ' + (st === 'error' ? 'error' : 'cloud') }, h('span', { class: 'dot' }), h('span', null, line)),
        h('p', { class: 'muted' }, 'ההתקדמות נשמרת בקובץ פרטי בחשבון ה־GitHub שלך, וכל מכשיר מחובר רואה אותה.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: showPairing }, N.icon('send', { size: 16 }), 'חבר את הטלפון'),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { N.pullStore().then(function () { N.render(); }); } }, N.icon('refresh', { size: 16 }), 'סנכרן עכשיו'),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { sync.disconnect(); N.render(); } }, 'נתק מכשיר זה')),
        out);
      return card;
    }
    const input = h('input', { class: 'search', id: 'gh-token', type: 'password', autocomplete: 'off', spellcheck: 'false', dir: 'ltr', placeholder: 'github_pat_…', 'aria-label': 'GitHub token או קישור חיבור' });
    const go = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, 'חבר');
    go.addEventListener('click', function () {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      go.disabled = true;
      out.textContent = 'מתחבר ל־GitHub…';
      const pair = sync.parsePairing(v);
      (pair ? sync.pair(pair) : sync.connect(v)).then(function () {
        N.toast('הסנכרון פעיל', 'cloud');
        N.render();
        setTimeout(function () { const el = document.getElementById('sync-card'); if (el) el.scrollIntoView({ block: 'center' }); }, 60);
      }).catch(function (e) { out.textContent = sync.errorText(e); go.disabled = false; });
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
    card.append(head,
      h('p', { class: 'muted' }, 'רוצה לראות את אותה התקדמות במחשב ובטלפון? מחברים פעם אחת את חשבון ה־GitHub שלך, וההתקדמות נשמרת שם בקובץ פרטי. במכשיר נוסף אפשר להדביק כאן גם קישור חיבור.'),
      h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('div', { class: 'grow' }, input), go),
      out,
      h('details', { class: 'more' }, h('summary', null, 'איך יוצרים token'),
        h('ol', { class: 'stack', style: { gap: '6px', marginTop: '6px' } },
          h('li', null, 'ב־GitHub נכנסים ל־', N.ltr('Settings → Developer settings → Personal access tokens → Fine-grained tokens'), '.'),
          h('li', null, 'יוצרים token חדש. תחת ', N.ltr('Account permissions'), ' נותנים ל־', N.ltr('Gists'), ' הרשאת ', N.ltr('Read and write'), ', ולא שום הרשאה אחרת.'),
          h('li', null, 'מעתיקים את ה־token ומדביקים כאן. הוא נשמר רק בדפדפן הזה.'))));
    return card;
  };
})();
