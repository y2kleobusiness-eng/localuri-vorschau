/* Bissig Immobilien: ruhig und gross. Signatur „Von Flüelen bis Altdorf“: Karte steht, Orte leuchten mit jedem Projekt auf. */
Localuri.bereit(({ gsap, ScrollTrigger, bewegung }) => {
  const svg = document.querySelector('.karte-svg');
  const jahr = document.querySelector('.karte-jahr b');
  const zeile = document.querySelector('.karte-jahr span');
  const marken = [...document.querySelectorAll('.mk[data-stops]')];
  const handy = matchMedia('(max-width: 760px)');
  // Ausschnitte fürs Handy (Kartenraster 1000 × 1500): die Karte fährt zum Ort des Projekts
  const ausschnitt = { 0: '0 0 1000 1500', 1: '0 20 760 528', 2: '0 160 940 652', 3: '100 780 830 576' };

  function zeige(stop, station) {
    marken.forEach((m) => m.classList.toggle('aktiv', m.dataset.stops.split(' ').includes(String(stop))));
    if (station) { jahr.textContent = station.dataset.jahr; zeile.textContent = station.dataset.zeile; }
    const vb = handy.matches ? ausschnitt[stop] : ausschnitt[0];
    if (bewegung && gsap) gsap.to(svg, { attr: { viewBox: vb }, duration: 1.4, ease: 'expo.out', overwrite: true });
    else svg.setAttribute('viewBox', vb);
  }

  const stationen = [...document.querySelectorAll('.station')];
  if (ScrollTrigger) {
    stationen.forEach((st, i) => {
      ScrollTrigger.create({
        trigger: st, start: 'top 55%', end: 'bottom 55%',
        onToggle: (s) => { if (s.isActive) zeige(+st.dataset.stop, st); else if (i === 0 && s.direction < 0) zeige(1, st); },
      });
    });
  }
  zeige(1, stationen[0]);
  handy.addEventListener('change', () => zeige(+(document.querySelector('.mk.aktiv')?.dataset.stops.split(' ').pop() || 1)));

  // „Flächen anfragen“ wählt im Gespräch gleich den passenden Anlass
  document.querySelectorAll('[data-anlass]').forEach((a) => a.addEventListener('click', () => {
    const chip = [...document.querySelectorAll('.anf-chip')].find((c) => c.textContent.trim() === a.dataset.anlass);
    if (chip && chip.getAttribute('aria-checked') !== 'true') chip.click();
  }));

  if (!bewegung) return;

  // Hero: Bild deckt sich von rechts auf und setzt sich (1.12 → 1.07), danach Text
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .fromTo('.hero-rahmen', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1.6, delay: 0.15 })
    .fromTo('.hero-rahmen img', { scale: 1.16 }, { scale: 1.07, duration: 2.2 }, '<') // 1.07 bleibt: Reserve für den Scroll-Versatz
    .from('.hero-bild figcaption', { autoAlpha: 0, y: 10, duration: 0.9 }, '-=1.1')
    .from('.kopf', { autoAlpha: 0, duration: 1 }, 0.4)
    .from('.hero-lead, .hero-knoepfe', { autoAlpha: 0, y: 24, duration: 1.1, ease: 'power3.out', stagger: 0.1 }, 0.55);
  gsap.to('.hero-rahmen img', { yPercent: 3, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // Projektbilder gleiten leicht im Rahmen (Skalierung 1.12 ≥ 1 + 2 × 5 %)
  gsap.utils.toArray('.st-rahmen img').forEach((img) => {
    gsap.fromTo(img, { scale: 1.12, yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.closest('.st-rahmen'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.utils.toArray('.st-klein').forEach((f) => {
    gsap.from(f, { autoAlpha: 0, y: 50, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: f, start: 'top 90%', once: true } });
  });

  // Finale: der Businesspark wächst Geschoss für Geschoss aus dem Boden, an den Scroll gekoppelt
  gsap.from('.geschosse .g', {
    scaleY: 0, ease: 'none', stagger: 0.25,
    scrollTrigger: { trigger: '.geschosse', start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  gsap.from('.geschosse .g-t', { autoAlpha: 0, stagger: 0.25, ease: 'none', scrollTrigger: { trigger: '.geschosse', start: 'top 80%', end: 'bottom 50%', scrub: true } });
});
