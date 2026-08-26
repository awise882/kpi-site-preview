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
      }, { rootMargin: '0px 0px -8% 0px' });
      /* .ledger is observed directly (never via a data-rise parent): its numeral
         must never move, so .in-view only draws its baseline rule and fades its
         hanging stamp. Both are fully visible without JS. */
      [].forEach.call(document.querySelectorAll('[data-rise], .fig--light, .ledger'), function (el) { io.observe(el); });
    }
  } catch (e) { /* motion is optional; content was never hidden */ }

  /* The detection tape marquee and its WCAG pause control were removed with the
     2026-08-24 auto-motion ruling: nothing on the site moves its own content,
     so there is nothing left to pause. */

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
      wkActivate(wkTabs[0]);
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
