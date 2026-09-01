/* Syndicated segment explorer.
   Searches the always-on question library and lets a visitor assemble a
   shortlist they can hand to their account team. Client-side only: the JSON
   ships with the page, nothing is transmitted anywhere. */
(function () {
  'use strict';

  var elSearch = document.getElementById('sx-q');
  if (!elSearch) return;

  var elResults = document.getElementById('sx-results');
  var elCount = document.getElementById('sx-count');
  var elDomains = document.getElementById('sx-domains');
  var elCats = document.getElementById('sx-cats');
  var elBasket = document.getElementById('sx-basket');
  var elBasketList = document.getElementById('sx-basket-list');
  var elBasketN = document.getElementById('sx-basket-n');
  var elClear = document.getElementById('sx-clear');
  var elCopy = document.getElementById('sx-copy');
  var elEmpty = document.getElementById('sx-empty');
  var elExamples = document.getElementById('sx-examples');

  /* The result count changes without a page load, so it is announced. */
  if (elCount) {
    elCount.setAttribute('role', 'status');
    elCount.setAttribute('aria-live', 'polite');
    elCount.setAttribute('aria-atomic', 'true');
  }

  var DATA = [];
  var picked = [];
  var state = { q: '', domain: '', cat: '' };
  var PAGE = 60;
  var shown = PAGE;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    var terms = q.split(/\s+/).filter(Boolean).map(function (t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    if (!terms.length) return safe;
    return safe.replace(new RegExp('(' + terms.join('|') + ')', 'gi'), '<mark>$1</mark>');
  }

  /* The library is a general consumer library, so its natural order opens on
     household demographics. A political visitor should land on questions that
     look like their job. With no query and no filter, categories a campaign
     actually buys against sort to the front; everything else keeps library
     order behind them. Searching or filtering drops back to library order,
     because then the reader's own terms are doing the ranking. */
  var POLITICAL_FIRST = [
    'Politics', 'Sensitive Topics', 'Business and Finance', 'Personal Finance',
    'Medical Health', 'Education', 'Careers', 'Science', 'Personal Debt',
    'Healthy Living', 'Disasters', 'War and Conflicts', 'Religion & Spirituality',
    'Family and Relationships', 'Real Estate', 'Demographic'
  ];
  /* Within those categories, rows that read like the job come first: a
     strategist scanning the default list should hit ballots and issues before
     brand batteries that happen to share a category. */
  var POLITICAL_TERMS = /election|vote|voting|ballot|candidate|politic|government|congress|governor|president|senate|taxes|inflation|economy|immigration|abortion|guns|climate|health care|healthcare|local news|cable news/i;

  function match() {
    var q = state.q.trim().toLowerCase();
    var terms = q ? q.split(/\s+/).filter(Boolean) : [];
    var rows = DATA.filter(function (r) {
      if (state.domain && r.d !== state.domain) return false;
      if (state.cat && r.c !== state.cat) return false;
      if (!terms.length) return true;
      var hay = (r.q + ' ' + r.c + ' ' + r.s).toLowerCase();
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return false;
      return true;
    });
    if (!terms.length && !state.domain && !state.cat) {
      rows = rows.slice().sort(function (a, b) {
        var ak = POLITICAL_TERMS.test(a.q) ? 0 : 1, bk = POLITICAL_TERMS.test(b.q) ? 0 : 1;
        var ai = POLITICAL_FIRST.indexOf(a.c), bi = POLITICAL_FIRST.indexOf(b.c);
        if (ai === -1) ai = 999;
        if (bi === -1) bi = 999;
        return ak - bk || ai - bi || a.i - b.i;
      });
    }
    return rows;
  }

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function render() {
    var rows = match();
    elCount.innerHTML = rows.length === DATA.length ? '' :
      '<b class="num">' + fmt(rows.length) + '</b> questions match';
    elEmpty.style.display = rows.length ? 'none' : 'block';

    var slice = rows.slice(0, shown);
    var html = slice.map(function (r) {
      var on = picked.indexOf(r.i) !== -1;
      var lbl = (on ? 'Remove from shortlist' : 'Add to shortlist') + ', QID ' + r.i;
      return '<li class="sx-row' + (on ? ' is-on' : '') + '">' +
        '<button class="sx-add" data-qid="' + r.i + '" aria-pressed="' + on + '" ' +
        'aria-label="' + lbl + '" title="' + lbl + '">' +
        (on ? '&#10003;' : '+') + '</button>' +
        '<div class="sx-body">' +
          '<p class="sx-q">' + highlight(r.q, state.q) + '</p>' +
          '<p class="sx-meta"><span class="sx-cat">' + esc(r.c) + '</span>' +
          (r.s ? '<span class="sx-sub">' + esc(r.s) + '</span>' : '') +
          '<span class="sx-qid num">QID ' + r.i + '</span>' +
          '<a class="sx-ask" href="contact.html">Ask one like it &#8594;</a></p>' +
        '</div></li>';
    }).join('');

    if (rows.length > shown) {
      html += '<li class="sx-more"><button id="sx-more" class="btn btn--outline btn--sm">' +
        'Show ' + Math.min(PAGE, rows.length - shown) + ' more' +
        ' <span class="num">(' + fmt(rows.length - shown) + ' remaining)</span></button></li>';
    }
    elResults.innerHTML = html;

    var more = document.getElementById('sx-more');
    if (more) more.addEventListener('click', function () {
      shown += PAGE;
      render();
      /* The button that was just pressed is gone, so hand focus to its
         replacement, or to the last row when the list has run out. Without
         this a keyboard visitor is dropped back to the top of the page. */
      var next = document.getElementById('sx-more');
      if (next) { next.focus(); return; }
      var last = elResults.querySelector('.sx-row:last-child .sx-add');
      if (last) last.focus();
    });
  }

  /* The shortlist panel sits below a very long list on a phone, so the count
     and the two actions that finish the job ride in a bar pinned to the
     viewport once something is picked. Desktop keeps the side panel only. */
  var bar = null, barCount = null;

  function buildBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Shortlist');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:60;display:none;' +
      'box-sizing:border-box;width:100%;max-width:100%;align-items:center;gap:.5rem;' +
      'padding:.6rem .8rem;background:var(--navy);border-top:1px solid var(--rule);';

    barCount = document.createElement('span');
    barCount.style.cssText = 'flex:1 1 auto;min-width:0;font-family:var(--sans);' +
      'font-size:.84rem;line-height:1.25;color:#fff;';

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn--lime btn--sm';
    copy.textContent = 'Copy shortlist';
    copy.style.whiteSpace = 'nowrap';
    copy.addEventListener('click', function () { copyShortlist(copy); });

    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'btn btn--ghost btn--sm';
    clear.textContent = 'Clear';
    clear.addEventListener('click', function () { picked = []; renderBasket(); render(); });

    bar.appendChild(barCount);
    bar.appendChild(copy);
    bar.appendChild(clear);
    document.body.appendChild(bar);
    return bar;
  }

  function syncBar() {
    var want = picked.length > 0 && window.innerWidth < 1000;
    if (!want) {
      if (bar) bar.style.display = 'none';
      document.body.style.paddingBottom = '';
      return;
    }
    buildBar();
    barCount.textContent = picked.length + (picked.length === 1 ? ' question picked' : ' questions picked');
    bar.style.display = 'flex';
    document.body.style.paddingBottom = '4.6rem';
  }

  window.addEventListener('resize', syncBar);

  function copyShortlist(btn) {
    if (!picked.length) return;
    var byId = {};
    DATA.forEach(function (r) { byId[r.i] = r; });
    var txt = 'Segment shortlist, built on kpipolitical.com\n\n' + picked.map(function (id) {
      return 'QID ' + id + '  ' + (byId[id] ? byId[id].q : '');
    }).join('\n');
    var done = function () {
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = 'Copy shortlist'; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) { /* clipboard unavailable */ }
      document.body.removeChild(ta); done();
    }
  }

  function renderBasket() {
    elBasketN.textContent = picked.length;
    syncBar();
    elBasket.setAttribute('data-has', picked.length ? 'true' : 'false');
    /* Copy/Clear and the deal-ID email are inert at zero picked. */
    if (elCopy) elCopy.disabled = !picked.length;
    if (elClear) elClear.disabled = !picked.length;
    var elMail = document.getElementById('sx-email');
    if (elMail) {
      elMail.setAttribute('aria-disabled', picked.length ? 'false' : 'true');
      elMail.style.opacity = picked.length ? '' : '.45';
      elMail.style.pointerEvents = picked.length ? '' : 'none';
    }
    if (!picked.length) {
      elBasketList.innerHTML = '<li class="sx-basket-empty">Nothing picked yet. A working shortlist looks like: economy concern (QID 9918) + party lean (QID 494) &rarr; one audience. Add a question to start yours.</li>';
      return;
    }
    var byId = {};
    DATA.forEach(function (r) { byId[r.i] = r; });
    elBasketList.innerHTML = picked.map(function (id) {
      var r = byId[id];
      if (!r) return '';
      return '<li><button class="sx-drop" data-qid="' + id + '" title="Remove">&times;</button>' +
        '<span class="sx-basket-q">' + esc(r.q) + '</span>' +
        '<span class="sx-qid num">QID ' + id + '</span></li>';
    }).join('');
  }

  /* Update the one row that changed instead of rebuilding the list. A full
     re-render destroys the button the visitor just pressed, which sends
     keyboard focus back to the top of the page on every pick. */
  function syncRow(id) {
    var b = elResults.querySelector('.sx-add[data-qid="' + id + '"]');
    if (!b) return;
    var on = picked.indexOf(id) !== -1;
    var lbl = (on ? 'Remove from shortlist' : 'Add to shortlist') + ', QID ' + id;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', lbl);
    b.setAttribute('title', lbl);
    b.innerHTML = on ? '&#10003;' : '+';
    var row = b.closest('.sx-row');
    if (row) row.classList.toggle('is-on', on);
  }

  function toggle(id) {
    var ix = picked.indexOf(id);
    if (ix === -1) picked.push(id); else picked.splice(ix, 1);
    syncRow(id);
    renderBasket();
  }

  elResults.addEventListener('click', function (e) {
    var b = e.target.closest('.sx-add');
    if (b) toggle(parseInt(b.getAttribute('data-qid'), 10));
  });
  elBasketList.addEventListener('click', function (e) {
    var b = e.target.closest('.sx-drop');
    if (!b) return;
    /* Rebuilding the shortlist removes this button too, so park focus on the
       next remaining one, or on Copy shortlist when the list empties. */
    var drops = [].slice.call(elBasketList.querySelectorAll('.sx-drop'));
    var at = drops.indexOf(b);
    toggle(parseInt(b.getAttribute('data-qid'), 10));
    var after = elBasketList.querySelectorAll('.sx-drop');
    if (after.length) after[Math.min(at, after.length - 1)].focus();
    else elCopy.focus();
  });
  elClear.addEventListener('click', function () { picked = []; renderBasket(); render(); });

  elCopy.addEventListener('click', function () { copyShortlist(elCopy); });

  var t;
  elSearch.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () { state.q = elSearch.value; shown = PAGE; render(); }, 110);
  });

  if (elExamples) {
    elExamples.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ex]');
      if (!b) return;
      elSearch.value = b.getAttribute('data-ex');
      state.q = elSearch.value; shown = PAGE; render();
      elSearch.focus();
    });
  }

  function buildFilters() {
    var doms = {}, cats = {};
    DATA.forEach(function (r) {
      doms[r.d] = (doms[r.d] || 0) + 1;
      cats[r.c] = (cats[r.c] || 0) + 1;
    });
    var dkeys = Object.keys(doms).sort(function (a, b) { return doms[b] - doms[a]; });
    elDomains.innerHTML = '<button class="sx-chip is-on" aria-pressed="true" data-dom="">All domains</button>' +
      dkeys.map(function (d) {
        return '<button class="sx-chip" data-dom="' + esc(d) + '">' + esc(d) +
          ' <span class="num">' + fmt(doms[d]) + '</span></button>';
      }).join('');
    elDomains.addEventListener('click', function (e) {
      var b = e.target.closest('.sx-chip');
      if (!b) return;
      [].forEach.call(elDomains.children, function (c) { c.classList.remove('is-on'); c.setAttribute('aria-pressed', 'false'); });
      b.classList.add('is-on');
      state.domain = b.getAttribute('data-dom');
      state.cat = '';
      fillCats();
      shown = PAGE; render();
    });
    fillCats();

    function fillCats() {
      var pool = state.domain ? DATA.filter(function (r) { return r.d === state.domain; }) : DATA;
      var c2 = {};
      pool.forEach(function (r) { c2[r.c] = (c2[r.c] || 0) + 1; });
      var keys = Object.keys(c2).sort();
      elCats.innerHTML = '<option value="">All categories</option>' +
        keys.map(function (k) {
          return '<option value="' + esc(k) + '">' + esc(k) + ' (' + fmt(c2[k]) + ')</option>';
        }).join('');
    }
    elCats.addEventListener('change', function () {
      state.cat = elCats.value; shown = PAGE; render();
    });
  }

  function boot(rows) {
    DATA = rows;
    buildFilters();
    renderBasket();
    render();
    document.getElementById('sx').setAttribute('data-ready', 'true');
  }

  /* Inline payload first (single-file builds), network fetch second. */
  var inline = document.getElementById('sx-data');
  if (inline && inline.textContent.trim().length > 2) {
    try { boot(JSON.parse(inline.textContent)); return; } catch (err) { /* fall through to fetch */ }
  }
  fetch('assets/data/segments.json')
    .then(function (r) { return r.json(); })
    .then(boot)
    .catch(function () {
      elResults.innerHTML = '<li class="sx-fail">The question library could not load. ' +
        'Email <a href="mailto:info@kpipolitical.com">info@kpipolitical.com</a> and we will send it as a workbook.</li>';
    });
})();
