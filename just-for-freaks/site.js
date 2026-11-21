/* Nord Süd: Umrüsten Velo ↔ Ski & Board (Hauptbewegung) und Werkstatt-Auftragszettel. */
Localuri.bereit(({ gsap, ScrollTrigger, bewegung }) => {
  const html = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const bild = (z) => document.querySelector(`.hero-bild .bild-${z}`);
  const farben = { velo: '#FFCC01', winter: '#273333' };

  function knoepfe() {
    document.querySelectorAll('[data-wahl]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wahl === html.dataset.zustand)));
    meta.content = farben[html.dataset.zustand];
  }

  function umruesten(z) {
    const alt = html.dataset.zustand;
    if (z === alt) return;
    html.dataset.zustand = z;
    try { localStorage.setItem('nordsued-zustand', z); } catch (e) { /* privates Fenster: Wahl gilt nur jetzt */ }
    knoepfe();
    ScrollTrigger.refresh();
    if (!bewegung) return;
    gsap.to('.umruest svg', { rotation: '+=180', duration: 0.7, ease: 'expo.out' });
    const neu = bild(z), weg = bild(alt);
    gsap.set(weg, { visibility: 'visible', zIndex: 0 });
    gsap.set(neu, { zIndex: 1 });
    gsap.fromTo(neu, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.out',
      onComplete: () => gsap.set([neu, weg], { clearProps: 'all' }) });
    gsap.fromTo(neu.querySelector('img'), { scale: 1.08 }, { scale: 1, duration: 1.1, ease: 'expo.out', clearProps: 'transform' });
    // Was im Laden steht, rüstet sichtbar mit um
    const sichtbar = [...document.querySelectorAll(`.hero .nur-${z === 'velo' ? 'velo' : 'winter'}, .hero-bild figcaption .nur-${z}`)];
    gsap.fromTo(sichtbar, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
    const laden = document.querySelector('#laden');
    const r = laden.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) {
      gsap.fromTo(laden.querySelectorAll(`.nur-${z}`), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'all' });
    }
  }

  document.querySelectorAll('[data-wahl]').forEach((b) => b.addEventListener('click', () => umruesten(b.dataset.wahl)));
  document.querySelector('.umruest').addEventListener('click', () => umruesten(html.dataset.zustand === 'velo' ? 'winter' : 'velo'));
  knoepfe();

  // Kopf bekommt nach dem Hero eine Linie
  const kopf = document.querySelector('.kopf');
  ScrollTrigger.create({ start: 40, onUpdate: (s) => kopf.classList.toggle('gescrollt', s.scroll() > 40) });

  // ---------- Auftragszettel: angetippte Arbeiten füllen den Zettel und die E-Mail ----------
  const anfrage = document.querySelector('[data-anfrage]');
  const summe = document.querySelector('#zettel-summe');
  const posten = [...document.querySelectorAll('.zettel-liste button')];
  const chf = (n) => `CHF\u00a0${n}.–`;
  function rechne() {
    const an = posten.filter((b) => b.getAttribute('aria-pressed') === 'true');
    if (!an.length) {
      summe.textContent = 'noch nichts gewählt'; summe.classList.add('leer');
      anfrage.dataset.einleitung = 'Ich möchte einen Werkstatt-Termin anfragen.';
      return;
    }
    const total = an.reduce((s, b) => s + +b.dataset.preis, 0);
    const ab = an.some((b) => b.dataset.ab === '1');
    summe.textContent = `${ab ? 'ab ' : ''}${chf(total)}`; summe.classList.remove('leer');
    anfrage.dataset.einleitung = 'Ich möchte einen Werkstatt-Termin anfragen für:\r\n'
      + an.map((b) => `- ${b.dataset.name} (${b.dataset.ab === '1' ? 'ab ' : ''}CHF ${b.dataset.preis}.–)`).join('\r\n')
      + `\r\nTotal laut Preisliste: ${ab ? 'ab ' : ''}CHF ${total}.–`;
    if (bewegung) gsap.fromTo(summe, { y: -6, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
  }
  posten.forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    rechne();
  }));
  rechne();

  if (!bewegung) return;
  // Einstieg (≤ 1.2 s): die Wörter steigen aus einer Kante, das Ladenfoto fährt hoch wie beim Umrüsten
  gsap.fromTo('.schalter-titel .wort', { yPercent: 100, clipPath: 'inset(-10% -5% 100% -5%)' }, { yPercent: 0, clipPath: 'inset(-10% -5% 0% -5%)', duration: 0.95, stagger: 0.09, ease: 'expo.out', clearProps: 'all' });
  gsap.fromTo('.hero-bild-rahmen', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, delay: 0.1, ease: 'expo.out', clearProps: 'clipPath' });
  gsap.fromTo(`.hero-bild .bild-${html.dataset.zustand} img`, { scale: 1.12 }, { scale: 1, duration: 1.1, delay: 0.1, ease: 'expo.out', clearProps: 'transform' });
  gsap.from('.umruest, .hero-text > *', { y: 14, opacity: 0, duration: 0.7, stagger: 0.05, delay: 0.2, ease: 'power3.out', clearProps: 'all' });

  // Ruhige Reveals für die Abschnitte
  gsap.utils.toArray('.abschnitt-kopf, .fenster > *, .fenster-winter, .kleider, .werkstatt-kopf, .werkstatt-bild, .zettel, .termin-form, .miete-raster > *, .team-raster > *, .besuch-raster > *').forEach((el) => {
    gsap.from(el, { y: 28, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.from('.leute li', { y: 16, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.leute', start: 'top 85%', once: true } });
});
