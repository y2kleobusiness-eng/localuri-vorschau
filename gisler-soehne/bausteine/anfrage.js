/* Anfrage-/Reservations-Widget ohne native Auswahlfelder. Erzeugt eine vorbereitete E-Mail (mailto:).
   Einbau:
   <div data-anfrage
        data-email="info@betrieb.ch"            Pflicht
        data-betreff="Reservationsanfrage"       Betreff (Datum wird angehängt)
        data-zeiten="11:30,12:00,18:00,19:00"   leer = kein Zeit-Schritt
        data-anlaesse="Essen,Geburtstag,Firmenanlass"  leer = kein Anlass-Schritt
        data-titel-anlass="Anlass"  data-titel-zeit="Zeit"  data-titel-datum="Datum"  data-titel-personen="Personen"
        data-personen-max="40"  data-personen-start="2"  data-personen-schnell="2,4,6,10"   max 0 = ohne Personen
        data-ruhetage="1,2"                      0 = So … 6 = Sa, geschlossen
        data-geschlossen="2026-12-24,2026-12-25" einzelne Tage
        data-tage-voraus="120"
        data-datum="0"                           ohne Kalender (z. B. Rückruf, Immobilien-Gespräch)
        data-telefon="1"                         Pflichtfeld Telefon (Rückrufnummer)
        data-knopf="E-Mail vorbereiten"></div>
   Zeiten dürfen auch Wörter sein („Vormittag,Nachmittag“): „Uhr“ kommt nur hinter echte Uhrzeiten.
   Tastatur Kalender (WAI-ARIA Date Picker Grid): Pfeile, Home/End, Bild↑/↓ (Monat), Shift+Bild↑/↓ (Jahr), Enter/Leertaste. */
