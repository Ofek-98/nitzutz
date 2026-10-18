(function () {
  'use strict';
  const N = window.N;
  // Two ways to reach Claude:
  //  - 'claude': inside a claude.ai artifact, through the viewer's own account (the `sample` capability)
  //  - 'api':    the standalone app, with the learner's own API key (direct call to the Claude API)
  const ai = N.ai = { fn: null, off: false, mode: 'off' };
  N.hosted = !!(window.claude && typeof window.claude.use === 'function');

  const KEY_LS = 'nitzutz.apikey', MODEL_LS = 'nitzutz.model';
  ai.MODELS = [
    { id: 'claude-opus-5-5', name: 'Opus 5.5', note: 'הכי חכם. בערך 2-5 סנט לבדיקה', fallbacks: true },
    { id: 'claude-sonnet-5-5', name: 'Sonnet 5.5', note: 'מאוזן. בערך 1-3 סנט לבדיקה', fallbacks: true },
    { id: 'claude-haiku-5-5', name: 'Haiku 5.5', note: 'הכי מהיר וזול. פחות מסנט לבדיקה', fallbacks: false }
  ];
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
  ai.apiKey = function () { return lsGet(KEY_LS); };
  ai.model = function () {
    const m = lsGet(MODEL_LS);
    return ai.MODELS.some(function (x) { return x.id === m; }) ? m : ai.MODELS[0].id;
  };
  ai.setModel = function (id) { lsSet(MODEL_LS, id); };
  ai.setApiKey = function (k) { lsSet(KEY_LS, (k || '').trim()); ai.configure(); };

  function parseJSON(text) {
    const t = String(text || '').trim();
    try { return JSON.parse(t); } catch (e) { /* try the fallbacks below */ }
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) { try { return JSON.parse(fence[1]); } catch (e) { /* keep trying */ } }
    const a = t.search(/[[{]/), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* give up */ } }
    throw { code: 'invalid_json', text: t };
  }

  // Same calling shape as the artifact `sample` function: fn(input, opts) -> {text}, fn.json(input, opts) -> value
  function apiFn(key) {
    async function call(input, opts) {
      opts = opts || {};
      const turns = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
      const messages = [];
      turns.forEach(function (m) {
        const last = messages[messages.length - 1];
        if (last && last.role === m.role) last.content += '\n\n' + m.content;
        else messages.push({ role: m.role, content: m.content });
      });
      const model = ai.model();
      const def = ai.MODELS.find(function (x) { return x.id === model; }) || ai.MODELS[0];
      const body = { model: model, max_tokens: 16000, messages: messages };
      const headers = {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      };
      if (def.fallbacks) { body.fallbacks = 'default'; headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; }
      if (opts.modelTier === 'quick') body.output_config = { effort: 'low' };
      let res;
      try {
        res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: headers, body: JSON.stringify(body), signal: opts.signal });
      } catch (e) {
        if (e && e.name === 'AbortError') throw { code: 'cancelled' };
        throw { code: 'network' };
      }
      if (!res.ok) {
        let msg = '';
        try { const j = await res.json(); msg = j && j.error && j.error.message || ''; } catch (e) { /* no body */ }
        const code = res.status === 401 || res.status === 403 ? 'bad_key' : res.status === 429 ? 'rate_limited' : res.status === 400 ? 'invalid_request' : 'upstream_error';
        throw { code: code, message: msg, status: res.status };
      }
      const j = await res.json();
      if (j.stop_reason === 'refusal') throw { code: 'refused' };
      const text = (j.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
      if (!text.trim()) throw { code: 'empty_completion' };
      if (opts.onText) { try { opts.onText({ text: text, delta: text }); } catch (e) { console.error(e); } }
      return { text: text, truncated: j.stop_reason === 'max_tokens' };
    }
    const fn = function (input, opts) { return call(input, opts); };
    fn.json = function (input, opts) { return call(input, opts).then(function (r) { return parseJSON(r.text); }); };
    return fn;
  }

  ai.configure = function () {
    if (N.hosted) return;
    const key = ai.apiKey();
    ai.fn = key ? apiFn(key) : null;
    ai.mode = key ? 'api' : 'off';
    ai.off = false;
    N.emit('ai');
  };

  ai.ready = (async function () {
    if (!N.hosted) { ai.configure(); return ai.fn; }
    try {
      ai.fn = (await window.claude.use('sample')) || null;
      ai.mode = ai.fn ? 'claude' : 'off';
    } catch (e) {
      ai.fn = null;
    }
    N.emit('ai');
    return ai.fn;
  })();

  ai.available = function () { return !!ai.fn && !ai.off; };

  // A tiny request to check that the key and model work.
  ai.test = function () { return ai.fn('ענה במילה אחת בלבד: מחובר', { modelTier: 'quick' }); };

  const PERMANENT = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
  ai.errorText = function (e) {
    const code = e && e.code;
    if (PERMANENT.indexOf(code) >= 0) {
      ai.off = true;
      N.emit('ai');
      return 'קלוד לא זמין כאן כרגע, אז נמשיך בלעדיו.';
    }
    switch (code) {
      case 'bad_key': return 'מפתח ה־API לא התקבל. בדוק אותו בפרופיל, תחת ״קלוד בתוך האפליקציה״.';
      case 'network': return 'אין חיבור לשרת של קלוד. בדוק את החיבור לאינטרנט.';
      case 'invalid_request': return 'הבקשה לקלוד נדחתה' + (e.message ? ': ' + e.message : '.');
      case 'cancelled': return '';
      case 'rate_limited': return 'יותר מדי בקשות כרגע. נסה שוב בעוד דקה.';
      case 'session_expired': return 'צריך להתחבר מחדש לקלוד, ואז לנסות שוב.';
      case 'refused': return 'קלוד לא ענה על הבקשה הזו. נסה לנסח אחרת.';
      case 'invalid_json': return 'התשובה של קלוד הגיעה במבנה לא צפוי. נסה שוב.';
      case 'prompt_too_large': return 'הטקסט ארוך מדי. נסה לקצר.';
      case 'empty_completion': return 'קלוד לא החזיר תשובה. נסה לנסח אחרת.';
      default: return 'החיבור לקלוד נכשל. נסה שוב.';
    }
  };

  const VOICE = 'כתוב בעברית טבעית וברורה, בפנייה ללומד בלשון זכר יחיד. אל תשתמש בכותרות.';

  function learnerContext() {
    const done = N.doneLessons().map(function (l) { return l.title; });
    const cur = N.currentUnit();
    return 'שיעורים שהלומד כבר השלים: ' + (done.length ? done.join(', ') : 'עדיין אין') + '.\n' +
      'היחידה הנוכחית שלו: ' + (cur ? cur.title : 'לא ידוע') + '.';
  }

  // Grade a free-writing answer against its rubric. Resolves a normalized result.
  ai.grade = async function (item, answer, signal) {
    const rubric = (item.rubric || []).map(function (r, i) { return (i + 1) + '. ' + r; }).join('\n');
    const prompt =
      'אתה מורה מנוסה, קפדן אבל מעודד, שמלמד אנשי מקצוע לכתוב פרומפטים טובים לקלוד ולעבוד נכון עם בינה מלאכותית.\n' +
      'הלומד קיבל משימת כתיבה באפליקציית לימוד. הערך את התשובה שלו לפי הקריטריונים.\n\n' +
      '<task>\n' + item.task + '\n</task>\n\n' +
      '<rubric>\n' + rubric + '\n</rubric>\n\n' +
      (item.sample ? '<reference_answer>\n' + item.sample + '\n</reference_answer>\n(תשובת ייחוס לעיונך בלבד. אל תדרוש התאמה מילולית, יש הרבה דרכים טובות.)\n\n' : '') +
      '<learner_answer>\n' + answer + '\n</learner_answer>\n\n' +
      'החזר אובייקט JSON אחד בלבד, במבנה הזה:\n' +
      '{"score": מספר שלם 0-100, "criteria": [{"ok": true או false, "note": "משפט קצר על הקריטריון"}], "strengths": ["נקודה חזקה"], "improve": ["שיפור ספציפי"], "improved": "גרסה משופרת של התשובה של הלומד, שומרת על הכוונה שלו", "summary": "משפט אחד מסכם ומעודד"}\n' +
      'כללים: פריט אחד ב־criteria לכל קריטריון, באותו סדר. 1-3 נקודות חזקות ו־1-3 שיפורים, כל אחד משפט קצר וקונקרטי. ' +
      'ציון 90 ומעלה רק לתשובה שעומדת בכל הקריטריונים היטב. תשובה ריקה או לא קשורה מקבלת ציון נמוך. ' +
      'בשדה improved שמור על שורות חדשות כ־\\n. ' + VOICE;
    const r = await ai.fn.json(prompt, { signal: signal });
    const n = item.rubric ? item.rubric.length : 0;
    const crit = Array.isArray(r && r.criteria) ? r.criteria : [];
    return {
      mode: 'ai',
      score: N.clamp(Math.round(Number(r && r.score) || 0), 0, 100),
      criteria: Array.from({ length: n }, function (_, i) {
        const c = crit[i] || {};
        return { ok: c.ok === true || c.ok === 'true', note: String(c.note || '') };
      }),
      strengths: (Array.isArray(r && r.strengths) ? r.strengths : []).map(String).slice(0, 4),
      improve: (Array.isArray(r && r.improve) ? r.improve : []).map(String).slice(0, 4),
      improved: String((r && r.improved) || ''),
      summary: String((r && r.summary) || '')
    };
  };

  // Deeper explanation of an exercise the learner just answered (streams).
  ai.explain = function (ctx, onText, signal) {
    const prompt =
      'אתה מורה סבלני באפליקציה שמלמדת עבודה עם קלוד ובינה מלאכותית. הלומד ענה עכשיו על תרגיל וביקש הסבר מעמיק יותר.\n\n' +
      '<exercise>\n' + ctx.exercise + '\n</exercise>\n' +
      '<correct_answer>\n' + (ctx.correct || '') + '\n</correct_answer>\n' +
      '<learner_answer>\n' + (ctx.given || '') + '\n</learner_answer>\n' +
      '<shown_explanation>\n' + (ctx.explain || '') + '\n</shown_explanation>\n' +
      'הלומד ענה ' + (ctx.ok ? 'נכון' : 'לא נכון') + '.\n\n' +
      'הסבר את הרעיון לעומק ב־3 עד 5 משפטים, בלי לחזור על ההסבר שכבר הוצג. ' +
      (ctx.ok ? '' : 'אם אפשר, הסבר למה התשובה שבחר מפתה אבל לא נכונה. ') +
      'תן דוגמה מעשית אחת קצרה, רצוי מעולם העבודה המשרדית או הפיננסית. ' + VOICE;
    return ai.fn(prompt, { modelTier: 'quick', onText: onText, signal: signal });
  };

  // Tutor chat: turns = [{role, content}], oldest first, ending on a user turn.
  ai.tutor = function (turns, onText, signal) {
    const rules =
      'אתה "' + N.guideName() + '", מורה פרטי חם, חד וחכם באפליקציית "ניצוץ", שמלמדת איש מקצוע מתחום הפיננסים לעבוד עם קלוד ולבנות בעזרת בינה מלאכותית.\n' +
      learnerContext() + '\n' +
      'ענה בעברית, בלשון זכר יחיד, בתשובות ממוקדות (עד 160 מילים, אלא אם ביקש יותר). אפשר להשתמש ברשימות קצרות. ' +
      'השתמש בדוגמאות מעשיות מעבודה משרדית ופיננסית כשזה מתאים. ' +
      'אם אתה לא בטוח בפרט מוצר ספציפי (שם תפריט, מחיר, מגבלה), אמור זאת במפורש במקום לנחש. ' +
      'לפעמים, לא תמיד, סיים בשאלה קצרה שבודקת הבנה או בהצעה לתרגול קטן.';
    const input = [{ role: 'user', content: rules }].concat(turns);
    return ai.fn(input, { cache: false, onText: onText, signal: signal });
  };

  // A fresh daily writing challenge based on the learner's current unit.
  ai.daily = async function (unit, dayKey) {
    const topics = unit.lessons.map(function (l) { return l.title + ' (' + (l.goal || '') + ')'; }).join('; ');
    const prompt =
      'צור אתגר כתיבה יומי אחד ללומד באפליקציה שמלמדת עבודה עם קלוד. הלומד הוא איש מקצוע בתחום האשראי והפיננסים.\n' +
      'תאריך: ' + dayKey + '.\n' +
      'נושאי היחידה הנוכחית: ' + unit.title + ' — ' + topics + '\n' +
      learnerContext() + '\n\n' +
      'האתגר: תרחיש מציאותי וקונקרטי (עבודה או חיים, לסירוגין) שבו הלומד צריך לכתוב פרומפט לקלוד, או לתכנן איך ישתמש בקלוד, תוך יישום הנושאים. ' +
      'החזר אובייקט JSON אחד בלבד:\n' +
      '{"title": "כותרת של 2-5 מילים", "task": "התרחיש ומה בדיוק לכתוב, 2-4 משפטים", "rubric": ["3-5 קריטריונים קצרים שאפשר לבדוק"], "sample": "תשובה מצוינת לדוגמה, עם \\n בין שורות"}\n' + VOICE;
    const r = await ai.fn.json(prompt, { cache: { gcTime: 86400000 } });
    if (!r || !r.task || !Array.isArray(r.rubric) || !r.rubric.length) throw { code: 'invalid_json' };
    return { title: String(r.title || 'אתגר היום'), task: String(r.task), rubric: r.rubric.map(String).slice(0, 5), sample: String(r.sample || '') };
  };

  // Short feedback on a field-mission reflection (streams).
  ai.missionFeedback = function (mission, reflection, onText, signal) {
    const prompt =
      'אתה מורה באפליקציה שמלמדת עבודה עם קלוד. הלומד ביצע משימת שטח אמיתית בקלוד וכתב רפלקציה.\n' +
      '<mission>\n' + mission.title + '\n' + (mission.steps || []).join('\n') + '\n</mission>\n' +
      '<question>\n' + (mission.reflect || '') + '\n</question>\n' +
      '<reflection>\n' + reflection + '\n</reflection>\n\n' +
      'תן משוב קצר (עד 120 מילים): מה הוא עשה טוב, תובנה אחת שכדאי לקחת הלאה, ורעיון אחד לניסוי הבא. ' + VOICE;
    return ai.fn(prompt, { onText: onText, signal: signal, cache: false });
  };
})();
