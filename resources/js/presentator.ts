import vragenJson from '../../data/vragen.json';
import { Antwoord, api, VraagDef } from './api';
import { Code, CODE_NAAM, klas, stellingen, StellingId } from './data';

interface BeamerStand {
  nummer: number;
  naam: string;
  stap: string;
  volgende: string;
  notities: string[];
  scenes: string[];
  zwart: boolean;
  bekijk: string | null;
  tijd: number;
}

interface Deelnemer {
  id: number;
  naam: string;
}

const vragen = vragenJson.vragen as unknown as VraagDef[];

function vraagVoor(id: string): VraagDef | null {
  if (/^s[1-6]$/.test(id)) return { id, type: 'stelling', stelling: id };
  return vragen.find((v) => v.id === id) ?? null;
}

function titelVan(vraag: VraagDef): string {
  return vraag.type === 'stelling' ? stellingen[vraag.stelling as StellingId] : vraag.tekst ?? vraag.id;
}

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const el = {
  verbinding: document.getElementById('verbinding')!,
  plaats: document.getElementById('plaats')!,
  scene: document.getElementById('scene')!,
  stap: document.getElementById('stap')!,
  volgende: document.getElementById('volgende')!,
  notities: document.getElementById('notities')!,
  antwoorden: document.getElementById('antwoorden')!,
  deelnemers: document.getElementById('deelnemers')!,
  scenes: document.getElementById('scenes')!,
  zwart: document.getElementById('zwart') as HTMLButtonElement,
};

/** Zet html alleen als ze veranderd is, zodat open lijsten en scrollposities blijven staan. */
const vorige = new Map<HTMLElement, string>();
function zet(doel: HTMLElement, html: string) {
  if (vorige.get(doel) === html) return;
  vorige.set(doel, html);
  doel.innerHTML = html;
}

// ---------- antwoorden per soort vraag ----------

function groepen(vraag: VraagDef, antwoorden: Antwoord[]): string {
  const opties =
    vraag.type === 'stelling'
      ? ([1, 3, 2] as Code[]).map((c) => ({ waarde: c, label: CODE_NAAM[c] }))
      : (vraag.opties ?? []).map((label, i) => ({ waarde: i, label: label + (vraag.juist === i ? ' ✓' : '') }));
  return opties
    .map((o) => {
      const namen = antwoorden.filter((a) => Number(a.waarde) === o.waarde).map((a) => a.naam);
      return `<div class="groepje"><div class="groepje-kop"><span>${esc(o.label)}</span><b>${namen.length}</b></div>
        <div class="chips">${namen.map((n) => `<span class="chip">${esc(n)}</span>`).join('') || '<span class="leeg">niemand</span>'}</div></div>`;
    })
    .join('');
}

function lijst(vraag: VraagDef, antwoorden: Antwoord[]): string {
  if (vraag.type === 'open') {
    return antwoorden.map((a) => `<li><b>${esc(a.naam)}</b><span>${esc(String(a.waarde))}</span></li>`).join('');
  }
  if (vraag.type === 'herstemming') {
    // Alleen tonen wat anders is dan op papier, dat is waar het gesprek over gaat.
    return antwoorden
      .map((a) => {
        const nieuw = a.waarde as Record<string, number>;
        const l = klas.find((k) => k.naam.toLowerCase() === a.naam.trim().toLowerCase());
        const wissels = l
          ? Object.entries(nieuw)
              .filter(([s, c]) => (l.tegenstrijdig?.[s as StellingId]?.bedoeld ?? l.antwoorden[s as StellingId]) !== c)
              .map(([s, c]) => `${s.slice(1)}: ${CODE_NAAM[(l.tegenstrijdig?.[s as StellingId]?.bedoeld ?? l.antwoorden[s as StellingId]) as Code]} → ${CODE_NAAM[c as Code]}`)
          : [];
        const uitleg = !l ? 'niet op de klaslijst' : wissels.length ? wissels.join(' · ') : 'niets veranderd';
        return `<li><b>${esc(a.naam)}</b><span class="${wissels.length ? 'goud' : ''}">${esc(uitleg)}</span></li>`;
      })
      .join('');
  }
  const eenheid = vraag.eenheid ? ` ${vraag.eenheid}` : '';
  return [...antwoorden]
    .sort((a, b) => Number(a.waarde) - Number(b.waarde))
    .map((a) => `<li><b>${esc(a.naam)}</b><span>${new Intl.NumberFormat('nl-BE').format(Number(a.waarde))}${esc(eenheid)}</span></li>`)
    .join('');
}

