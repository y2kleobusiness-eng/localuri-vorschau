/* Localuri Basis: Lenis + GSAP/ScrollTrigger im selben Takt, SplitText, Reveals, Lazyload, Favicon, Entwurf-Hinweis.
   Braucht vorher: vendor/lenis.min.js, gsap.min.js, ScrollTrigger.min.js, SplitText.min.js, Flip.min.js (GSAP 3.15.1, Lenis 1.3.27)
   Daten am <html>: data-betrieb="Name des Betriebs" (für Hinweis + Favicon), optional data-initialen="GA".
   Seiten-Code in site.js: window.Localuri.bereit(({ gsap, ScrollTrigger, lenis, bewegung }) => { ... }) */
(() => {
  'use strict';
  const html = document.documentElement;
  html.classList.remove('no-js');
  html.classList.add('js');

  // Fehler sammeln: pruefen.mjs / bildschirmfotos.mjs lesen window.__f
  window.__f = window.__f || [];
  addEventListener('error', (e) => window.__f.push((e.message || 'Ladefehler') + (e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : '')));
  addEventListener('unhandledrejection', (e) => window.__f.push('Promise: ' + (e.reason && e.reason.message || e.reason)));

  const betrieb = html.dataset.betrieb || document.title;

  // ---------- Favicon aus Initialen (nur wenn keine eigene Datei gesetzt ist) ----------
  if (!document.querySelector('link[rel="icon"]')) {
    const ini = (html.dataset.initialen || betrieb.split(/\s+/).filter((w) => /^[A-ZÄÖÜ]/.test(w)).map((w) => w[0]).join('').slice(0, 2) || 'L').toUpperCase();
    const css = getComputedStyle(html);
    const bg = (css.getPropertyValue('--fg') || '#1b1a17').trim();
    const fg = (css.getPropertyValue('--bg') || '#f4f1ea').trim();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="33" dominant-baseline="central" text-anchor="middle" font-family="Georgia,serif" font-size="${ini.length > 1 ? 28 : 36}" fill="${fg}">${ini}</text></svg>`;
    const l = document.createElement('link');
    l.rel = 'icon'; l.type = 'image/svg+xml'; l.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    document.head.appendChild(l);
  }

  // ---------- Entwurf-Hinweis (Pflicht, wird ergänzt, falls er im HTML fehlt) ----------
  if (!document.querySelector('.entwurf-hinweis')) {
    const h = document.createElement('div');
    h.className = 'entwurf-hinweis';
    h.setAttribute('role', 'note');
    h.textContent = `Entwurf von Localuri für ${betrieb} – nicht öffentlich`;
    document.body.appendChild(h);
  }

  // ---------- Bilder: Platzhalterfarbe + Einblenden nach dem Laden ----------
  const bildFertig = (img) => img.classList.add('geladen');
  document.querySelectorAll('img[data-lazy]').forEach((img) => {
    if (img.complete && img.naturalWidth) bildFertig(img);
    else { img.addEventListener('load', () => bildFertig(img), { once: true }); img.addEventListener('error', () => bildFertig(img), { once: true }); }
  });

  // ---------- Bewegung ----------
  const bewegung = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { gsap, ScrollTrigger, SplitText, Flip } = window;
  let lenis = null;
  const wartende = [];
  const ctx = { gsap, ScrollTrigger, SplitText, Flip, lenis: null, bewegung };

  function start() {
    if (!gsap || !ScrollTrigger) { window.__f.push('GSAP/ScrollTrigger fehlt'); zeigeAlles(); return; }
    gsap.registerPlugin(ScrollTrigger, ...[SplitText, Flip].filter(Boolean));

    if (bewegung && window.Lenis) {
      lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true }); // Takt gehört GSAP
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    ctx.lenis = lenis;

    // Anker weich anfahren (Lenis), sonst nativ
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      const ziel = document.querySelector(a.getAttribute('href'));
      if (!ziel) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(ziel, { duration: 1.4, offset: -(parseFloat(a.dataset.versatz) || 0) });
      else ziel.scrollIntoView({ behavior: bewegung ? 'smooth' : 'auto' });
      history.replaceState(null, '', a.getAttribute('href'));
    });

    // SplitText: [data-split] = Zeilen gleiten aus einer Maske, beim Erscheinen (oder sofort mit data-split="sofort")
    const splits = () => document.querySelectorAll('[data-split]').forEach((el) => {
      if (!SplitText || !bewegung) { el.classList.add('gesplittet'); return; }
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'zeile', autoSplit: true,
        onSplit(self) {
          el.classList.add('gesplittet');
          self.masks.forEach((m) => m.classList.add('zeile-maske'));
          return gsap.from(self.lines, {
            yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08,
            delay: parseFloat(el.dataset.verzoegerung) || 0,
            scrollTrigger: el.dataset.split === 'sofort' ? undefined : { trigger: el, start: 'top 88%', once: true },
          });
        },
      });
    });
    // Erst nach dem Laden der Schriften splitten, sonst stimmen die Zeilen nicht
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(splits);

    // Reveals: [data-reveal] blendet weich ein (data-reveal="hoch" | "" ), Kinder mit data-reveal-kinder gestaffelt
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (!bewegung) { el.classList.add('sichtbar'); return; }
      const ziele = el.hasAttribute('data-reveal-kinder') ? el.children : el;
      gsap.fromTo(ziele, { autoAlpha: 0, y: el.dataset.reveal === 'still' ? 0 : 28 }, {
        autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: () => el.classList.add('sichtbar'),
      });
    });

    // Nach Bild-Ladungen Positionen neu messen
    addEventListener('load', () => ScrollTrigger.refresh());

    wartende.splice(0).forEach((fn) => fn(ctx));
    window.Localuri.gestartet = true;
  }

  function zeigeAlles() {
    document.querySelectorAll('[data-split],[data-reveal]').forEach((el) => el.classList.add('gesplittet', 'sichtbar'));
  }

  window.Localuri = {
    bewegung,
    get lenis() { return lenis; },
    bereit(fn) { window.Localuri.gestartet ? fn(ctx) : wartende.push(fn); },
    // Lenis kurz anhalten (z. B. offenes Dialogfenster)
    halt(an) { if (lenis) an ? lenis.stop() : lenis.start(); },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
