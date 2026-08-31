/* KPI site shared behavior. No dependencies, no external requests. */
(function () {
  'use strict';

  /* ---- mobile nav: toggle, Esc-to-close with focus return, outside-tap close.
     The visible label flips Menu/Close so the state is never a mystery. ---- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav__toggle');
  if (nav && toggle) {
    var setOpen = function (open) {
      nav.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Close' : 'Menu';
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    };
    toggle.addEventListener('click', function () {
      setOpen(nav.getAttribute('data-open') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('.nav__links a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (nav.getAttribute('data-open') !== 'true') return;
      /* Outside taps close the drawer; so does a tap on the scrim, which hit-tests
         as the nav element itself (the scrim is the nav's ::after). */
      if (!e.target.closest('.nav') || e.target === nav) setOpen(false);
    });
  }

  /* ---- nav scroll response: shadow after 8px, scroll-hint fade after 120px ---- */
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('nav--scrolled', window.scrollY > 8);
      document.documentElement.classList.toggle('is-scrolled', window.scrollY > 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- hero load choreography gate. Content is visible without this class;
     .is-loaded only ADDS the entrance motion, so a no-JS render is complete. ---- */
  requestAnimationFrame(function () { document.documentElement.classList.add('is-loaded'); });

  /* Statistics are deliberately NOT animated. Count-up widgets render their
     start value whenever the observer misses, which is how a site ends up
     advertising "0M+ ads tracked". On a page whose whole argument is that the
     numbers are trustworthy, a number that is briefly wrong costs more than the
     animation is worth. The true value ships in the HTML and stays there. */

  /* ---- additive entrance motion: IO adds a class, never supplies visibility ---- */
  try {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -2% 0px' });
      /* .ledger is observed directly (never via a data-rise parent): its numeral
         must never move, so .in-view only draws its baseline rule and fades its
         hanging stamp. Both are fully visible without JS. Pass E adds the new
         entry-triggered stages: the alert assembly (.acs), the contour and
         diagonal scenes (.ct-stage/.sd-stage — their scrubbed desktop variants
         override these one-shots), the matrix pieces (.mxt/.mxs) and the
         platform vignettes (.vig). All are fully visible without JS. */
      [].forEach.call(document.querySelectorAll('[data-rise], .fig--light, .ledger, .acs, .ct-stage, .sd-stage, .mxt, .mxs, .vig'), function (el) { io.observe(el); });
    }
  } catch (e) { /* motion is optional; content was never hidden */ }

  /* The detection tape marquee and its WCAG pause control were removed with the
     2026-08-24 auto-motion ruling: nothing on the site moves its own content,
     so there is nothing left to pause. */

  /* ---- scroll-reveal settle belt (paths-pass blocker, 2026-08-26) ----
     Some embedded Chromium panes claim animation-timeline support but never
     advance a scroll timeline, so a view()-driven reveal holds its element at
     opacity 0 (or scaleX 0) forever and whole scenes render blank. The belt:
     a rAF-throttled scroll check plus a slow interval walks the animated
     candidates; any element that has sat at least 40% in-viewport for ~300ms
     while still computing opacity < 0.1 (or a collapsed scaleX) gets
     .is-settled, which forces animation:none / opacity:1 / transform:none in
     CSS. Real Chrome keeps its motion (healthy elements never test stuck);
     IntersectionObserver is deliberately NOT used here, because the broken
     panes are the same ones where IO never fires. Reduced-motion pages are
     already static and are skipped. */
  try {
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()') &&
        !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var beltSel = '[data-rise] > *, .wk__art, .fig__svg rect, .fig__svg g[data-u], ' +
                    '.aw__fill, .ledger__rule, .ew__rule, ' +
                    '.ct__ring, .ct__gaphatch, .ct__ann, .ct__note, ' +
                    '.sd__dots circle, .sd__under, .sd__diag, .sd__ann, .sd__note, ' +
                    '.mxs__stage path, .id__node, .id__arrow';
      var beltEls = [].slice.call(document.querySelectorAll(beltSel));
      var beltSeen = [];
      var beltStuck = function (el) {
        var cs = getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.1) return true;
        /* Pass E: draw-on strokes park at dashoffset 1 (of a pathLength-1 dash)
           when a claimed-but-dead timeline never advances; that is invisible
           too, so the belt reads it the same way. */
        var so = parseFloat(cs.strokeDashoffset);
        var sa = parseFloat(cs.strokeDasharray);
        if (!isNaN(so) && !isNaN(sa) && sa <= 1.5 && so > 0.9) return true;
        var m = /^matrix\(([-\d.e]+),/.exec(cs.transform || '');
        return !!(m && Math.abs(parseFloat(m[1])) < 0.05);
      };
      var beltTick = function () {
        if (!beltEls.length) { clearInterval(beltIv); return; }
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var now = Date.now();
        for (var i = beltEls.length - 1; i >= 0; i--) {
          var el = beltEls[i];
          var r = el.getBoundingClientRect();
          if (!r.height && !r.width) { continue; } /* hidden tab panel: skip, keep watching */
          var vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
          if (vis / (r.height || 1) >= 0.4) {
            if (!beltSeen[i]) { beltSeen[i] = now; continue; }
            if (now - beltSeen[i] >= 300) {
              if (beltStuck(el)) el.classList.add('is-settled');
              beltEls.splice(i, 1); beltSeen.splice(i, 1);
            }
          } else {
            beltSeen[i] = 0;
          }
        }
      };
      var beltIv = setInterval(beltTick, 350);
      var beltRaf = 0;
      window.addEventListener('scroll', function () {
        if (beltRaf) return;
        beltRaf = requestAnimationFrame(function () { beltRaf = 0; beltTick(); });
      }, { passive: true });
      beltTick();
    }
  } catch (e) { /* the belt is optional; base content was never hidden by JS */ }

  /* ---- mark the current page in the nav ---- */
  var here = location.pathname.split('/').pop() || 'index.html';
  [].forEach.call(document.querySelectorAll('.nav__links a'), function (a) {
    var href = a.getAttribute('href');
    if (href === here || (here === 'index.html' && href === './')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---- the explorable air war (ruling 16, index) ----
     JS-off the section renders all three market panels stacked, complete; this
     block only ADDS the market rail and collapses the stage to the chosen panel.
     Hover, click and keyboard all drive it; nothing in it moves on its own. */
  var aw = document.querySelector('[data-aw]');
  if (aw) {
    var awTabs = [].slice.call(aw.querySelectorAll('.aw__mkt'));
    var awPanels = [].slice.call(aw.querySelectorAll('.aw__panel'));
    if (awTabs.length && awPanels.length) {
      aw.classList.add('aw--live');
      var awActivate = function (tab, focus) {
        awTabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
        });
        awPanels.forEach(function (p) {
          if (p.id === tab.getAttribute('aria-controls')) { p.removeAttribute('hidden'); }
          else { p.setAttribute('hidden', ''); }
        });
        if (focus) tab.focus();
      };
      awTabs.forEach(function (t, i) {
        t.addEventListener('click', function () { awActivate(t); });
        /* Hover previews a market, but never fights the keyboard: if focus sits
           inside a panel (a lane the reader tabbed to) or on another tab, the
           pointer pass-over must not hide the panel holding focus or yank the
           roving tabindex out from under the arrow keys. */
        t.addEventListener('pointerenter', function () {
          var a = document.activeElement;
          if (a && a !== document.body && aw.contains(a)) {
            if (a.closest('.aw__panel')) return;
            if (a !== t && a.closest('.aw__rail')) return;
          }
          awActivate(t);
        });
        t.addEventListener('keydown', function (e) {
          var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
                : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          awActivate(awTabs[(i + d + awTabs.length) % awTabs.length], true);
        });
      });
      awActivate(awTabs[0]);
      /* Lane read line: hover, focus or tap a lane and the panel's own aria-live
         line, directly under the lanes, says what stands under that number. */
      [].forEach.call(aw.querySelectorAll('.aw__lane[data-note]'), function (lane) {
        var panel = lane.closest('.aw__panel');
        var note = panel ? panel.querySelector('.aw__note') : null;
        if (!note) return;
        var dflt = note.innerHTML;
        var show = function () { note.textContent = lane.getAttribute('data-note'); };
        var hide = function () { note.innerHTML = dflt; };
        lane.addEventListener('pointerenter', show);
        lane.addEventListener('focus', show);
        lane.addEventListener('pointerleave', hide);
        lane.addEventListener('blur', hide);
      });
    }
  }

  /* ---- the week's two stories (ruling 39b, index) ----
     JS-off both stories render stacked as chapters, complete; this block only
     ADDS the buyer/seller rail and collapses the stage to the chosen story.
     Click and arrow keys drive it; nothing switches on its own. */
  var wk = document.querySelector('[data-wk]');
  if (wk) {
    var wkTabs = [].slice.call(wk.querySelectorAll('.wk__tab'));
    var wkPanels = [].slice.call(wk.querySelectorAll('.wk__story'));
    if (wkTabs.length && wkPanels.length) {
      wk.classList.add('wk--live');
      var wkActivate = function (tab, focus) {
        wkTabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
        });
        wkPanels.forEach(function (p) {
          if (p.id === tab.getAttribute('aria-controls')) { p.removeAttribute('hidden'); }
          else { p.setAttribute('hidden', ''); }
        });
        if (focus) tab.focus();
      };
      wkTabs.forEach(function (t, i) {
        t.addEventListener('click', function () { wkActivate(t); });
        t.addEventListener('keydown', function (e) {
          var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
                : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          wkActivate(wkTabs[(i + d + wkTabs.length) % wkTabs.length], true);
        });
      });
      /* Round-1 panel fix (seller): #wk-sell and #wk-buy are deep links — a
         forwarded link opens the right desk instead of always the buyer's. */
      var wkHash = (location.hash === '#wk-sell' || location.hash === '#wk-buy') ? location.hash.slice(1) : null;
      var wkInit = null;
      if (wkHash) {
        wkTabs.forEach(function (t) { if (t.getAttribute('aria-controls') === wkHash) wkInit = t; });
      }
      wkActivate(wkInit || wkTabs[0]);
      if (wkInit) {
        /* Land on the tab rail, not the panel top: a forwarded seller sees
           which desk they are on before Beat 1 starts. Runs again after load
           because the browser's own late hash-jump wins over an early rAF. */
        var wkLand = function () {
          var el = document.getElementById(wkHash);
          var rail = el && el.closest('.wk');
          if (rail || el) (rail || el).scrollIntoView();
        };
        requestAnimationFrame(wkLand);
        window.addEventListener('load', function () { setTimeout(wkLand, 60); });
      }
    }
  }

  /* ---- Baker recreation (platform): the example chips are the one live control
     in a recreation. A chip writes the composer; Send carries the question into
     the demo request, where contact.html pre-fills the ask from ?prompt=. ---- */
  /* ---- Baker in action (ruling 43, platform): four example questions, click
     one to reveal its pre-written illustrative answer. The first pair renders
     by default, JS-off shows it statically, and nothing advances on its own.
     Click and arrow keys drive it, same pattern as the week's two stories. ---- */
  var bd = document.querySelector('[data-bdemo]');
  if (bd) {
    var bdTabs = [].slice.call(bd.querySelectorAll('.rc-bdemo-chip'));
    var bdPanels = [].slice.call(bd.querySelectorAll('.rc-bdemo-a'));
    if (bdTabs.length && bdPanels.length) {
      var bdActivate = function (tab, focus) {
        bdTabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
        });
        bdPanels.forEach(function (p) {
          if (p.id === tab.getAttribute('aria-controls')) { p.removeAttribute('hidden'); }
          else { p.setAttribute('hidden', ''); }
        });
        if (focus) tab.focus();
      };
      bdTabs.forEach(function (t, i) {
        t.addEventListener('click', function () { bdActivate(t); });
        t.addEventListener('keydown', function (e) {
          var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
                : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          bdActivate(bdTabs[(i + d + bdTabs.length) % bdTabs.length], true);
        });
      });
    }
  }

  /* ---- Pass E §9: vignette replay. A vignette plays its <=3 beats once on
     entry (IO adds .in-view). Hovering the card replays the same beats by
     re-adding the class; reduced-motion never replays, and with JS off the
     vignette simply rests on its final beat. ---- */
  [].forEach.call(document.querySelectorAll('[data-replay]'), function (v) {
    v.addEventListener('pointerenter', function () {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!v.classList.contains('in-view')) return;
      v.classList.remove('in-view');
      void v.offsetWidth;
      v.classList.add('in-view');
    });
  });

  var baker = document.querySelector('.rc-baker');
  if (baker) {
    var bInput = baker.querySelector('.rc-baker-input');
    var bSend = baker.querySelector('a.rc-baker-send');
    [].forEach.call(baker.querySelectorAll('.rc-baker-ex'), function (chip) {
      chip.addEventListener('click', function () {
        var q = chip.textContent.trim();
        if (bInput) {
          bInput.textContent = q;
          bInput.classList.add('rc-baker-input-filled');
        }
        if (bSend) bSend.setAttribute('href', 'contact.html?prompt=' + encodeURIComponent(q));
      });
    });
  }
})();

