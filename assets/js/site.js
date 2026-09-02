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
    /* Keyboard parity: tabbing out of the open drawer closes it, so focus
       never lands behind the scrim. */
    nav.addEventListener('focusout', function (e) {
      if (nav.getAttribute('data-open') === 'true' &&
          e.relatedTarget && !nav.contains(e.relatedTarget)) setOpen(false);
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
      [].forEach.call(document.querySelectorAll('[data-rise], .fig--light, .ledger, .acs, .ct-stage, .sd-stage, .mxt, .mxs, .vig, .wk__scene, .fb__page'), function (el) { io.observe(el); });
    }
  } catch (e) { /* motion is optional; content was never hidden */ }

  /* The detection tape marquee and its WCAG pause control were removed with the
     2026-08-24 auto-motion ruling: nothing on the site moves its own content,
     so there is nothing left to pause. */

  /* r89: the settle belt is gone. It existed to rescue Chrome-only view()
     reveals in broken embedded panes; those reveals no longer exist, and under
     the r88 scrub engine the belt was actively harmful — runway elements park
     at opacity 0 by design until the reader scrolls, and the belt read that as
     "stuck" and froze the choreography (the reason the runways looked dead in
     Chrome while working everywhere else). */

  /* ---- mark the current page in the nav ---- */
  var here = location.pathname.split('/').pop() || 'index.html';
  [].forEach.call(document.querySelectorAll('.nav__links a'), function (a) {
    var href = a.getAttribute('href');
    if (href === here || (here === 'index.html' && href === './')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---- the explorable market walls (ruling 16, index) ----
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
        /* the scrub driver re-measures the freshly shown runway */
        try { window.dispatchEvent(new Event('scroll')); } catch (e) {}
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
         forwarded link opens the right desk instead of always the buyer's.
         r154 (a11y round 28): a hash pointing anywhere inside a hidden story
         (e.g. #sell-side from the section rail or the nav dropdown) activates
         that story too — the load-time resolution now runs on every change. */
      window.addEventListener('hashchange', function () {
        var id = location.hash.slice(1);
        var hit = null;
        wkTabs.forEach(function (t) { if (t.getAttribute('aria-controls') === id) hit = t; });
        if (!hit && id) {
          try {
            var tgt = document.getElementById(id);
            var host = tgt && tgt.closest ? tgt.closest('.wk__story') : null;
            if (host) {
              wkTabs.forEach(function (t) { if (t.getAttribute('aria-controls') === host.id) hit = t; });
              if (hit) { wkActivate(hit); tgt.scrollIntoView(); return; }
            }
          } catch (e) {}
        }
        if (hit) wkActivate(hit);
      });
      /* r124: a deep link to anything inside a hidden story (the seller's
         boards now live in the seller article) activates that story first. */
      var wkDeep = null;
      if (location.hash && location.hash.length > 1) {
        try {
          var wkTgt = document.getElementById(location.hash.slice(1));
          var wkHost = wkTgt && wkTgt.closest ? wkTgt.closest('.wk__story') : null;
          if (wkHost) wkDeep = wkHost.id;
        } catch (e) {}
      }
      var wkHash = (location.hash === '#wk-sell' || location.hash === '#wk-buy') ? location.hash.slice(1) : wkDeep;
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
    document.querySelectorAll('.sd__scroller,.tl__scroller,.ct__scroller,.mxs__scroller,.wkx__scroller,.mtl__scroller'));
  var plx = Array.prototype.slice.call(document.querySelectorAll('[data-plx]'));
  if (!els.length && !plx.length) return;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function gate() { root.classList.toggle('scrub', !reduce.matches); }
  gate();
  if (reduce.addEventListener) reduce.addEventListener('change', function () { gate(); kick(); });
  /* r113: an eased follower sits between the wheel and the stage — the wheel's
     discrete steps land as targets and the stage glides to them, so the pinned
     scenes stop printing every notch as a jerk. The loop keeps running only
     while something is still settling. */
  var cur = [], tgt = [], pcur = [], ptgt = [], raf = null;
  function measure() {
    var vh = window.innerHeight;
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      var span = r.height - vh;
      if (span <= 0) { tgt[i] = null; continue; }
      var p = -r.top / span;
      tgt[i] = p < 0 ? 0 : p > 1 ? 1 : p;
      if (cur[i] == null) cur[i] = tgt[i];
    }
    for (var j = 0; j < plx.length; j++) {
      var q = plx[j].getBoundingClientRect();
      if (!q.height) { ptgt[j] = null; continue; }
      var c = (vh / 2 - (q.top + q.height / 2)) / vh;
      ptgt[j] = c < -0.7 ? -0.7 : c > 0.7 ? 0.7 : c;
      if (pcur[j] == null) pcur[j] = ptgt[j];
    }
  }
  function frame() {
    raf = null;
    if (!root.classList.contains('scrub')) return;
    measure();
    var live = false, i, d;
    for (i = 0; i < els.length; i++) {
      if (tgt[i] == null) continue;
      d = tgt[i] - cur[i];
      if (Math.abs(d) > 0.0006) { cur[i] += d * 0.16; live = true; } else { cur[i] = tgt[i]; }
      els[i].style.setProperty('--scrub', cur[i].toFixed(4));
    }
    for (i = 0; i < plx.length; i++) {
      if (ptgt[i] == null) continue;
      d = ptgt[i] - pcur[i];
      if (Math.abs(d) > 0.0015) { pcur[i] += d * 0.14; live = true; } else { pcur[i] = ptgt[i]; }
      plx[i].style.setProperty('--plx', pcur[i].toFixed(4));
    }
    if (live) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick, { passive: true });
  window.addEventListener('load', kick);
  kick();
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

/* r97: The Book — the forty-race morning view. JS-off every drill-in renders
   open; this ADDS the collapsed view, row toggles, and the copy-the-morning-
   note action. Nothing moves on its own. */
(function () {
  var book = document.querySelector('[data-book]');
  if (!book) return;
  book.classList.add('bk--live');
  var rows = Array.prototype.slice.call(book.querySelectorAll('.rcbk-row'));
  rows.forEach(function (r, i) {
    r.setAttribute('tabindex', '0');
    r.setAttribute('role', 'button');
    r.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
    function toggle() {
      r.setAttribute('aria-expanded', r.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    }
    r.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      toggle();
    });
    r.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
  var btn = book.querySelector('.rcbk-copy');
  if (btn && navigator.clipboard) {
    btn.hidden = false;
    var note = [
      'THE BOOK - MORNING VIEW - posted thru Aug 30, 2026',
      'North River Senate: +$95K posted overnight (Ellery, WQZL Columbus, prime, flight opens Sep 7); Heartland Priorities PAC\'s :30 "First Light" runs Hulu-only, not yet on broadcast. Aired $5.5M / booked fwd $1.7M.',
      'Midstate Attorney General: +$3.3M this week; challenger side leads aired 60/40. Aired $16.0M / booked fwd $13.2M.',
      'North River Governor: +$1.8M booked forward, two weeks out. Aired $9.6M / booked fwd $4.5M.',
      'Granite Senate primary: WENT DARK overnight; remaining booked dollars pulled.',
      'Two Rivers Governor: +$420K posted (Beacon Hill, early news, 4 of 6 markets).',
      'Lakeshore CD-9: first TV order in the race (Citizens for Fair Elections, $340K).',
      'Prairie Senate: quiet.',
      '+ 35 more races - synthetic preview; the platform writes this from your book.'
    ].join('\n');
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(note).then(function () {
        var t = btn.textContent;
        btn.textContent = 'Copied \u2713';
        setTimeout(function () { btn.textContent = t; }, 1600);
      });
    });
  }
})();

/* r98: the streaming pulse hydrates from assets/data/streaming-pulse.json so a
   weekly refresh is one file edit. The HTML ships the current values, so a
   failed or blocked fetch (single-file preview bundles) changes nothing. */
(function () {
  var band = document.querySelector('[data-pulse]');
  if (!band || !window.fetch) return;
  fetch('assets/data/streaming-pulse.json').then(function (r) {
    return r.ok ? r.json() : null;
  }).then(function (d) {
    if (!d) return;
    Array.prototype.forEach.call(band.querySelectorAll('[data-p]'), function (el) {
      var v = d[el.getAttribute('data-p')];
      if (typeof v === 'string' && v) el.textContent = v.replace(/ – /g, ' \u2013 ');
    });
  }).catch(function () { /* static values stand */ });
})();

/* r111: mobile disclosures. The markup ships open so JS-off readers always see
   everything; on a small screen the walls fold to their one-line summaries. */
(function () {
  try {
    if (window.matchMedia && matchMedia('(max-width: 640px)').matches) {
      document.querySelectorAll('details.mdet[open]:not(.mdet--seat)').forEach(function (d) {
        d.removeAttribute('open');
      });
    }
  } catch (e) {}
})();

/* r127 (a11y): Escape dismisses an open nav dropdown — hover/focus opens it,
   and a keyboard reader needs a way out that isn't tabbing through the menu. */
(function () {
  try {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var el = document.activeElement;
      if (el && el.closest && el.closest('.nav__item')) el.blur();
    });
  } catch (e) {}
})();


