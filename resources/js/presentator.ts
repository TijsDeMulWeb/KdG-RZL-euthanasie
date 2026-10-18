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
  getoond: number | null;
  opdracht: number | null;
  camera: { status: string; zones: number[]; ruw: number[]; correctie: number[]; spiegel: boolean; vast: boolean } | null;
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
  camera: document.getElementById('camera')!,
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
    const getoond = stand?.getoond ?? null;
    return antwoorden
      .map(
        (a) => `<li class="${a.id === getoond ? 'getoond' : ''}"><div class="rij"><b>${esc(a.naam)}</b>
          ${
            a.id === getoond
              ? '<button class="toon" data-toon="">Verberg</button>'
              : `<span class="knoppen"><button class="toon" data-toon="${a.id}">Toon</button><button class="toon" data-toon="${a.id}" data-naam>Met naam</button></span>`
          }</div>
          <span>${esc(String(a.waarde))}</span></li>`,
      )
      .join('');
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

// ---------- camera ----------

const STATUS: Record<string, string> = {
  aan: 'Camera telt',
  laden: 'Camera wordt gestart…',
  uit: 'Camera staat uit',
  fout: 'Camera werkt niet: tel zelf met + en −',
};

/**
 * Het blok wordt één keer opgebouwd; daarna veranderen alleen de getallen en de status.
 * Zo blijven de knoppen staan en gaat er geen tik verloren terwijl de telling elke seconde ververst.
 */
