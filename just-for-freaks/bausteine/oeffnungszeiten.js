/* Öffnungszeiten mit „jetzt offen“ (immer Schweizer Zeit, egal wo der Besucher ist).
   Einbau:
   <div data-oeffnungszeiten='{"mo":"zu","di":"11:00-14:00, 17:30-23:00","mi":"…","do":"…","fr":"17:00-01:00","sa":"…","so":"zu"}'
        data-ausnahmen='{"2026-12-24":"zu","2026-12-31":"18:00-02:00"}'></div>
   Zeigt Status (.oz-status mit data-offen="ja|nein|bald") und die Liste (.oz-liste, heutiger Tag aria-current).
   Nur den Status irgendwo sonst: <span data-jetzt-offen="#id-der-zeiten"></span>. Über Mitternacht: "17:00-01:00". */
(() => {
  'use strict';
  const K = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  const NAME = { mo: 'Montag', di: 'Dienstag', mi: 'Mittwoch', do: 'Donnerstag', fr: 'Freitag', sa: 'Samstag', so: 'Sonntag' };
  const REIHE = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];
  const min = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
  const hhmm = (m) => { m = ((m % 1440) + 1440) % 1440; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
  // Nur echte Spannen „HH:MM-HH:MM“; Freitext („nach Vereinbarung“) zählt als geschlossen und wird gemeldet
  const spannen = (s) => (!s || /^zu|geschlossen|ruhetag/i.test(s.trim())) ? [] :
    s.split(',').map((t) => t.trim()).filter(Boolean).flatMap((t) => {
      const m = t.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
      if (!m) { const f = window.__f || [], n = 'Öffnungszeiten: unlesbar „' + t + '“'; if (!f.includes(n)) f.push(n); return []; }
      const st = min(m[1]); let e = min(m[2]); if (e <= st) e += 1440; return [[st, e]];
    });

  function jetztZuerich() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return { wd, minute: +p.hour * 60 + +p.minute, datum: new Date(Date.UTC(+p.year, +p.month - 1, +p.day)) };
  }
  const isoUTC = (d) => d.toISOString().slice(0, 10);

  // Spannen für Tag mit Versatz o (−1 = gestern … 7), in Minuten relativ zu heute 0:00
  function tagSpannen(plan, ausn, jetzt, o) {
    const d = new Date(jetzt.datum); d.setUTCDate(d.getUTCDate() + o);
    const k = K[(jetzt.wd + o + 7 * 2) % 7];
    const s = ausn[isoUTC(d)] !== undefined ? ausn[isoUTC(d)] : plan[k];
    return spannen(s).map(([a, b]) => [a + o * 1440, b + o * 1440, o, k]);
  }

  function status(plan, ausn) {
    const j = jetztZuerich();
    const alle = [];
    for (let o = -1; o <= 7; o++) alle.push(...tagSpannen(plan, ausn, j, o));
    const offen = alle.find(([a, b]) => j.minute >= a && j.minute < b);
    if (offen) {
      // lückenlos anschliessende Spannen zusammenziehen (11:00-14:00, 14:00-23:00 → bis 23:00)
      let ende = offen[1], weiter;
      while ((weiter = alle.find(([a, b]) => a <= ende && b > ende))) ende = weiter[1];
      const rest = ende - j.minute;
      return { offen: rest <= 30 ? 'bald' : 'ja', text: rest <= 30 ? `Schliesst bald · bis ${hhmm(ende)} Uhr` : `Jetzt offen · bis ${hhmm(ende)} Uhr` };
    }
    const naechste = alle.filter(([a]) => a > j.minute).sort((x, y) => x[0] - y[0])[0];
    if (!naechste) return { offen: 'nein', text: 'Zurzeit geschlossen' };
    const [a, , o, k] = naechste;
    const wann = o === 0 ? 'heute' : o === 1 ? 'morgen' : NAME[k];
    return { offen: 'nein', text: `Geschlossen · öffnet ${wann} ${hhmm(a)} Uhr` };
  }

  function baue(el) {
    let plan, ausn;
    try { plan = JSON.parse(el.dataset.oeffnungszeiten); ausn = JSON.parse(el.dataset.ausnahmen || '{}'); }
    catch (e) { (window.__f || []).push('Öffnungszeiten: JSON fehlerhaft'); return; }
    el.classList.add('oeffnungszeiten');
    const heute = K[jetztZuerich().wd];
    el.innerHTML = `<p class="oz-status" aria-live="polite"><span class="oz-punkt" aria-hidden="true"></span><span class="oz-text"></span></p>
      <dl class="oz-liste">${REIHE.map((k) => `<div class="oz-zeile"${k === heute ? ' aria-current="date"' : ''}><dt>${NAME[k]}</dt><dd>${plan[k] && !/^zu|geschlossen|ruhetag/i.test(plan[k].trim()) ? plan[k].split(',').map((t) => t.trim().replace(/\s*[-–]\s*/, '–')).join(', ') : 'geschlossen'}</dd></div>`).join('')}</dl>`;
    el._plan = plan; el._ausn = ausn;
    aktualisiere(el);
  }
  function aktualisiere(el) {
    const s = status(el._plan, el._ausn);
    const st = el.querySelector('.oz-status'); st.dataset.offen = s.offen; st.querySelector('.oz-text').textContent = s.text;
  }
  function badges() {
    document.querySelectorAll('[data-jetzt-offen]').forEach((b) => {
      const q = document.querySelector(b.dataset.jetztOffen); if (!q || !q._plan) return;
      const s = status(q._plan, q._ausn); b.dataset.offen = s.offen; b.textContent = s.text;
    });
  }
  function los() {
    document.querySelectorAll('[data-oeffnungszeiten]').forEach(baue); badges();
    setInterval(() => { document.querySelectorAll('.oeffnungszeiten').forEach(aktualisiere); badges(); }, 30000);
  }
  // Für Tests: Localuri.oeffnungStatus(plan, ausnahmen)
  window.Localuri = window.Localuri || {}; window.Localuri.oeffnungStatus = status;
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', los) : los();
})();