/* r134 (maverick ten): the nameable signature — the header's navy-to-lime
   r148 (Doug, the outside reader): the section tabs under the main nav.
   Scroll-spy sets the active tab; week's desk links switch the desk first.
   The hairline is also the page's progress spine. It draws with the read on every
   page; informational, so it runs under reduced motion too. */
(function () {
  try {
    var spine = document.createElement('div');
    spine.id = 'page-spine';
    spine.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spine);
    var doc = document.documentElement;
    var raf = false;
    function draw() {
      raf = false;
      var max = doc.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      spine.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    addEventListener('scroll', function () {
      if (!raf) { raf = true; requestAnimationFrame(draw); }
    }, { passive: true });
    draw();
  } catch (e) {}
})();

/* r136: the press credit copies exactly — the reporter retypes nothing at
   11 PM (round 21). The button ships hidden; it appears only when the
   clipboard is actually available. */
(function () {
  var b = document.getElementById('copy-credit');
  if (!b || !navigator.clipboard || !navigator.clipboard.writeText) return;
  b.hidden = false;
  var st = document.createElement('span');
  st.className = 'sr-only';
  st.setAttribute('role', 'status');
  b.insertAdjacentElement('afterend', st);
  b.addEventListener('click', function () {
    navigator.clipboard.writeText(b.getAttribute('data-credit')).then(function () {
      var t = b.textContent;
      b.textContent = 'Copied ✓';
      st.textContent = 'Credit copied to clipboard';
      setTimeout(function () { b.textContent = t; st.textContent = ''; }, 1600);
    });
  });
})();