/* r37: deep links into folded methodology chapters open the fold first. */
(function () {
  function openFoldFor(hash) {
    if (!hash || hash.length < 2) return;
    var el = document.getElementById(hash.slice(1));
    if (!el) return;
    var d = el.closest ? el.closest('details') : null;
    var opened = false;
    while (d) { if (!d.open) { d.open = true; opened = true; } d = d.parentElement ? d.parentElement.closest('details') : null; }
    if (opened) requestAnimationFrame(function () { el.scrollIntoView(); });
  }
  openFoldFor(location.hash);
  addEventListener('hashchange', function () { openFoldFor(location.hash); });
})();

/* r37: Baker types its own example questions until the reader takes over. */
(function () {
  var demo = document.querySelector('[data-bdemo]');
  if (!demo) return;
  var line = demo.querySelector('[data-bdemo-type]');
  var chips = Array.prototype.slice.call(demo.querySelectorAll('.rc-bdemo-chip'));
  if (!line || chips.length < 2) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { line.textContent = chips[0].textContent; return; }
  var idx = 0, stopped = false, timer = 0;
  function activate(chip) {
    chips.forEach(function (c) {
      var on = c === chip;
      c.setAttribute('aria-selected', on ? 'true' : 'false');
      c.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(c.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  }
  function typeQuestion(text, done) {
    var i = 0;
    line.textContent = '';
    (function tick() {
      if (stopped) return;
      line.textContent = text.slice(0, ++i);
      if (i < text.length) timer = setTimeout(tick, 26);
      else done();
    })();
  }
  function cycle() {
    if (stopped) return;
    var chip = chips[idx % chips.length];
    typeQuestion(chip.textContent.trim(), function () {
      if (stopped) return;
      activate(chip);
      idx++;
      timer = setTimeout(cycle, 6200);
    });
  }
  function stop() { stopped = true; clearTimeout(timer); }
  demo.addEventListener('pointerdown', stop, { once: true });
  demo.addEventListener('keydown', stop, { once: true });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { cycle(); io.disconnect(); } });
  }, { threshold: 0.4 });
  io.observe(demo);
})();

