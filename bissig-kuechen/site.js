/* Bissig AG Küchen und Möbel: Bühnen "Von der Nische zur Küche", Merkliste, Kopf, Masken. */
(() => {
  'use strict';

  /* ---------- Merkliste: gemerkte Küchen gehen in die Anfrage ---------- */
  const gemerkt = new Map(); // Name -> Musterfarbe
  const zahlen = document.querySelectorAll('[data-merk-zahl]');
  const auswahl = document.querySelector('[data-auswahl]');
  const auswahlListe = document.querySelector('[data-auswahl-liste]');

  function merkAnzeigen() {
    zahlen.forEach((z) => { z.hidden = gemerkt.size === 0; z.textContent = String(gemerkt.size); });
    auswahl.hidden = gemerkt.size === 0;
    auswahlListe.replaceChildren(...[...gemerkt].map(([name, farbe]) => {
      const li = document.createElement('li');
      const punkt = document.createElement('i'); punkt.style.setProperty('--muster', farbe); punkt.setAttribute('aria-hidden', 'true');
      li.append(punkt, `Küche ${name}`);
      return li;
    }));
  }

  document.querySelectorAll('.merken').forEach((knopf) => {
    const buehne = knopf.closest('[data-buehne]');
    const name = buehne.dataset.name;
    knopf.addEventListener('click', () => {
      const an = knopf.getAttribute('aria-pressed') !== 'true';
      knopf.setAttribute('aria-pressed', String(an));
      knopf.textContent = an ? 'Gemerkt' : 'Diese Küche merken';
      if (an) gemerkt.set(name, knopf.style.getPropertyValue('--muster')); else gemerkt.delete(name);
      merkAnzeigen();
    });
  });

  // Anfrage-Widget: Auswahl als erste Zeile in die vorbereitete E-Mail
  document.addEventListener('anfrage:mail', (e) => {
    if (!gemerkt.size) return;
    e.preventDefault();
    const zeile = `Gemerkte Küchen von der Website: ${[...gemerkt.keys()].join(', ')}\r\n\r\n`;
    window.location.href = e.detail.url.replace('&body=', `&body=${encodeURIComponent(zeile)}`);
  });

  // "Steamerdemo anfragen" wählt im Widget den passenden Anlass vor
  document.querySelectorAll('[data-anlass]').forEach((a) => a.addEventListener('click', () => {
    const wert = a.dataset.anlass;
    document.querySelectorAll('[data-anfrage] [role="radiogroup"]').forEach((g) => {
      if (typeof g.setzen === 'function' && [...g.children].some((c) => c.textContent === wert)) g.setzen(wert);
    });
  }));

  /* ---------- Bühnen: Fokus fürs Handy (Nische bleibt im Bild) ---------- */
  const buehnen = [...document.querySelectorAll('[data-buehne]')];
  buehnen.forEach((b) => {
    const img = b.querySelector('img');
    img.style.objectPosition = `${parseFloat(b.dataset.fokus) * 100}% 50%`;
    // Farbfeld in der Küchenfarbe + Name: steht hinter dem Foto, sichtbar nur, solange erst die Nische offen ist
    const rahmen = b.querySelector('.buehne-bild');
    rahmen.style.backgroundColor = b.querySelector('.merken').style.getPropertyValue('--muster');
    const name = document.createElement('span');
    name.className = 'buehne-name'; name.setAttribute('aria-hidden', 'true'); name.textContent = b.querySelector('h3').textContent;
    rahmen.prepend(name);
  });

  window.Localuri.bereit(({ gsap, ScrollTrigger, lenis, bewegung }) => {
    /* Kopf weicht beim Runterscrollen, kommt beim Hochscrollen zurück */
    const kopf = document.querySelector('.kopf');
    let letzte = 0;
    const kopfPruefen = (y) => { kopf.classList.toggle('weg', y > 500 && y > letzte); letzte = y; };
    if (lenis) lenis.on('scroll', ({ scroll }) => kopfPruefen(scroll));
    else addEventListener('scroll', () => kopfPruefen(scrollY), { passive: true });

    if (!bewegung) return;

    /* Hero: Titel kommt über data-split="sofort", Rest per Zeitleiste (≤ 1.2 s) */
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.hero-neben', { opacity: 0, y: 24, duration: 1 }, 0.25)
      .from('.hero-bild', { clipPath: 'inset(18% 0 0 0)', duration: 1.1 }, 0.1)
      .from('.hero-bild .schild', { opacity: 0, duration: 0.6 }, 0.7);
    /* Hero-Foto zieht beim Scrollen ruhig auf (scroll-gekoppelt, linear) */
    gsap.fromTo('.hero-bild img', { scale: 1.08 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.hero-bild', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* Bilder öffnen mit harter Maske von links */
    gsap.utils.toArray('[data-maske]').forEach((f) => {
      // Die Maske verdeckt das Bild ganz, darum lädt es der Browser nicht von selbst: zwei Bildschirme vorher anstossen
      ScrollTrigger.create({ trigger: f, start: 'top 300%', once: true, onEnter: () => f.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; }) });
      gsap.fromTo(f, { clipPath: 'inset(0 100% 0 0)' }, {
        clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: f, start: 'top 85%', once: true },
      });
    });

    /* Signatur: jede Küche öffnet sich aus ihrer echten Nische (Bildkoordinaten → Bühnenkoordinaten) */
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      buehnen.forEach((b) => {
        const rahmen = b.querySelector('.buehne-bild');
        const img = b.querySelector('img');
        const schild = b.querySelector('.schild');
        const [nx0, ny0, nx1, ny1] = b.dataset.nische.split(',').map(Number);
        const fokus = parseFloat(b.dataset.fokus);
        let ziel = [0, 0, 0, 0];

        const messen = () => {
          const W = rahmen.clientWidth, H = rahmen.clientHeight;
          const iw = img.naturalWidth || 1920, ih = img.naturalHeight || 1280;
          const s = Math.max(W / iw, H / ih);
          const ox = (W - iw * s) * fokus, oy = (H - ih * s) * 0.5; // object-fit: cover mit object-position
          const l = Math.max(0, ox + nx0 * iw * s), r = Math.min(W, ox + nx1 * iw * s);
          const t = Math.max(0, oy + ny0 * ih * s), u = Math.min(H, oy + ny1 * ih * s);
          ziel = [t, W - r, H - u, l]; // inset: oben rechts unten links
        };
        const setzen = (p) => {
          const k = 1 - p;
          img.style.clipPath = `inset(${ziel[0] * k}px ${ziel[1] * k}px ${ziel[2] * k}px ${ziel[3] * k}px)`;
        };

        messen();
        img.addEventListener('load', () => { messen(); ScrollTrigger.refresh(); }, { once: true });
        const offen = { p: 0 };
        setzen(0);
        gsap.set(schild, { opacity: 0, y: 16 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: b, start: 'top top', end: 'bottom bottom', scrub: true,
            onRefresh: () => { messen(); setzen(offen.p); },
          },
        });
        tl.to({}, { duration: 0.15 }) // erst die Nische allein
          .to(offen, { p: 1, duration: 0.6, ease: 'none', onUpdate: () => setzen(offen.p) })
          .to(schild, { opacity: 1, y: 0, duration: 0.12, ease: 'none' }, '-=0.12')
          .to({}, { duration: 0.25 }); // ganze Küche stehen lassen
      });
      return () => buehnen.forEach((b) => { b.querySelector('img').style.clipPath = ''; });
    });
  });
})();