(() => {
  'use strict';
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const TAGE_K = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const TAGE_L = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const liste = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tag0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // „heute“ immer nach Schweizer Zeit, auch wenn der Besucher im Ausland ist
  const heuteCH = () => { const [y, m, t] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number); return new Date(y, m - 1, t); };
  const plusTage = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const plusMonate = (d, n) => { const z = new Date(d.getFullYear(), d.getMonth() + n, 1); const max = new Date(z.getFullYear(), z.getMonth() + 1, 0).getDate(); return new Date(z.getFullYear(), z.getMonth(), Math.min(d.getDate(), max)); };
  const zeile = (titel, wert) => `${titel}${/[?:]$/.test(titel) ? '' : ':'} ${wert}`; // „Worum geht es? Vermieten“ statt „?:“
  const uhr = (z) => (/^\d{1,2}[:.]\d{2}$/.test(z) ? `${z} Uhr` : z);
  const lang = (d) => `${TAGE_L[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`;
  let zaehler = 0;

  function chips(name, werte, aufWahl) {
    // Radiogruppe nach WAI-ARIA: ein Tab-Stopp, Pfeile wechseln und wählen
    const g = document.createElement('div');
    g.className = 'anf-chips'; g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-labelledby', name);
    const knoepfe = werte.map((w, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'anf-chip'; b.textContent = w;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener('click', () => waehle(i, true));
      g.appendChild(b); return b;
    });
    function waehle(i, fokus) {
      knoepfe.forEach((b, j) => { b.setAttribute('aria-checked', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
      if (fokus) knoepfe[i].focus();
      aufWahl(werte[i]);
    }
    g.addEventListener('keydown', (e) => {
      const i = knoepfe.indexOf(document.activeElement); if (i < 0) return;
      const n = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (n) { e.preventDefault(); waehle((i + n + knoepfe.length) % knoepfe.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); waehle(0, true); }
      else if (e.key === 'End') { e.preventDefault(); waehle(knoepfe.length - 1, true); }
    });
    g.setzen = (w) => { const i = werte.indexOf(w); if (i >= 0) waehle(i, false); };
    return g;
  }

  function baue(wurzel) {
    const id = 'anf' + (++zaehler);
    const ds = wurzel.dataset;
    const zeiten = liste(ds.zeiten), anlaesse = liste(ds.anlaesse);
    const ruhetage = liste(ds.ruhetage).map(Number), geschlossen = new Set(liste(ds.geschlossen));
    const pMax = ds.personenMax === undefined ? 30 : +ds.personenMax;
    const mitDatum = ds.datum !== '0', mitTel = ds.telefon === '1';
    const heute = heuteCH(), letzter = plusTage(heute, +(ds.tageVoraus || 120));
    const offen = (d) => d >= heute && d <= letzter && !ruhetage.includes(d.getDay()) && !geschlossen.has(iso(d));
    const wahl = { datum: null, zeit: null, anlass: null, personen: pMax ? Math.min(+(ds.personenStart || 2), pMax) : 0 };
    let fokusTag = heute; while (!offen(fokusTag) && fokusTag < letzter) fokusTag = plusTage(fokusTag, 1);
    let monat = new Date(fokusTag.getFullYear(), fokusTag.getMonth(), 1);

    wurzel.classList.add('anfrage');
    wurzel.innerHTML = `
      <div class="anf-schritt anf-datum"${mitDatum ? '' : ' hidden'}>
        <p class="anf-titel" id="${id}-dt">${ds.titelDatum || 'Datum'}</p>
        <div class="anf-kal">
          <div class="anf-kal-kopf">
            <button type="button" class="anf-pfeil" data-m="-1" aria-label="Vorheriger Monat">‹</button>
            <p class="anf-monat" id="${id}-mo" aria-live="polite"></p>
            <button type="button" class="anf-pfeil" data-m="1" aria-label="Nächster Monat">›</button>
          </div>
          <table class="anf-raster" role="grid" aria-labelledby="${id}-dt ${id}-mo">
            <thead><tr>${TAGE_K.map((t, i) => `<th scope="col" abbr="${TAGE_L[(i + 1) % 7]}">${t}</th>`).join('')}</tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      ${zeiten.length ? `<div class="anf-schritt"><p class="anf-titel" id="${id}-zt">${ds.titelZeit || 'Zeit'}</p><div data-platz="zeit"></div></div>` : ''}
      ${pMax ? `<div class="anf-schritt"><p class="anf-titel" id="${id}-ps">${ds.titelPersonen || 'Personen'}</p>
        <div class="anf-personen" role="group" aria-labelledby="${id}-ps">
          <button type="button" class="anf-rund" data-p="-1" aria-label="Eine Person weniger">−</button>
          <output class="anf-zahl" aria-live="polite"></output>
          <button type="button" class="anf-rund" data-p="1" aria-label="Eine Person mehr">+</button>
          <div class="anf-schnell" data-platz="schnell"></div>
        </div></div>` : ''}
      ${anlaesse.length ? `<div class="anf-schritt"><p class="anf-titel" id="${id}-an">${ds.titelAnlass || 'Anlass'}</p><div data-platz="anlass"></div></div>` : ''}
      <div class="anf-schritt anf-text">
        <label class="anf-feld"><span class="anf-titel">Name</span><input type="text" name="name" autocomplete="name" required></label>
        ${mitTel ? '<label class="anf-feld"><span class="anf-titel">Telefon für den Rückruf</span><input type="tel" name="telefon" autocomplete="tel" inputmode="tel" required></label>' : ''}
        <label class="anf-feld"><span class="anf-titel">Bemerkung <small>(freiwillig)</small></span><textarea name="bemerkung" rows="3"></textarea></label>
      </div>
      <div class="anf-abschluss">
        <p class="anf-zusammen" aria-live="polite"></p>
        <button type="button" class="anf-senden">${ds.knopf || 'E-Mail vorbereiten'}</button>
        <p class="anf-fehler" role="alert"></p>
        <p class="anf-hinweis">Öffnet Ihr Mailprogramm mit einer fertigen Nachricht an <a href="mailto:${ds.email}">${ds.email}</a>. Nichts wird automatisch gesendet.</p>
      </div>`;

    const $ = (s) => wurzel.querySelector(s);
    const tbody = $('tbody'), monatEl = $('.anf-monat'), zus = $('.anf-zusammen'), fehler = $('.anf-fehler');

    // ---------- Kalender ----------
    function zeichne(fokussieren) {
      monatEl.textContent = `${MONATE[monat.getMonth()]} ${monat.getFullYear()}`;
      const erster = new Date(monat.getFullYear(), monat.getMonth(), 1);
      let d = plusTage(erster, -((erster.getDay() + 6) % 7));
      let zeilen = '';
      for (let w = 0; w < 6; w++) {
        zeilen += '<tr>';
        for (let t = 0; t < 7; t++, d = plusTage(d, 1)) {
          const fremd = d.getMonth() !== monat.getMonth();
          const k = iso(d), frei = offen(d) && !fremd;
          const gewaehlt = wahl.datum && k === iso(wahl.datum);
          zeilen += `<td role="gridcell" data-tag="${k}" tabindex="${k === iso(fokusTag) ? 0 : -1}"
            class="${fremd ? 'fremd ' : ''}${frei ? '' : d < heute || d > letzter ? 'vorbei ' : 'zu '}${k === iso(heute) ? 'heute' : ''}"
            aria-selected="${!!gewaehlt}" ${frei ? '' : 'aria-disabled="true"'} ${k === iso(heute) ? 'aria-current="date"' : ''}
            aria-label="${lang(d)}${frei ? '' : ', nicht verfügbar'}">${fremd ? '' : d.getDate()}</td>`;
        }
        zeilen += '</tr>';
        if (d.getMonth() !== monat.getMonth() && w >= 3) break;
      }
      tbody.innerHTML = zeilen;
      $('[data-m="-1"]').disabled = monat <= new Date(heute.getFullYear(), heute.getMonth(), 1);
      $('[data-m="1"]').disabled = monat >= new Date(letzter.getFullYear(), letzter.getMonth(), 1);
      if (fokussieren) { const z = tbody.querySelector('[tabindex="0"]'); z && z.focus(); }
    }
    function geheZu(d, fokussieren = true) {
      if (d < heute) d = heute; if (d > letzter) d = letzter;
      fokusTag = d;
      if (d.getMonth() !== monat.getMonth() || d.getFullYear() !== monat.getFullYear()) monat = new Date(d.getFullYear(), d.getMonth(), 1);
      zeichne(fokussieren);
    }
    function waehleTag(d) {
      if (!offen(d)) return;
      wahl.datum = d; fokusTag = d; zeichne(true); aktualisiere();
    }
    tbody.addEventListener('click', (e) => {
      const td = e.target.closest('td[data-tag]'); if (!td || td.classList.contains('fremd')) return;
      const [y, m, t] = td.dataset.tag.split('-').map(Number); waehleTag(new Date(y, m - 1, t));
    });
    tbody.addEventListener('keydown', (e) => {
      const td = e.target.closest('td[data-tag]');
      if (td && !td.classList.contains('fremd')) { const [y, m, t] = td.dataset.tag.split('-').map(Number); fokusTag = new Date(y, m - 1, t); }
      const d = fokusTag; let z = null;
      switch (e.key) {
        case 'ArrowRight': z = plusTage(d, 1); break;
        case 'ArrowLeft': z = plusTage(d, -1); break;
        case 'ArrowDown': z = plusTage(d, 7); break;
        case 'ArrowUp': z = plusTage(d, -7); break;
        case 'Home': z = plusTage(d, -((d.getDay() + 6) % 7)); break;
        case 'End': z = plusTage(d, 6 - ((d.getDay() + 6) % 7)); break;
        case 'PageUp': z = plusMonate(d, e.shiftKey ? -12 : -1); break;
        case 'PageDown': z = plusMonate(d, e.shiftKey ? 12 : 1); break;
        case 'Enter': case ' ': e.preventDefault(); waehleTag(d); return;
        default: return;
      }
      e.preventDefault(); geheZu(z);
    });
    wurzel.querySelectorAll('.anf-pfeil').forEach((b) => b.addEventListener('click', () => {
      monat = new Date(monat.getFullYear(), monat.getMonth() + +b.dataset.m, 1);
      let d = monat < heute ? heute : monat; let n = 0;
      while (!offen(d) && n++ < 31 && d.getMonth() === monat.getMonth()) d = plusTage(d, 1);
      fokusTag = d.getMonth() === monat.getMonth() ? d : monat; if (fokusTag < heute) fokusTag = heute; zeichne(false);
    }));

    // ---------- Chips ----------
    if (zeiten.length) $('[data-platz="zeit"]').replaceWith(chips(`${id}-zt`, zeiten, (w) => { wahl.zeit = w; aktualisiere(); }));
    if (anlaesse.length) $('[data-platz="anlass"]').replaceWith(chips(`${id}-an`, anlaesse, (w) => { wahl.anlass = w; aktualisiere(); }));

    // ---------- Personen ----------
    if (pMax) {
      const zahl = $('.anf-zahl');
      const schnell = liste(ds.personenSchnell || '2,4,6,8').map(Number).filter((n) => n <= pMax);
      const sg = chips(`${id}-ps`, schnell.map(String), (w) => setzeP(+w));
      sg.setAttribute('aria-label', 'Schnellwahl'); sg.removeAttribute('aria-labelledby');
      $('[data-platz="schnell"]').replaceWith(sg);
      function setzeP(n) {
        wahl.personen = Math.max(1, Math.min(pMax, n));
        zahl.textContent = `${wahl.personen} ${wahl.personen === 1 ? 'Person' : 'Personen'}`;
        $('[data-p="-1"]').disabled = wahl.personen <= 1; $('[data-p="1"]').disabled = wahl.personen >= pMax;
        sg.querySelectorAll('.anf-chip').forEach((c) => c.setAttribute('aria-checked', String(+c.textContent === wahl.personen)));
        aktualisiere();
      }
      wurzel.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => setzeP(wahl.personen + +b.dataset.p)));
      setzeP(wahl.personen);
    }

    // ---------- Zusammenfassung + E-Mail ----------
    function aktualisiere() {
      const teile = [wahl.datum && lang(wahl.datum), wahl.zeit && uhr(wahl.zeit), pMax && `${wahl.personen} ${wahl.personen === 1 ? 'Person' : 'Personen'}`, wahl.anlass].filter(Boolean);
      zus.textContent = teile.join(' · ');
      if (fehler.textContent) fehler.textContent = '';
    }
    $('.anf-senden').addEventListener('click', () => {
      const name = $('[name="name"]').value.trim(), bem = $('[name="bemerkung"]').value.trim();
      const tel = mitTel ? $('[name="telefon"]').value.trim() : '';
      const fehlt = [mitDatum && !wahl.datum && 'Datum', zeiten.length && !wahl.zeit && 'Zeit', !name && 'Name',
        mitTel && (tel.replace(/\D/g, '').length < 7) && 'Telefon'].filter(Boolean);
      if (fehlt.length) {
        fehler.textContent = `Bitte noch ergänzen: ${fehlt.join(', ')}.`;
        const ziel = { Datum: () => tbody.querySelector('[tabindex="0"]'), Name: () => $('[name="name"]'), Telefon: () => $('[name="telefon"]'), Zeit: () => wurzel.querySelector(`[aria-labelledby="${id}-zt"] [tabindex="0"]`) };
        ziel[fehlt[0]]()?.focus();
        return;
      }
      const z = [
        'Grüezi', '',
        `${ds.einleitung || 'Ich möchte gerne anfragen:'}`, '',
        ...(wahl.datum ? [zeile(ds.titelDatum || 'Datum', lang(wahl.datum))] : []),
        ...(wahl.zeit ? [zeile(ds.titelZeit || 'Zeit', uhr(wahl.zeit))] : []),
        ...(pMax ? [zeile(ds.titelPersonen || 'Personen', wahl.personen)] : []),
        ...(wahl.anlass ? [zeile(ds.titelAnlass || 'Anlass', wahl.anlass)] : []),
        ...(bem ? ['', `Bemerkung: ${bem}`] : []),
        '', 'Freundliche Grüsse', name,
        ...(tel ? [`Telefon: ${tel}`] : []),
      ];
      const wann = [wahl.datum && `${wahl.datum.getDate()}.${wahl.datum.getMonth() + 1}.${wahl.datum.getFullYear()}`, wahl.zeit].filter(Boolean).join(', ');
      const betreff = `${ds.betreff || 'Anfrage'}${wann ? ' ' + wann : ''}`;
      const url = `mailto:${ds.email}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(z.join('\r\n'))}`; // CRLF nach RFC 6068
      // Ereignis vorher, abbrechbar (Tests, eigene Danke-Anzeige)
      if (wurzel.dispatchEvent(new CustomEvent('anfrage:mail', { bubbles: true, cancelable: true, detail: { ...wahl, name, telefon: tel, url } }))) window.location.href = url;
    });

    zeichne(false); aktualisiere();
  }

  const los = () => document.querySelectorAll('[data-anfrage]').forEach(baue);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', los) : los();
})();