/* r143: deep links into a closed <details> open it first — the measurement
   drawing lives in an expansion now, and six pages link straight to it. */
(function () {
  function openTo() {
    if (!location.hash || location.hash.length < 2) return;
    var t;
    try { t = document.querySelector(location.hash); } catch (e) { return; }
    if (!t) return;
    var d = t.closest ? t.closest('details') : null;
    if (t.tagName === 'DETAILS') d = t;
    if (d && !d.open) { d.open = true; t.scrollIntoView(); }
  }
  window.addEventListener('hashchange', openTo);
  openTo();
})();


/* ===== r149: the section rail — the marker walks the line ===== */
(function () {
  var bar = document.querySelector('.ptabs');
  if (!bar) return;
  bar.classList.add('ptabs--js');
  var links = Array.prototype.slice.call(bar.querySelectorAll('a[href^="#"]'));
  var stamp = bar.querySelector('.ptabs__stamp');
  var map = [];
  links.forEach(function (a) {
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) map.push({ a: a, el: el });
  });
  if (!map.length) return;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  bar.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (id === 'wk-buy' || id === 'wk-sell') {
      var tab = document.getElementById(id === 'wk-buy' ? 'wk-tab-buy' : 'wk-tab-sell');
      if (tab) tab.click();
    } else {
      /* r154: a rail target inside a hidden week story opens that story first,
         so the browser's own hash-jump lands on a visible element. */
      var tgt = document.getElementById(id);
      var host = tgt && tgt.closest ? tgt.closest('.wk__story') : null;
      if (host) {
        var tab2 = document.getElementById(host.id === 'wk-buy' ? 'wk-tab-buy' : 'wk-tab-sell');
        if (tab2) tab2.click();
      }
    }
    bar.removeAttribute('data-open');
    if (stamp) stamp.setAttribute('aria-expanded', 'false');
  });
  if (stamp) {
    stamp.addEventListener('click', function () {
      var open = bar.hasAttribute('data-open');
      if (open) bar.removeAttribute('data-open'); else bar.setAttribute('data-open', '');
      stamp.setAttribute('aria-expanded', String(!open));
    });
    /* r154 (a11y round 28): the open jump menu closes on Escape and when
       focus leaves the rail — mirroring the main drawer's behavior. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bar.hasAttribute('data-open')) {
        bar.removeAttribute('data-open');
        stamp.setAttribute('aria-expanded', 'false');
        stamp.focus();
      }
    });
    bar.addEventListener('focusout', function () {
      requestAnimationFrame(function () {
        if (bar.hasAttribute('data-open') && !bar.contains(document.activeElement)) {
          bar.removeAttribute('data-open');
          stamp.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  var current = -1;
  var apply = function (idx) {
    if (idx === current) return;
    current = idx;
    var m = map[idx];
    links.forEach(function (l) { l.classList.toggle('is-on', l === m.a); });
    var br = bar.getBoundingClientRect(), ar = m.a.getBoundingClientRect();
    if (br.width && ar.width) {
      var p = ((ar.left + ar.width / 2 - br.left) / br.width) * 100;
      bar.style.setProperty('--pt-p', Math.max(0, Math.min(100, p)).toFixed(2) + '%');
    }
    if (stamp) stamp.textContent = pad(idx + 1) + ' / ' + pad(map.length) +
      ' \u00B7 ' + (m.a.getAttribute('data-t') || m.a.textContent).toUpperCase();
  };
  var navH = 78;
  try { navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 78; } catch (e) {}
  var ticking = false;
  var spy = function () {
    ticking = false;
    var y = window.scrollY + navH + 120;
    var idx = 0;
    for (var i = 0; i < map.length; i++) {
      var el = map[i].el;
      if (el.offsetParent === null && !el.getClientRects().length) continue;
      if (el.getBoundingClientRect().top + window.scrollY <= y) idx = i;
    }
    apply(idx);
  };
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(spy); }
  }, { passive: true });
  window.addEventListener('resize', function () { current = -1; spy(); }, { passive: true });
  spy();
})();
