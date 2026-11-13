(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 761px)');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.mobile-menu');
  const progress = document.querySelector('.page-progress');
  const art = document.querySelector('.hero-art');
  const hero = document.querySelector('.hero');
  const clamp = value => Math.max(0, Math.min(1, value));
  document.body.dataset.motionVersion = 'motion-4';

  function listenToMedia(query, callback) {
    if (query.addEventListener) query.addEventListener('change', callback);
    else query.addListener(callback);
  }
  function setMenu(open, focus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    if (focus) (open ? menu.querySelector('a') : toggle).focus();
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { setMenu(false, true); return; }
    if (event.key === 'Tab') {
      const items = [toggle, ...menu.querySelectorAll('a')];
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault(); items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault(); toggle.focus();
      }
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !event.target.closest('.header')) setMenu(false);
  });

  document.querySelectorAll('.manifesto, .section-label, .contact-bottom').forEach(element => element.classList.add('reveal'));
  const entries = [...document.querySelectorAll('.reveal')].map(element => ({
    element, card:element.classList.contains('project-card'), top:0, value:1, forced:false
  }));
  let frame = 0;
  let lastTime = 0;
  let needsLayout = true;
  let initialized = false;
  let viewportHeight = innerHeight;
  let maxScroll = 1;
  let heroHeight = 1;
  let artValue = 0;

  // These layout coordinates exclude transforms, keeping trigger points stable.
  function documentTop(element) {
    let top = 0;
    for (let current = element; current; current = current.offsetParent) top += current.offsetTop;
    return top;
  }
  function measure() {
    viewportHeight = document.documentElement.clientHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
    heroHeight = hero.offsetHeight;
    entries.forEach(entry => { entry.top = documentTop(entry.element); });
    needsLayout = false;
  }
  function entrance(entry, y) {
    if (entry.forced || reduced.matches) return 1;
    const start = entry.top - viewportHeight * .94;
    // The last section must finish before the bottom of the document.
    const finish = Math.min(maxScroll, entry.top - viewportHeight * .5);
    const value = clamp((y - start) / Math.max(1, finish - start));
    return value * value * (3 - 2 * value);
  }
  function update(time) {
    frame = 0;
    if (document.hidden) { lastTime = 0; return; }
    if (needsLayout) measure();
    const y = Math.max(0, scrollY);
    progress.style.transform = 'scaleX(' + (maxScroll ? clamp(y / maxScroll) : 0) + ')';
    const blend = initialized ? 1 - Math.exp(-Math.min(time - (lastTime || time - 16), 50) / 70) : 1;
    let settling = false;
    entries.forEach(entry => {
      const target = entrance(entry, y);
      const difference = target - entry.value;
      entry.value = reduced.matches || Math.abs(difference) < .001 ? target : entry.value + difference * blend;
      if (Math.abs(target - entry.value) >= .001) settling = true;
      const remaining = 1 - entry.value;
      entry.element.style.setProperty('--enter-opacity', (1 - remaining * (entry.card ? .82 : .9)).toFixed(4));
      entry.element.style.setProperty('--enter-y', (remaining * (entry.card ? 56 : 30)).toFixed(2) + 'px');
      entry.element.style.setProperty('--enter-scale', (1 - remaining * (entry.card ? .045 : 0)).toFixed(4));
    });
    const artTarget = reduced.matches ? 0 : clamp(y / Math.max(1, heroHeight));
    artValue = Math.abs(artTarget - artValue) < .001 ? artTarget : artValue + (artTarget - artValue) * blend;
    if (Math.abs(artTarget - artValue) >= .001) settling = true;
    art.style.transform = reduced.matches ? '' : 'translate3d(0,' + (artValue * 38).toFixed(2) + 'px,0) rotate(' + (-artValue * 3).toFixed(3) + 'deg)';
    // The parent handles scrolling; CSS owns the image float and card hover.
    document.body.classList.toggle('wave-active', !reduced.matches && y < heroHeight + 100);
    document.body.classList.toggle('motion', !reduced.matches);
    initialized = true;
    lastTime = time;
    if (settling) frame = requestAnimationFrame(update);
    else lastTime = 0;
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function layoutChanged() { needsLayout = true; schedule(); }
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', layoutChanged, {passive:true});
  if (window.visualViewport) window.visualViewport.addEventListener('resize', layoutChanged, {passive:true});
  addEventListener('pageshow', layoutChanged);
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-hidden', document.hidden);
    schedule();
  });
  document.fonts?.ready.then(layoutChanged);
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', layoutChanged, {once:true});
  });
  if ('ResizeObserver' in window) new ResizeObserver(layoutChanged).observe(document.querySelector('.page-wrap'));
  document.addEventListener('focusin', event => {
    const entry = entries.find(item => item.element.contains(event.target));
    if (entry) { entry.forced = true; entry.value = 1; schedule(); }
  });
  listenToMedia(wide, () => { if (wide.matches) setMenu(false); layoutChanged(); });
  listenToMedia(reduced, () => { initialized = false; schedule(); });
  schedule();
})();