function antwoordenHtml(vraag: VraagDef, antwoorden: Antwoord[], deelnemers: number, open: boolean): string {
  const kop = `<p class="label">${open ? 'Vraag staat open' : 'Antwoorden'} · ${antwoorden.length} van ${deelnemers}</p>
    <p class="vraagtekst">${esc(titelVan(vraag))}</p>`;
  const inhoud = vraag.type === 'keuze' || vraag.type === 'stelling' ? groepen(vraag, antwoorden) : `<ul class="lijst">${lijst(vraag, antwoorden)}</ul>`;
  const extra = vraag.antwoord !== undefined ? `<p class="zacht">Juist antwoord: ${new Intl.NumberFormat('nl-BE').format(vraag.antwoord)}${vraag.eenheid ? ` ${esc(vraag.eenheid)}` : ''}</p>` : '';
  return kop + inhoud + extra;
}

// ---------- verversen ----------

let stand: BeamerStand | null = null;

async function ververs() {
  try {
    const [nieuweStand, actief, deelnemers] = await Promise.all([
      api<BeamerStand | null>('GET', '/presentator/beamer'),
      api<{ vraag: VraagDef | null }>('GET', '/actieve-vraag'),
      api<Deelnemer[]>('GET', '/presentator/deelnemers'),
    ]);
    stand = nieuweStand;
    const bekijk = stand?.bekijk ?? actief.vraag?.id ?? null;
    const vraag = bekijk ? vraagVoor(bekijk) : null;
    const antwoorden = vraag ? await api<Antwoord[]>('GET', `/presentator/antwoorden?vraag=${encodeURIComponent(vraag.id)}`) : [];

    const levend = !!stand && Date.now() / 1000 - stand.tijd < 600;
    el.verbinding.className = `stip ${levend ? 'aan' : ''}`;
    el.verbinding.title = levend ? 'Beamer verbonden' : 'Geen beamer gevonden';

    if (stand) {
      zet(el.plaats, `Scène ${stand.nummer} van ${stand.scenes.length}`);
      zet(el.scene, esc(stand.naam));
      zet(el.stap, esc(stand.stap));
      zet(el.volgende, esc(stand.volgende));
      zet(el.notities, stand.notities.map((n) => `<li>${esc(n)}</li>`).join(''));
      el.notities.hidden = !stand.notities.length;
      el.zwart.classList.toggle('aan', stand.zwart);
      zet(
        el.scenes,
        stand.scenes.map((n, i) => `<button data-scene="${i}" class="${i + 1 === stand!.nummer ? 'actief' : ''}"><span>${i + 1}</span>${esc(n)}</button>`).join(''),
      );
    } else {
      zet(el.scene, 'Open de beamer op de laptop');
    }

    zet(el.antwoorden, vraag ? antwoordenHtml(vraag, antwoorden, deelnemers.length, actief.vraag?.id === vraag.id) : '');
    el.antwoorden.hidden = !vraag;

    const geantwoord = new Set(antwoorden.map((a) => a.deelnemer));
    zet(
      el.deelnemers,
      `<p class="label">${deelnemers.length} aangemeld</p><div class="chips">${
        deelnemers.map((d) => `<span class="chip ${geantwoord.has(d.id) ? 'goud' : ''}">${esc(d.naam)}</span>`).join('') || '<span class="leeg">nog niemand</span>'
      }</div>`,
    );
  } catch {
    el.verbinding.className = 'stip fout';
  }
}

// ---------- bediening ----------

async function stuur(soort: string, scene?: number) {
  navigator.vibrate?.(12);
  try {
    await api('POST', '/presentator/opdrachten', { soort, scene });
  } catch {
    el.verbinding.className = 'stip fout';
  }
  window.setTimeout(ververs, 700);
}

document.getElementById('vorige')!.addEventListener('click', () => stuur('vorige'));
document.getElementById('volgende-knop')!.addEventListener('click', () => stuur('volgende'));
el.zwart.addEventListener('click', () => stuur('zwart'));
el.scenes.addEventListener('click', (event) => {
  const knop = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scene]');
  if (knop) {
    stuur('scene', Number(knop.dataset.scene));
    (document.getElementById('scenelijst') as HTMLDetailsElement).open = false;
  }
});
document.getElementById('wisAntwoorden')!.addEventListener('click', async () => {
  if (confirm('Alle antwoorden wissen?')) await api('DELETE', '/presentator/antwoorden');
  ververs();
});
document.getElementById('wisDeelnemers')!.addEventListener('click', async () => {
  if (confirm('Alle deelnemers en hun antwoorden wissen?')) await api('DELETE', '/presentator/deelnemers');
  ververs();
});

ververs();
window.setInterval(ververs, 1500);