function zetCamera(camera: NonNullable<BeamerStand['camera']>) {
  const kanten = ['Eens', 'Twijfel', 'Oneens'];
  if (!el.camera.querySelector('.zones')) {
    el.camera.innerHTML = `<div class="camera-kop"><span class="stip" data-veld="stip"></span><b data-veld="status"></b></div>
      <p class="zacht">Eens links, twijfel midden, oneens rechts, gezien vanuit de klas.</p>
      <div class="zones">${kanten
        .map(
          (kant, z) => `<div class="zone">
            <span class="label">${kant}</span>
            <span class="zone-getal" data-veld="zone${z}"></span>
            <span class="zacht" data-veld="ruw${z}"></span>
            <div class="plusmin"><button data-zone="${z}" data-stap="-1" aria-label="${kant} min één">−</button><button data-zone="${z}" data-stap="1" aria-label="${kant} plus één">+</button></div>
          </div>`,
        )
        .join('')}</div>
      <button class="vastzetten" data-vergrendel></button>
      <button class="spiegel" data-spiegel>Links en rechts omwisselen</button>`;
  }
  const veld = (naam: string) => el.camera.querySelector<HTMLElement>(`[data-veld="${naam}"]`)!;
  const werkt = camera.status === 'aan' && !camera.vast;
  veld('stip').className = `stip ${werkt ? 'aan' : camera.status === 'fout' && !camera.vast ? 'fout' : ''}`;
  veld('status').textContent = camera.vast ? 'Telling staat vast' : STATUS[camera.status] ?? camera.status;
  el.camera.classList.toggle('is-vast', camera.vast);
  el.camera.querySelectorAll<HTMLButtonElement>('[data-zone], [data-spiegel]').forEach((knop) => (knop.disabled = camera.vast));
  const vergrendel = el.camera.querySelector<HTMLButtonElement>('[data-vergrendel]')!;
  vergrendel.dataset.vergrendel = camera.vast ? 'los' : 'vast';
  vergrendel.textContent = camera.vast ? 'Telling vrijgeven' : 'Telling vastzetten';
  kanten.forEach((_, z) => {
    veld(`zone${z}`).textContent = String(camera.zones[z]);
    const correctie = camera.correctie[z] ? ` · ${camera.correctie[z] > 0 ? '+' : ''}${camera.correctie[z]}` : '';
    veld(`ruw${z}`).textContent = camera.vast ? 'vast' : `${werkt ? `ziet ${camera.ruw[z]}` : 'zelf geteld'}${correctie}`;
  });
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

    // De beamer meldt zich elke 15 seconden; langer stil betekent dat hij dicht is of op een verborgen tabblad staat.
    const levend = !!stand && Date.now() / 1000 - stand.tijd < 45;
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

    if (stand?.camera) zetCamera(stand.camera);
    el.camera.hidden = !stand?.camera;

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

const melding = document.getElementById('melding')!;
let meldingTimer = 0;
function meld(tekst: string, soort: 'fout' | 'ok' = 'fout') {
  melding.textContent = tekst;
  melding.className = `melding ${soort}`;
  melding.hidden = false;
  clearTimeout(meldingTimer);
  meldingTimer = window.setTimeout(() => (melding.hidden = true), soort === 'ok' ? 1600 : 6000);
}

const UITGEVOERD: Record<string, string> = {
  volgende: 'Volgende stap op de beamer',
  vorige: 'Vorige stap op de beamer',
  zwart: 'Zwart scherm gewisseld',
  scene: 'Naar de scène gesprongen',
  toon: 'Aangepast op de beamer',
  telling: 'Telling aangepast',
  spiegel: 'Links en rechts gewisseld',
  vergrendel: 'Telling aangepast',
};

/**
 * Elke klik wacht tot de beamer bevestigt dat hij de opdracht uitvoerde.
 * Tot dan staat de knop op 'bezig'; lukt het niet binnen 4 seconden, dan volgt een duidelijke melding.
 */
let wacht: { id: number; knop: HTMLElement | null; soort: string; sinds: number } | null = null;
let snelPeilen = 0;

async function controleerBevestiging() {
  if (!wacht) return;
  try {
    const nieuw = await api<BeamerStand | null>('GET', '/presentator/beamer');
    if (nieuw && wacht && (nieuw.opdracht ?? 0) >= wacht.id) {
      stand = nieuw;
      bevestig(true);
      ververs();
      return;
    }
  } catch {
    // Volgende poging.
  }
  if (wacht && Date.now() - wacht.sinds > 4000) bevestig(false);
}

function bevestig(gelukt: boolean) {
  if (!wacht) return;
  const { knop, soort } = wacht;
  wacht = null;
  clearInterval(snelPeilen);
  knop?.classList.remove('bezig');
  if (gelukt) {
    navigator.vibrate?.([10, 40, 10]);
    knop?.classList.add('gelukt');
    window.setTimeout(() => knop?.classList.remove('gelukt'), 700);
    meld(`✓ ${UITGEVOERD[soort] ?? 'Uitgevoerd'}`, 'ok');
  } else {
    navigator.vibrate?.([60, 60, 60]);
    meld('De beamer reageert niet. Staat hij open, zichtbaar en verbonden met internet?');
  }
}

function stuur(soort: string, scene?: number, knop?: HTMLElement | null) {
  return stuurOpdracht({ soort, scene }, knop ?? null);
}

async function stuurOpdracht(opdracht: Record<string, unknown>, knop: HTMLElement | null = null) {
  navigator.vibrate?.(12);
  wacht?.knop?.classList.remove('bezig');
  knop?.classList.add('bezig');
  try {
    const { id } = await api<{ id: number }>('POST', '/presentator/opdrachten', opdracht);
    wacht = { id, knop, soort: String(opdracht.soort), sinds: Date.now() };
    clearInterval(snelPeilen);
    snelPeilen = window.setInterval(controleerBevestiging, 300);
  } catch (fout) {
    knop?.classList.remove('bezig');
    el.verbinding.className = 'stip fout';
    const code = (fout as Error).message;
    meld(
      code === '419'
        ? 'Je sessie is verlopen. Herlaad deze pagina.'
        : code === '403'
          ? 'Je bent niet ingelogd als presentator. Open eerst de inloglink in deze browser.'
          : 'Geen verbinding met de server. De klik is niet verstuurd.',
    );
  }
}

const vorigeKnop = document.getElementById('vorige')!;
const volgendeKnop = document.getElementById('volgende-knop')!;
vorigeKnop.addEventListener('click', () => stuur('vorige', undefined, vorigeKnop));
volgendeKnop.addEventListener('click', () => stuur('volgende', undefined, volgendeKnop));
el.zwart.addEventListener('click', () => stuur('zwart', undefined, el.zwart));
el.camera.addEventListener('click', (event) => {
  const knop = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!knop) return;
  if (knop.dataset.vergrendel) stuurOpdracht({ soort: 'vergrendel', aan: knop.dataset.vergrendel === 'vast' }, knop);
  else if (knop.dataset.spiegel !== undefined) stuurOpdracht({ soort: 'spiegel' }, knop);
  else stuurOpdracht({ soort: 'telling', zone: Number(knop.dataset.zone), stap: Number(knop.dataset.stap) }, knop);
});
el.antwoorden.addEventListener('click', (event) => {
  const knop = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-toon]');
  if (!knop) return;
  // Een lege waarde betekent: het getoonde antwoord weer verbergen.
  stuurOpdracht({ soort: 'toon', antwoord: knop.dataset.toon ? Number(knop.dataset.toon) : null, metNaam: knop.dataset.naam !== undefined }, knop);
});
el.scenes.addEventListener('click', (event) => {
  const knop = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scene]');
  if (knop) {
    stuur('scene', Number(knop.dataset.scene), knop);
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
