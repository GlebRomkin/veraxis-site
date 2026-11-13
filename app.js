(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.mobile-menu');
  const progress = document.querySelector('.page-progress');
  const art = document.querySelector('.hero-art');
  const hero = document.querySelector('.hero');
  const wide = matchMedia('(min-width: 761px)');
  let frame = 0;
  let dirty = true;
  let lastTime = 0;
  const clamp = value => Math.max(0,Math.min(1,value));
  const scenes = [...document.querySelectorAll('.hero, .project-card, .manifesto, .about, .contact')]
    .map(element => ({element,value:0,target:0}));
  let revealObserver;
  function setMenu(open, focus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    if (focus) (open ? menu.querySelector('a') : toggle).focus();
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {
    if (menu.hidden) return;
    if (e.key === 'Escape') { setMenu(false,true); return; }
    if (e.key === 'Tab') {
      const items = [toggle, ...menu.querySelectorAll('a')];
      if (e.shiftKey && document.activeElement === items[0]) {e.preventDefault(); items.at(-1).focus();}
      else if (!e.shiftKey && document.activeElement === items.at(-1)) {e.preventDefault(); toggle.focus();}
    }
  });
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !e.target.closest('.header')) setMenu(false); });
  wide.addEventListener('change', () => { if (wide.matches) setMenu(false); schedule(); });
  // Small text groups enter separately, rather than fading a whole section at once.
  document.querySelectorAll('.manifesto p, .section-label, .contact-bottom, footer').forEach(el => el.classList.add('reveal'));
  document.querySelectorAll('.project-note, .about-text').forEach(group => {
    group.classList.remove('reveal');
    [...group.children].forEach((el,index) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${Math.min(index*70,210)}ms`);
    });
  });
  function configureMotion() {
    revealObserver?.disconnect();
    document.body.classList.toggle('scroll-motion',!reduced.matches);
    document.body.classList.toggle('motion',!reduced.matches && 'IntersectionObserver' in window);
    if (!reduced.matches && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      }), {threshold:.12,rootMargin:'0px 0px -5% 0px'});
      document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
    }
    if (reduced.matches) {
      art.style.removeProperty('transform');
      scenes.forEach(scene => scene.element.style.removeProperty('--scene'));
    }
    schedule();
  }
  function update(time) {
    frame = 0;
    if (document.hidden) {lastTime=0; return;}
    if (dirty) {
      // Read layout together, then write transforms: no layout changes while scrolling.
      const range = document.documentElement.scrollHeight - innerHeight;
      const rectangles = scenes.map(scene => scene.element.getBoundingClientRect());
      scenes.forEach((scene,index) => {
        const rect = rectangles[index];
        scene.target = scene.element === hero
          ? clamp(-rect.top / Math.max(1,rect.height))
          : clamp((innerHeight-rect.top)/(innerHeight+rect.height));
      });
      progress.style.transform = `scaleX(${range > 0 ? clamp(scrollY/range) : 0})`;
      dirty = false;
    }
    if (reduced.matches) {lastTime=0; return;}
    const dt = lastTime ? Math.min(time-lastTime,50) : 16;
    lastTime = time;
    const blend = 1-Math.exp(-dt/95);
    let settling = false;
    scenes.forEach(scene => {
      const delta = scene.target-scene.value;
      scene.value = Math.abs(delta)<.0008 ? scene.target : scene.value+delta*blend;
      if (Math.abs(scene.target-scene.value)>=.0008) settling = true;
      scene.element.style.setProperty('--scene',scene.value.toFixed(4));
      if (scene.element===hero) {
        const amount = scene.value;
        art.style.transform = `translate3d(0,${(amount*(wide.matches?52:26)).toFixed(2)}px,0) rotate(${(-amount*1.8).toFixed(3)}deg) scale(${(1+amount*.025).toFixed(4)})`;
      }
    });
    // Stop as soon as the easing settles. Touch scrolling uses the same path.
    if (settling) frame=requestAnimationFrame(update);
    else lastTime=0;
  }
  function schedule() {dirty=true; if (!frame) frame=requestAnimationFrame(update);}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',schedule);
  document.fonts?.ready.then(schedule);
  document.querySelectorAll('img').forEach(img => {if (!img.complete) img.addEventListener('load',schedule,{once:true});});
  // Keyboard users should never land on invisible links during an entrance.
  document.addEventListener('focusin', e => e.target.closest('.reveal')?.classList.add('visible'));
  reduced.addEventListener('change',configureMotion);
  configureMotion();
})();