/* Deep links land true: layout can grow after the browser's native hash jump
   (fonts, staged figures), so the landing re-asserts itself after load. The
   week tabs run their own two-pass landing and are skipped here. */
(function () {
  var h = location.hash;
  if (!h || h === '#' || h === '#wk-buy' || h === '#wk-sell') return;
  var cancelled = false;
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { cancelled = true; }, { passive: true, once: true });
  });
  var land = function () {
    if (cancelled) return;
    var el;
    try { el = document.querySelector(h); } catch (e) { return; }
    if (el) el.scrollIntoView();
  };
  /* Layout can keep growing for a beat after load (late fonts, staged
     sections), so the landing re-asserts on a short schedule. */
  window.addEventListener('load', function () {
    [90, 700, 1400].forEach(function (ms) { setTimeout(land, ms); });
  });
})();

/* r88: universal scrub driver. The pinned runways (share diagonal, calendar walk,
   contour map, matrix story) were driven by CSS animation-timeline — Chrome-only.
   This drives the same keyframes everywhere by setting --scrub (0..1) across each
   runway; the CSS holds them as paused animations scrubbed by negative delay.
   Reduced motion or no JS: no .scrub class, static end-states render. */
(function () {
  var els = Array.prototype.slice.call(
    document.querySelectorAll('.sd__scroller,.tl__scroller,.ct__scroller,.mxs__scroller'));
  if (!els.length) return;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function gate() { root.classList.toggle('scrub', !reduce.matches); }
  gate();
  if (reduce.addEventListener) reduce.addEventListener('change', function () { gate(); frame(); });
  var ticking = false;
  function frame() {
    ticking = false;
    if (!root.classList.contains('scrub')) return;
    var vh = window.innerHeight;
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      var span = r.height - vh;
      if (span <= 0) continue;
      var p = -r.top / span;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      els[i].style.setProperty('--scrub', p.toFixed(4));
    }
  }
  function kick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick, { passive: true });
  window.addEventListener('load', kick);
  frame();
})();

