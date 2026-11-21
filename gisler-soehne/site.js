/* J. Gisler Söhne AG: Hero Skizze → Foto, Treppenrechner „Stufe für Stufe“, Übergabe an die Anfrage */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const mm = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // 2 600
  const el = (tag, attr, eltern) => { const e = document.createElementNS(NS, tag); for (const k in attr) if (attr[k] != null) e.setAttribute(k, attr[k]); eltern && eltern.appendChild(e); return e; };

  // ---------- Treppenrechner ----------
  const wahl = { hoehe: 2600, art: 'Wangentreppe', gelaender: 'Chromstahl' };
  const svg = document.querySelector('.schnitt');
  const inhalt = svg && svg.querySelector('.s-inhalt');

  function rechne(H) {
    const n = Math.round(H / 175);          // Steigungen, Richtwert um 175 mm
    const s = H / n;
    const a = Math.round(630 - 2 * s);      // Schrittmassregel 2s + a ≈ 630 mm
    return { n, s, a, lauf: (n - 1) * a };
  }

  function zeichne() {
    if (!inhalt) return;
    const { n, s, a, lauf } = rechne(wahl.hoehe);
    const k = 0.118, x0 = 140, boden = 462, oben = boden - wahl.hoehe * k, xEnd = x0 + lauf * k;
    inhalt.replaceChildren();
    // Boden und Decke geschnitten
    el('rect', { x: 20, y: boden, width: 780, height: 22, class: 's-schraffur' }, inhalt);
    el('rect', { x: xEnd, y: oben, width: 800 - xEnd, height: 24, class: 's-schraffur' }, inhalt);
    // Stufenprofil
    let d = `M${x0} ${boden}`;
    for (let i = 0; i < n; i++) {
      const y = boden - (i + 1) * s * k;
      d += ` V${y.toFixed(1)}`;
      if (i < n - 1) d += ` H${(x0 + (i + 1) * a * k).toFixed(1)}`;
    }
    const profil = d;
    if (wahl.art === 'Wangentreppe') {
      el('path', { d: `${profil} H${xEnd + 2} V${oben + 40} L${x0 + 46} ${boden} Z`, class: 's-holz' }, inhalt);
    } else {
      // Wand im Hintergrund, in die die Stufen eingespannt sind
      el('rect', { x: x0 - 20, y: oben, width: xEnd - x0 + 20, height: boden - oben, class: 's-schraffur', opacity: 0.35 }, inhalt);
      el('text', { x: x0 - 12, y: oben + 22, class: 's-gedaempft' }, inhalt).textContent = 'Wand';
      for (let i = 0; i < n - 1; i++) {
        const y = boden - (i + 1) * s * k, x = x0 + i * a * k;
        el('rect', { x: x - 3, y: y.toFixed(1), width: (a * k + 6).toFixed(1), height: 6, class: 's-holz' }, inhalt);
      }
    }
    el('path', { d: profil, class: 's-linie s-zeichnen', pathLength: 1 }, inhalt);
    // Geländer: 900 mm über der Stufenvorderkante
    const g = 900 * k, ax = x0 + a * k * 0.5, ay = boden - s * k - g, ex = xEnd, ey = oben - g;
    const vorder = (x) => boden - s * k - ((x - x0) / (xEnd - x0)) * (boden - s * k - oben);
    if (wahl.gelaender === 'Glas') {
      el('path', { d: `M${ax} ${vorder(ax) - 8} L${ex} ${oben - 8} L${ex} ${ey + 12} L${ax} ${ay + 12} Z`, class: 's-glas' }, inhalt);
    } else {
      const schritt = wahl.gelaender === 'Holz' ? 3 : 1;
      for (let i = 1; i < n - 1; i += schritt) {
        const x = x0 + i * a * k + a * k * 0.5, yv = boden - (i + 1) * s * k;
        const yh = ay - ((x - ax) / (ex - ax)) * (ay - ey);
        el('line', { x1: x, y1: yv, x2: x, y2: yh, class: wahl.gelaender === 'Holz' ? 's-holz' : 's-duenn', 'stroke-width': wahl.gelaender === 'Holz' ? 5 : wahl.gelaender === 'Chromstahl' ? 2.2 : 1.4, stroke: wahl.gelaender === 'Chromstahl' ? '#7D858C' : null }, inhalt);
      }
    }
    el('path', { d: `M${ax} ${ay} L${ex} ${ey} H790`, fill: 'none', stroke: wahl.gelaender === 'Holz' ? '#C9A06B' : wahl.gelaender === 'Chromstahl' ? '#7D858C' : '#2B2624', 'stroke-width': wahl.gelaender === 'Holz' ? 7 : 4, 'stroke-linecap': 'round' }, inhalt);
    el('text', { x: 792, y: ey - 10, 'text-anchor': 'end', class: 's-gedaempft' }, inhalt).textContent = `Geländer ${wahl.gelaender}`;
    // Massketten (Hausorange)
    const mk = el('g', { class: 's-masse' }, inhalt);
    el('path', { d: `M72 ${boden} V${oben} M66 ${boden} H78 M66 ${oben} H78`, class: 's-mass' }, mk);
    for (let i = 1; i < n; i++) { const y = boden - i * s * k; el('path', { d: `M102 ${y.toFixed(1)} H112`, class: 's-mass' }, mk); }
    el('path', { d: `M107 ${boden} V${oben} M101 ${boden} H113 M101 ${oben} H113`, class: 's-mass' }, mk);
    const t1 = el('text', { x: 58, y: (boden + oben) / 2, 'text-anchor': 'middle', transform: `rotate(-90 58 ${(boden + oben) / 2})` }, mk); t1.textContent = `${mm(wahl.hoehe)}`;
    const t2 = el('text', { x: 124, y: oben - 12, class: 's-gedaempft' }, mk); t2.textContent = `${n} × ${s.toFixed(1)}`;
    el('path', { d: `M${x0} 510 H${xEnd} M${x0} 504 V516 M${xEnd} 504 V516`, class: 's-mass' }, mk);
    for (let i = 1; i < n - 1; i++) { const x = x0 + i * a * k; el('path', { d: `M${x.toFixed(1)} 506 V514`, class: 's-mass' }, mk); }
    const t3 = el('text', { x: (x0 + xEnd) / 2, y: 532, 'text-anchor': 'middle' }, mk); t3.textContent = `${n - 1} × ${a} = ${mm(lauf)}`;
    const t4 = el('text', { x: 792, y: oben - 40 - g, 'text-anchor': 'end', class: 's-gedaempft' }, mk); t4.textContent = wahl.art === 'Wangentreppe' ? 'Wangentreppe' : 'freitragend';
    // Werte
    const setze = (id, txt) => { const e = document.querySelector(`[data-aus="${id}"]`); if (e) e.textContent = txt; };
    setze('n', n); setze('s', `${Math.round(s)} mm`); setze('a', `${a} mm`); setze('l', `${(lauf / 1000).toFixed(2)} m`);
    svg.setAttribute('aria-label', `Treppenschnitt: Geschosshöhe ${wahl.hoehe} mm, ${n} Steigungen à ${Math.round(s)} mm, Auftritt ${a} mm, ${wahl.art}, Geländer ${wahl.gelaender}`);
    if (window.Localuri && window.Localuri.bewegung && window.gsap) {
      gsap.fromTo(inhalt.querySelector('.s-zeichnen'), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, ease: 'expo.out' });
      gsap.fromTo(mk, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, delay: 0.25, ease: 'power3.out' });
    }
  }

  if (svg) {
    const defs = el('defs', {}, svg); svg.insertBefore(defs, svg.firstChild);
    const p = el('pattern', { id: 'schraffur', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 7, height: 7, fill: '#ECE8E1' }, p);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: '#58504D', 'stroke-width': 1 }, p);

    document.querySelectorAll('[data-wahl]').forEach((gruppe) => {
      const knoepfe = [...gruppe.querySelectorAll('button')];
      const feld = gruppe.dataset.wahl;
      const setzen = (b, fokus) => {
        knoepfe.forEach((x) => { const an = x === b; x.setAttribute('aria-checked', String(an)); x.tabIndex = an ? 0 : -1; });
        wahl[feld] = feld === 'hoehe' ? +b.dataset.wert : b.dataset.wert;
        if (fokus) b.focus();
        zeichne();
      };
      knoepfe.forEach((b) => {
        const an = String(wahl[feld]) === b.dataset.wert;
        b.setAttribute('aria-checked', String(an)); b.tabIndex = an ? 0 : -1;
        b.addEventListener('click', () => setzen(b, false));
      });
      gruppe.addEventListener('keydown', (e) => {
        const i = knoepfe.indexOf(document.activeElement); if (i < 0) return;
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        e.preventDefault(); setzen(knoepfe[(i + d + knoepfe.length) % knoepfe.length], true);
      });
    });
    zeichne();

    // Werte in die Anfrage übernehmen
    const knopf = document.querySelector('[data-uebernehmen]');
    knopf && knopf.addEventListener('click', () => {
      const { n, s, a } = rechne(wahl.hoehe);
      const bem = document.querySelector('#anfrage textarea[name="bemerkung"]');
      if (bem) bem.value = `Treppe: Geschosshöhe ${mm(wahl.hoehe)} mm, ${n} Steigungen à ${Math.round(s)} mm, Auftritt ${a} mm, ${wahl.art}, Geländer ${wahl.gelaender} (Richtwert von der Website).`;
      const chip = [...document.querySelectorAll('#anfrage .anf-chip')].find((c) => c.textContent === 'Treppe');
      if (chip && chip.getAttribute('aria-checked') !== 'true') chip.click();
    });
  }

  // ---------- Bewegung ----------
  window.Localuri && window.Localuri.bereit(({ gsap, ScrollTrigger, bewegung }) => {
    if (!bewegung) return;
    const buehne = document.querySelector('.plan-buehne');
    if (buehne) {
      const tl = gsap.timeline();
      tl.fromTo('.plan-rahmen', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'expo.out' }, 0)
        .fromTo('.plan-stufen', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.0, ease: 'expo.out' }, 0.1)
        .fromTo(buehne, { '--intro': 0 }, { '--intro': 1, duration: 1.1, ease: 'expo.out' }, 0.2)
        .from('.mass', { autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.5);
      gsap.to(buehne, { '--scroll': 1, ease: 'none', scrollTrigger: { trigger: buehne, start: 'top 15%', end: 'bottom 35%', scrub: true } });
    }
    // Bild-Masken von links (harte Maske, 0.7 s)
    gsap.utils.toArray('.maske picture').forEach((p) => {
      gsap.fromTo(p, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 85%', once: true } });
    });
    // Rechner: Schnitt zeichnet sich beim ersten Erscheinen
    const sz = document.querySelector('.s-zeichnen');
    if (sz) gsap.fromTo('.schnitt .s-inhalt', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.schnitt', start: 'top 80%', once: true }, onStart: zeichne });
  });
})();
