/* Every price in both currencies.
 *
 * Mark a price with data-usd="300" or data-lkr="7500" and this adds the
 * other currency after it ("≈ LKR 99,000" / "≈ $25"). The rate is today's
 * USD→LKR rate, cached for a day; if it can't be fetched, FALLBACK_RATE.
 * Other scripts can use window.MJL_FX.toLkr / toUsd / format once the
 * "mjl:fx" event has fired (it always fires, with the fallback if need be).
 */
(function () {
  var FALLBACK_RATE = 330; // LKR per USD, used only if the live rate is unavailable
  var CACHE_KEY = 'mjl-usd-lkr';
  var DAY = 24 * 60 * 60 * 1000;

  var style = document.createElement('style');
  style.textContent =
    '.fx{display:inline-block;margin-left:6px;font-size:.82em;opacity:.78;white-space:nowrap;font-weight:400}' +
    '.fx-line{display:block;margin:2px 0 4px;font-size:14px;opacity:.78;font-family:inherit}';
  document.head.appendChild(style);

  function roundLkr(n) { return Math.round(n / 100) * 100; }
  var FX = {
    rate: FALLBACK_RATE,
    live: false,
    toLkr: function (usd) { return roundLkr(usd * FX.rate); },
    toUsd: function (lkr) { return Math.max(1, Math.round(lkr / FX.rate)); },
    lkr: function (n) { return 'LKR ' + Math.round(n).toLocaleString('en-US'); },
    usd: function (n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  };
  window.MJL_FX = FX;

  function render() {
    document.querySelectorAll('[data-usd],[data-lkr]').forEach(function (el) {
      var usd = el.getAttribute('data-usd');
      var text = usd !== null
        ? '≈ ' + FX.lkr(FX.toLkr(parseFloat(usd)))
        : '≈ ' + FX.usd(FX.toUsd(parseFloat(el.getAttribute('data-lkr'))));
      var block = el.tagName === 'DIV';
      var next = el.nextElementSibling;
      var out = next && next.classList.contains(block ? 'fx-line' : 'fx') ? next : null;
      if (!out) {
        out = document.createElement(block ? 'div' : 'span');
        out.className = block ? 'fx-line' : 'fx';
        out.title = 'Approximate, at today\'s exchange rate';
        el.insertAdjacentElement('afterend', out);
      }
      out.textContent = text;
    });
    document.dispatchEvent(new CustomEvent('mjl:fx', { detail: FX }));
  }

  function useRate(rate, live) {
    if (rate > 100 && rate < 2000) { FX.rate = rate; FX.live = live; }
    render();
  }

  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { cached = null; }
  if (cached && cached.rate && Date.now() - cached.at < DAY) {
    useRate(cached.rate, true);
    return;
  }
  render(); // show the fallback right away, then refine
  fetch('https://open.er-api.com/v6/latest/USD')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var rate = d && d.rates && d.rates.LKR;
      if (!rate) return;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ rate: rate, at: Date.now() })); } catch (e) { /* private mode */ }
      useRate(rate, true);
    })
    .catch(function () { /* keep the fallback */ });
})();