/* r88b: the platform board deck. The rail is in the HTML, hidden JS-off; this
   only ADDS the collapsed one-board-at-a-time view. Any deep link into a panel
   (every existing #scoreboard/#creative-matrix/#buy-sheet/#creative-explorer
   link on the site) routes to its tab and the deck opens on it. */
(function () {
  var pb = document.querySelector('[data-pb]');
  if (!pb) return;
  var tabs = Array.prototype.slice.call(pb.querySelectorAll('.pb__tab'));
  var panels = Array.prototype.slice.call(pb.querySelectorAll('.pb__panel'));
  if (!tabs.length || !panels.length) return;
  pb.classList.add('pb--live');
  function activate(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) {
      if (p.id === tab.getAttribute('aria-controls')) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { activate(t); });
    t.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
            : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      activate(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
  function tabForHash() {
    if (!location.hash || location.hash.length < 2) return null;
    var el = null;
    try { el = document.getElementById(location.hash.slice(1)); } catch (e) { return null; }
    if (!el) return null;
    var panel = el.closest ? el.closest('.pb__panel') : null;
    if (!panel) return null;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('aria-controls') === panel.id) return tabs[i];
    }
    return null;
  }
  var init = tabForHash();
  activate(init || tabs[0]);
  if (init) {
    /* Land on the deck head, not the panel body: the reader sees which board
       they are on. Runs again after load because the browser's own late
       hash-jump wins over an early rAF. */
    var land = function () { pb.scrollIntoView(true); };
    requestAnimationFrame(land);
    window.addEventListener('load', function () { setTimeout(land, 60); });
  }
  window.addEventListener('hashchange', function () {
    var t = tabForHash();
    if (t) { activate(t); pb.scrollIntoView(true); }
  });
})();
