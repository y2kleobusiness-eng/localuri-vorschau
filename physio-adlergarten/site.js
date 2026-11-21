/* Sportphysio Adlergarten: Kopf, Hero-Auftakt, Gang durch die Praxis. */
(() => {
  // Kopf bekommt Grund, sobald die Seite läuft
  const kopf = document.querySelector('.kopf');
  const setze = () => kopf.classList.toggle('gescrollt', window.scrollY > 24);
  setze(); window.addEventListener('scroll', setze, { passive: true });

  // Fortschritt des Gangs (Zahl + goldene Linie), gilt für Pin und Wischen
  const gang = document.querySelector('.gang');
  const fenster = gang.querySelector('.gang-fenster');
  const zahl = gang.querySelector('.gang-zahl b');
  const fuell = gang.querySelector('.gang-fuell');
  const n = gang.querySelectorAll('.station').length - 1;
  window.__gangFortschritt = (p) => {
    p = Math.min(1, Math.max(0, p));
    fuell.style.transform = `scaleX(${p})`;
    zahl.textContent = String(Math.round(p * n)).padStart(2, '0');
  };
  // Waagrechte Spur: Bilder laden, sobald der Gang naht (lazy greift seitlich erst beim Wischen)
  new IntersectionObserver((e, io) => {
    if (!e[0].isIntersecting) return;
    gang.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
    io.disconnect();
  }, { rootMargin: '800px 0px' }).observe(gang);
  // Nach dem ersten Bild still den Rest nachladen (erste Ansicht bleibt leicht)
  window.addEventListener('load', () => setTimeout(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }), 400));
  fenster.addEventListener('scroll', () => {
    const max = fenster.scrollWidth - fenster.clientWidth;
    if (max > 0 && !gang.classList.contains('gepinnt')) window.__gangFortschritt(fenster.scrollLeft / max);
  }, { passive: true });
})();

Localuri.bereit(({ gsap, ScrollTrigger, bewegung }) => {
  if (!bewegung) return;

  // Hero: Bild setzt sich, die Tafel fährt aus der Unterkante hoch, die Goldlinie zieht, Text folgt (≤ 1.2 s)
  gsap.from('.hero-bild img', { scale: 1.06, duration: 1.2, ease: 'expo.out' });
  const breit = window.matchMedia('(min-width: 761px)').matches;
  gsap.from('.tafel', breit ? { yPercent: 100, duration: 0.9, ease: 'expo.out' } : { yPercent: 12, autoAlpha: 0, duration: 1.1, ease: 'expo.out', delay: 0.1 });
  gsap.fromTo('.tafel', { '--linie-x': 0 }, { '--linie-x': 1, duration: 0.8, delay: 0.3, ease: 'expo.out' });
  gsap.from('.tafel-text, .tafel .knoepfe', { y: 14, autoAlpha: 0, duration: 0.7, delay: 0.3, stagger: 0.06, ease: 'expo.out' });

  // Signatur: Desktop pinnt die Szene, die Spur fährt waagrecht durch die Praxis
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (min-height: 600px)', () => {
    const gang = document.querySelector('.gang');
    const spur = gang.querySelector('.gang-spur');
    const fenster = gang.querySelector('.gang-fenster');
    gang.classList.add('gepinnt');
    const weg = () => Math.max(0, spur.scrollWidth - fenster.clientWidth);
    const tw = gsap.to(spur, {
      x: () => -weg(),
      ease: 'none',
      scrollTrigger: {
        trigger: gang, start: 'top top', end: () => '+=' + weg(), pin: true, scrub: true, invalidateOnRefresh: true,
        onUpdate: (st) => window.__gangFortschritt(st.progress),
      },
    });
    ScrollTrigger.refresh();
    return () => { gang.classList.remove('gepinnt'); tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(spur, { clearProps: 'x' }); };
  });
});
