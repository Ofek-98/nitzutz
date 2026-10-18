(function () {
  'use strict';
  const N = window.N = window.N || {};
  const NS = 'http://www.w3.org/2000/svg';

  const P = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    dumbbell: 'M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11',
    flag: 'M5 21V4M5 4h12l-2.5 4.5L17 13H5',
    book: 'M4 19.5V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2.5zM4 19.5A2 2 0 0 0 6 22h14v-5',
    user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM3.5 21.5a8.5 8.5 0 0 1 17 0',
    flame: 'M12 2.5c1.2 3.6-1.6 5.6-1.6 8.3 0 1.5 1.1 2.6 2.4 2.6 1.6 0 2.6-1.3 2.4-3.4 2.3 1.7 4.3 4.6 4.3 7.3A7.5 7.5 0 0 1 4.5 17.3c0-5 4.4-8.3 7.5-14.8z',
    gem: 'M7 3.5h10l4.5 6L12 21 2.5 9.5zM2.5 9.5h19M12 21 8.5 9.5 12 3.5l3.5 6z',
    bolt: 'M13.5 2 4 14h7l-1.5 8L20 10h-7z',
    star: 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z',
    lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
    check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
    x: 'M6 6l12 12M18 6 6 18',
    crown: 'M3.5 18.5h17M4 7.5l4.5 4 3.5-6.5 3.5 6.5 4.5-4-1.8 10H5.8z',
    trophy: 'M8 3.5h8v6a4 4 0 0 1-8 0zM8 5.5H4.5V7A3.5 3.5 0 0 0 8 10.5M16 5.5h3.5V7a3.5 3.5 0 0 1-3.5 3.5M12 13.5v3.5M8.5 21h7M9.5 17h5l.5 4h-6z',
    chest: 'M3.5 10.5h17V20h-17zM3.5 10.5V8.5a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v2M10.5 10.5v3.5h3v-3.5',
    volume: 'M4 9.5v5h3.5l5 4v-13l-5 4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
    mute: 'M4 9.5v5h3.5l5 4v-13l-5 4zM16.5 9.5l5 5M21.5 9.5l-5 5',
    sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
    brain: 'M9.5 3.5A3 3 0 0 0 6.5 6.4 3 3 0 0 0 4.4 11.6 3.2 3.2 0 0 0 6.5 17.5 3 3 0 0 0 12 19V5a2 2 0 0 0-2.5-1.5zM14.5 3.5a3 3 0 0 1 3 2.9 3 3 0 0 1 2.1 5.2 3.2 3.2 0 0 1-2.1 5.9A3 3 0 0 1 12 19M12 10h-2.5M12 14h2.5',
    pen: 'M4 20l4.2-1L19 8.2a2.1 2.1 0 0 0-3-3L5.2 16zM14.5 6.7l3 3',
    layers: 'M12 3 2.5 8 12 13l9.5-5zM2.5 12.5 12 17.5l9.5-5M2.5 16.5 12 21.5l9.5-5',
    briefcase: 'M3.5 7.5h17v12.5h-17zM8.5 7.5V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3.5 13h17',
    shield: 'M12 3 4.5 6v6c0 4.8 3.3 7.8 7.5 9 4.2-1.2 7.5-4.2 7.5-9V6zM9 12l2.2 2.2L15.5 10',
    robot: 'M5.5 8.5h13a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1zM12 4.5v4M9 12.8v1.4M15 12.8v1.4M9.5 16.5h5M2.5 12v3.5M21.5 12v3.5M12 3.2v.1',
    hammer: 'M14.5 8.5l-10 10a1.8 1.8 0 0 0 2.5 2.5l10-10M11 5l3-2.5 6.5 6.5-2.5 3z',
    cog: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
    chat: 'M4 5h16v11H10l-6 4.5z',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.2 2',
    target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12.5v-.5',
    back: 'M9 5.5l6.5 6.5L9 18.5',
    next: 'M15 5.5 8.5 12l6.5 6.5',
    guide: 'M2.5 5h6.5a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2.5zM21.5 5H15a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7.5z',
    bulb: 'M9 18h6M10 21.5h4M12 2.5a6.5 6.5 0 0 0-4.2 11.4c.8.7 1.2 1.6 1.2 2.6h6c0-1 .4-1.9 1.2-2.6A6.5 6.5 0 0 0 12 2.5z',
    refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 3.5v5h-5',
    send: 'M3 12 21 3l-6 18-3.5-7.5zM11.5 13.5 21 3',
    snow: 'M12 2.5v19M4 7l16 10M4 17 20 7M9 4.5l3 2 3-2M9 19.5l3-2 3 2',
    bag: 'M5 8h14l-1.2 13H6.2zM9 8V6.5a3 3 0 0 1 6 0V8',
    search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM21 21l-5.2-5.2',
    play: 'M8 4.5 19.5 12 8 19.5z',
    medal: 'M12 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM9 10.6 6 2.5h4L12 7M15 10.6l3-8.1h-4L12 7',
    cloud: 'M7 18.5a4.8 4.8 0 0 1-.6-9.6A6 6 0 0 1 17.8 8a4.5 4.5 0 0 1-.3 10.5z',
    copy: 'M8.5 8.5h11v12h-11zM5.5 15.5h-1v-12h11v1',
    trash: 'M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.5v.5',
    calendar: 'M4 6h16v15H4zM4 10.5h16M8.5 3v4.5M15.5 3v4.5',
    heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
    rocket: 'M12 15.5 8.5 12C10 7 13.5 3.5 20.5 3.5c0 7-3.5 10.5-8.5 12zM8.5 12l-4 .5 2.5-3.5h3.5M12 15.5l-.5 4 3.5-2.5v-3.5M5.5 18.5c-1 1-1 3-1 3s2 0 3-1',
    list: 'M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5v.1M4 12v.1M4 17.5v.1',
    sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
    moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z',
    phone: 'M7.5 2.5h9a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1zM11 18.5h2'
  };

  N.icon = function (name, opts) {
    opts = opts || {};
    const size = opts.size || 22;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'ic' + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.fill) {
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1');
      svg.setAttribute('stroke-linejoin', 'round');
    } else {
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', opts.sw || 2.2);
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
    }
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', P[name] || P.star);
    svg.appendChild(path);
    return svg;
  };

  // ---------- mascot: "Nitzi", a small spark-flame ----------
  const SKINS = {
    spark: ['#FFD84D', '#FF7A3D'],
    aqua: ['#7DF2DC', '#2F8BFF'],
    grape: ['#D7B3FF', '#7B4DFF'],
    lime: ['#E2F86A', '#22B573'],
    rose: ['#FFC1D3', '#F23D63'],
    night: ['#9DB0FF', '#3A2DB8']
  };
  N.SKINS = [
    { id: 'spark', name: 'ניצוץ קלאסי', price: 0 },
    { id: 'aqua', name: 'גל כחול', price: 120 },
    { id: 'grape', name: 'ענב סגול', price: 120 },
    { id: 'lime', name: 'ליים חשמלי', price: 150 },
    { id: 'rose', name: 'ורוד ניאון', price: 150 },
    { id: 'night', name: 'חצות', price: 200 }
  ];
  let uid = 0;
  const INK = '#1B1E3C';
  const BODY = 'M60 6C66 22 80 32 90 46C100 60 102 74 100 86C97 110 80 128 60 128C40 128 22 112 20 88C18 70 26 56 36 46C38 56 42 62 48 64C44 46 50 24 60 6Z';

  // ---------- guides: every character shares the same face (eyes at y=84, mouth near y=101) ----------
  const DARK_FEATHER = '#6B4429';
  N.AVATARS = [
    {
      id: 'spark', name: 'ניצי', desc: 'ניצוץ קטן עם המון אנרגיה', colors: SKINS.spark,
      draw: function (g) {
        return '<path d="' + BODY + '" fill="url(#' + g + ')"/>' +
          '<path d="M33 80C33 66 39 56 46 51" stroke="#fff" stroke-opacity=".55" stroke-width="5" fill="none" stroke-linecap="round"/>';
      }
    },
    {
      id: 'robot', name: 'רובי', desc: 'רובוט סקרן שאוהב סדר', colors: ['#A5E4FF', '#4C7DFF'], ink: '#7DF2DC', cheeks: false,
      draw: function (g) {
        return '<line x1="60" y1="42" x2="60" y2="22" stroke="#3A4A80" stroke-width="4" stroke-linecap="round"/>' +
          '<circle cx="60" cy="17" r="7" fill="#FF7A59"/>' +
          '<rect x="7" y="72" width="12" height="26" rx="5" fill="#3A4A80"/>' +
          '<rect x="101" y="72" width="12" height="26" rx="5" fill="#3A4A80"/>' +
          '<rect x="16" y="40" width="88" height="90" rx="28" fill="url(#' + g + ')"/>' +
          '<rect x="27" y="62" width="66" height="56" rx="20" fill="#1B1E3C"/>' +
          '<path d="M28 53C34 47 43 45 51 45" stroke="#fff" stroke-opacity=".55" stroke-width="5" fill="none" stroke-linecap="round"/>';
      }
    },
    {
      id: 'owl', name: 'ינשופי', desc: 'ינשוף חכם שתמיד חושב צעד קדימה', colors: ['#D9B08C', '#8A5A3B'], ink: '#4A2E1C', mouth: false, cheeks: false,
      draw: function (g) {
        return '<path d="M24 58L28 22L50 42Z" fill="' + DARK_FEATHER + '"/><path d="M96 58L92 22L70 42Z" fill="' + DARK_FEATHER + '"/>' +
          '<path d="M17 88C10 100 12 116 22 122C24 108 22 96 17 88Z" fill="' + DARK_FEATHER + '"/>' +
          '<path d="M103 88C110 100 108 116 98 122C96 108 98 96 103 88Z" fill="' + DARK_FEATHER + '"/>' +
          '<ellipse cx="60" cy="86" rx="44" ry="46" fill="url(#' + g + ')"/>' +
          '<ellipse cx="60" cy="110" rx="24" ry="18" fill="#F6E7CF"/>' +
          '<path d="M52 108L56 111L60 108L64 111L68 108M54 116L58 119L62 116L66 119" stroke="#D9B08C" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="47" cy="84" r="15" fill="#F6E7CF"/><circle cx="73" cy="84" r="15" fill="#F6E7CF"/>' +
          '<path d="M48 131H56M64 131H72" stroke="#FFB31F" stroke-width="4" stroke-linecap="round"/>';
      },
      over: function () { return '<path d="M55 96H65L60 104Z" fill="#FFB31F"/>'; }
    },
    {
      id: 'cat', name: 'מיצי', desc: 'חתול שתמיד שואל את השאלה הנכונה', colors: ['#FFD39A', '#F28C28'],
      draw: function (g) {
        return '<path d="M22 66L28 24L56 50Z" fill="#E07A1F"/><path d="M98 66L92 24L64 50Z" fill="#E07A1F"/>' +
          '<path d="M29 56L32 34L47 48Z" fill="#FFB0C0"/><path d="M91 56L88 34L73 48Z" fill="#FFB0C0"/>' +
          '<ellipse cx="60" cy="88" rx="44" ry="40" fill="url(#' + g + ')"/>' +
          '<path d="M53 52L55 62M60 50V61M67 52L65 62" stroke="#D9701A" stroke-width="3.5" stroke-linecap="round"/>';
      },
      over: function () {
        return '<path d="M56.5 95H63.5L60 99Z" fill="#FF8FA3"/>' +
          '<path d="M30 98L12 94M30 103L12 105M90 98L108 94M90 103L108 105" stroke="' + INK + '" stroke-opacity=".35" stroke-width="2.2" stroke-linecap="round"/>';
      }
    },
    {
      id: 'penguin', name: 'פינגי', desc: 'פינגווין רגוע ומדויק', colors: ['#5B6BA3', '#232B52'], mouth: false,
      draw: function (g) {
        return '<path d="M18 92C8 100 8 114 16 120C20 110 22 100 18 92Z" fill="#232B52"/>' +
          '<path d="M102 92C112 100 112 114 104 120C100 110 98 100 102 92Z" fill="#232B52"/>' +
          '<ellipse cx="60" cy="84" rx="42" ry="50" fill="url(#' + g + ')"/>' +
          '<path d="M60 62C46 62 32 68 30 84C28 104 40 128 60 128C80 128 92 104 90 84C88 68 74 62 60 62Z" fill="#F7F8FF"/>' +
          '<path d="M30 52C35 45 42 41 50 40" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<ellipse cx="48" cy="133" rx="9" ry="4" fill="#FFB31F"/><ellipse cx="72" cy="133" rx="9" ry="4" fill="#FFB31F"/>';
      },
      over: function () { return '<path d="M54 96H66L60 103Z" fill="#FFB31F"/>'; }
    },
    {
      id: 'cloud', name: 'ענני', desc: 'ענן רך שמרחף בין רעיונות', colors: ['#EEF7FF', '#9CCBFF'],
      draw: function (g) {
        return '<path d="M30 124C16 124 8 113 8 100C8 87 18 77 31 77C31 56 45 42 63 42C77 42 89 51 93 64C105 65 114 75 114 88C114 109 104 124 88 124Z" fill="url(#' + g + ')" stroke="#7FB2EE" stroke-width="2.5"/>' +
          '<path d="M24 96C24 88 29 82 36 81M48 58C52 53 57 50 63 50" stroke="#fff" stroke-opacity=".8" stroke-width="5" fill="none" stroke-linecap="round"/>';
      }
    }
  ];
  N.avatar = function (id) {
    id = id || (N.state && N.state.avatar) || 'spark';
    return N.AVATARS.find(function (a) { return a.id === id; }) || N.AVATARS[0];
  };
  N.guideName = function () { return N.avatar().name; };

  function eyes(mood, ink) {
    ink = ink || INK;
    if (mood === 'happy') {
      return '<path d="M39 86Q47 76 55 86" stroke="' + ink + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<path d="M65 86Q73 76 81 86" stroke="' + ink + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
    }
    const off = { idle: [0, 2], think: [-3, -4], sad: [0, 4], wow: [0, 0] }[mood] || [0, 2];
    const ry = mood === 'wow' ? 12 : 10;
    const pr = mood === 'wow' ? 4 : 4.6;
    let s = '';
    [47, 73].forEach(function (cx) {
      s += '<ellipse cx="' + cx + '" cy="84" rx="8.5" ry="' + ry + '" fill="#fff"/>' +
        '<circle cx="' + (cx + off[0]) + '" cy="' + (84 + off[1]) + '" r="' + pr + '" fill="' + INK + '"/>' +
        '<circle cx="' + (cx + off[0] + 1.6) + '" cy="' + (84 + off[1] - 1.8) + '" r="1.5" fill="#fff"/>';
    });
    if (mood === 'sad') {
      s += '<path d="M38 71L52 75M82 71L68 75" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>';
    } else if (mood === 'think') {
      s += '<path d="M39 72Q46 67 54 70" stroke="' + ink + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    }
    return s;
  }
  function mouth(mood, ink) {
    ink = ink || INK;
    switch (mood) {
      case 'happy':
        return '<path d="M50 99Q60 114 70 99Z" fill="' + ink + '"/><path d="M54.5 105Q60 110.5 65.5 105Z" fill="#FF8FA3"/>';
      case 'sad':
        return '<path d="M52 108Q60 101 68 108" stroke="' + ink + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
      case 'think':
        return '<path d="M54 104L67 102" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>';
      case 'wow':
        return '<ellipse cx="60" cy="105" rx="5.5" ry="6.5" fill="' + ink + '"/>';
      default:
        return '<path d="M52 101Q60 108 68 101" stroke="' + ink + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    }
  }

  // opts: { avatar, skin, size, anim }. Skins (shop colors) apply to the spark guide only.
  N.mascot = function (mood, opts) {
    mood = mood || 'idle';
    opts = opts || {};
    const av = N.avatar(opts.avatar);
    let c = av.colors;
    if (av.id === 'spark') {
      const skin = opts.skin || (N.state && N.state.skin) || 'spark';
      c = SKINS[skin] || SKINS.spark;
    }
    const id = 'mg' + (++uid);
    const wrap = document.createElement('span');
    wrap.className = 'mascot m-' + mood + (opts.anim ? ' ' + opts.anim : '');
    if (opts.size) wrap.style.width = opts.size + 'px';
    wrap.innerHTML =
      '<svg viewBox="0 0 120 140" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0.35" y2="1">' +
      '<stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>' +
      '<ellipse cx="60" cy="134" rx="30" ry="4.5" fill="' + INK + '" opacity=".12"/>' +
      av.draw(id) +
      (av.cheeks === false ? '' :
        '<ellipse cx="38" cy="99" rx="5.5" ry="3.4" fill="#FF5C7A" opacity=".3"/>' +
        '<ellipse cx="82" cy="99" rx="5.5" ry="3.4" fill="#FF5C7A" opacity=".3"/>') +
      eyes(mood, av.ink) +
      (av.mouth === false ? '' : mouth(mood, av.ink)) +
      (av.over ? av.over() : '') +
      '</svg>';
    return wrap;
  };
})();
