(function () {
  'use strict';
  const N = window.N;

  N.buildIndex();
  const streakNews = N.reconcileStreak();
  N.ensureQuests();
  N.scrollToCurrent = true;
  const cloud = N.initCloud();
  if (N.state.profile.onboarded || !window.claude) {
    N.render();
  } else {
    // A new device: wait briefly for saved progress before showing onboarding, so it is never overwritten.
    Promise.race([cloud, new Promise(function (r) { setTimeout(r, 4000); })]).then(function () {
      if (!document.querySelector('.shell, .onb')) N.render();
    });
  }

  if (streakNews && streakNews.used) N.pendingToasts.push({ text: 'הקפאת רצף שמרה לך על הרצף', icon: 'snow' });
  if (streakNews && streakNews.lost) N.pendingToasts.push({ text: 'הרצף התאפס. מתחילים רצף חדש היום!', icon: 'flame' });
  setTimeout(N.flushToasts, 600);

  N.on('state:replaced', function () {
    if (N.inSession) return;
    N.reconcileStreak();
    N.ensureQuests();
    N.render();
  });
  N.on('ai', function () {
    if (!N.inSession && N.route === 'practice') N.render();
  });

  if (N.sync) N.sync.init();

  // a new day while the app stays open
  let day = N.today();
  setInterval(function () {
    if (N.today() === day) return;
    day = N.today();
    N.reconcileStreak();
    N.ensureQuests();
    if (!N.inSession && !document.querySelector('.modal-back')) N.render();
  }, 60000);
})();
