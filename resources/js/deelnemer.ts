import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { api, VraagDef } from './api';
import { landnaam } from './landnamen';
import { landenGeo } from './wereld';

type Waarde = string | number | Record<string, number> | string[];

interface Stand {
  vraag: VraagDef | null;
  pauze: number | null;
  einde: boolean;
  antwoord: Waarde | null;
}

const app = document.getElementById('app')!;
let naam = app.dataset.naam || null;
let huidigeVraag: string | null = null;
let huidigePauze: number | null = null;
let huidigEinde = false;
let laatsteStand: Stand | null = null;

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toon(html: string) {
  app.innerHTML = html;
}

function aanmelden() {
  toon(`
    <h1>Jullie sterrenhemel</h1>
    <p class="zacht">Hoe heet je? Alleen de presentatoren zien je naam. Op het grote scherm blijf je anoniem.</p>
    <form id="form">
      <input id="naam" maxlength="30" autocomplete="given-name" placeholder="Voornaam" required>
      <button>Doe mee</button>
    </form>`);
  const form = document.getElementById('form') as HTMLFormElement;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invoer = (document.getElementById('naam') as HTMLInputElement).value.trim();
    if (!invoer) return;
    const resultaat = await api<{ naam: string }>('POST', '/deelnemers', { naam: invoer });
    naam = resultaat.naam;
    huidigeVraag = null;
    wacht();
    peil();
  });
}

function wacht() {
  toon(`<div class="ster"></div><p class="groot">Kijk naar het grote scherm.</p><p class="zacht">${naam ? `Je doet mee als ${esc(naam)}.` : ''}</p>`);
}

function verstuurdScherm() {
  toon(`<div class="ster aan"></div><p class="groot">Je antwoord staat aan de hemel.</p><p class="zacht">Je kan het nog aanpassen zolang de vraag open staat.</p><button class="link" id="opnieuw">Aanpassen</button>`);
  document.getElementById('opnieuw')!.addEventListener('click', () => {
    if (laatsteStand?.vraag) vraagScherm(laatsteStand.vraag, laatsteStand.antwoord);
  });
}

async function verstuur(vraag: VraagDef, waarde: Waarde) {
  try {
    await api('POST', '/antwoorden', { vraag: vraag.id, waarde });
    if (laatsteStand) laatsteStand.antwoord = waarde;
    verstuurdScherm();
  } catch {
    toon(`<p class="groot">Dat lukte niet.</p><p class="zacht">Misschien is de vraag net gesloten.</p>`);
  }
}

/** Alle stellingen onder elkaar, elk met drie knoppen. Versturen kan pas als alles ingevuld is. */
function herstemmingScherm(vraag: VraagDef, vorig: Record<string, number> | null) {
  const keuzes: Record<string, number> = { ...(vorig ?? {}) };
  const ids = vraag.stellingen ?? [];
  const stellingen = vraag.stellingTeksten ?? {};
  toon(`
    <p class="vraag">${esc(vraag.tekst ?? '')}</p>
    ${ids
      .map(
        (s, i) => `
      <section class="herstem">
        <p class="stelling-tekst"><b>${i + 1}.</b> ${esc(stellingen[s])}</p>
        <div class="drie">${['Eens', 'Oneens', 'Twijfel']
          .map((label, c) => `<button data-stelling="${s}" data-code="${c + 1}" class="${keuzes[s] === c + 1 ? 'gekozen' : ''}">${label}</button>`)
          .join('')}</div>
      </section>`,
      )
      .join('')}
    <button id="verstuur" class="hoofd" disabled>Verstuur</button>`);
  const knop = document.getElementById('verstuur') as HTMLButtonElement;
  const bijwerken = () => {
    knop.disabled = ids.some((s) => !keuzes[s]);
    knop.textContent = knop.disabled ? `Nog ${ids.filter((s) => !keuzes[s]).length} te gaan` : 'Verstuur';
  };
  document.querySelectorAll<HTMLButtonElement>('[data-stelling]').forEach((b) =>
    b.addEventListener('click', () => {
      keuzes[b.dataset.stelling!] = Number(b.dataset.code);
      b.parentElement!.querySelectorAll('button').forEach((x) => x.classList.toggle('gekozen', x === b));
      bijwerken();
    }),
  );
  knop.addEventListener('click', () => verstuur(vraag, keuzes));
  bijwerken();
}

/** Wereldkaart om landen aan te tikken, met een zoekveld voor kleine landen zoals België. */
function landenScherm(vraag: VraagDef, vorig: string[] | null) {
  const gekozen = new Set(vorig ?? []);
  const B = 360;
  const Hh = 190;
  const proj = geoNaturalEarth1().fitExtent(
    [
      [4, 4],
      [B - 4, Hh - 4],
    ],
    { type: 'FeatureCollection', features: landenGeo },
  );
  const pad = geoPath(proj);
  const namen = landenGeo
    .map((f) => ({ iso: String(f.id), naam: landnaam(String(f.id), f.properties.name) }))
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));

  toon(`
    <p class="vraag">${esc(vraag.tekst ?? '')}</p>
    ${vraag.uitleg ? `<p class="zacht">${esc(vraag.uitleg)}</p>` : ''}
    <svg class="kaartje-wereld" viewBox="0 0 ${B} ${Hh}">${landenGeo
      .map((f) => `<path data-iso="${f.id}" d="${pad(f)}"></path>`)
      .join('')}</svg>
    <input id="zoek" list="landnamen" placeholder="Zoek een land, bv. België" autocomplete="off">
    <datalist id="landnamen">${namen.map((n) => `<option value="${esc(n.naam)}">`).join('')}</datalist>
    <div id="gekozen" class="chips-gsm"></div>
    <button id="verstuur" class="hoofd">Verstuur</button>`);

  const svg = document.querySelector('svg')!;
  const bijwerken = () => {
    svg.querySelectorAll<SVGPathElement>('path').forEach((p) => p.classList.toggle('aan', gekozen.has(p.dataset.iso!)));
    document.getElementById('gekozen')!.innerHTML = [...gekozen]
      .map((iso) => `<button data-weg="${iso}">${esc(namen.find((n) => n.iso === iso)?.naam ?? iso)} ✕</button>`)
      .join('');
    (document.getElementById('verstuur') as HTMLButtonElement).textContent = `Verstuur (${gekozen.size})`;
  };
  svg.addEventListener('click', (event) => {
    const iso = (event.target as SVGElement).getAttribute('data-iso');
    if (!iso) return;
    if (gekozen.has(iso)) gekozen.delete(iso);
    else gekozen.add(iso);
    bijwerken();
  });
  const zoek = document.getElementById('zoek') as HTMLInputElement;
  zoek.addEventListener('change', () => {
    const land = namen.find((n) => n.naam.toLowerCase() === zoek.value.trim().toLowerCase());
    if (land) gekozen.add(land.iso);
    zoek.value = '';
    bijwerken();
  });
  document.getElementById('gekozen')!.addEventListener('click', (event) => {
    const iso = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-weg]')?.dataset.weg;
    if (iso) gekozen.delete(iso);
    bijwerken();
  });
  document.getElementById('verstuur')!.addEventListener('click', () => verstuur(vraag, [...gekozen]));
  bijwerken();
}

function eindeScherm() {
  toon(`<div class="ster aan"></div>
    <p class="groot">Bedankt.</p>
    <p class="zacht">Achter elk lichtje zit een mens met een verhaal.</p>
    <p class="zacht">Zit je ergens mee? Praat erover.<br>Tele-Onthaal <a href="tel:106">106</a> · Zelfmoordlijn <a href="tel:1813">1813</a></p>`);
}

function vraagScherm(vraag: VraagDef, vorig: Waarde | null) {
  if (vraag.type === 'herstemming') return herstemmingScherm(vraag, vorig as Record<string, number> | null);
  if (vraag.type === 'landen') return landenScherm(vraag, vorig as unknown as string[] | null);
  const titel = vraag.tekst ?? '';
  let invoer = '';
  if (vraag.type === 'open') {
    invoer = `<form id="form"><textarea id="waarde" maxlength="${vraag.maxLengte ?? 80}" rows="3" required>${esc(String(vorig ?? ''))}</textarea><button>Verstuur</button></form>`;
  } else if (vraag.type === 'keuze' || vraag.type === 'stelling') {
    const opties = vraag.type === 'stelling' ? ['Eens', 'Oneens', 'Ik twijfel'] : vraag.opties ?? [];
    // Stellingen gebruiken dezelfde codes als de vragenlijst: 1 = eens, 2 = oneens, 3 = twijfel.
    const waarde = (i: number) => (vraag.type === 'stelling' ? i + 1 : i);
    invoer = `<div class="keuzes">${opties.map((o, i) => `<button data-waarde="${waarde(i)}" class="${vorig === waarde(i) ? 'gekozen' : ''}">${esc(o)}</button>`).join('')}</div>`;
  } else {
    const min = vraag.min ?? 0;
    const max = vraag.max ?? 100;
    const start = vorig ?? (vraag.type === 'schuif' ? Math.round((min + max) / 2) : '');
    invoer =
      vraag.type === 'schuif'
        ? `<form id="form"><output id="toon">${start} ${esc(vraag.eenheid ?? '')}</output><input id="waarde" type="range" min="${min}" max="${max}" step="1" value="${start}"><button>Verstuur</button></form>`
        : `<form id="form"><input id="waarde" type="number" inputmode="numeric" min="${min}" max="${max}" value="${start}" placeholder="Jouw gok" required><span class="eenheid">${esc(vraag.eenheid ?? '')}</span><button>Verstuur</button></form>`;
  }
  const hulpzin = vraag.type === 'open' && vraag.uitleg ? `<p class="zacht">${esc(vraag.uitleg)}</p>` : '';
  toon(`<p class="vraag">${esc(titel)}</p>${hulpzin}${invoer}`);

  document.querySelectorAll<HTMLButtonElement>('[data-waarde]').forEach((knop) =>
    knop.addEventListener('click', () => verstuur(vraag, Number(knop.dataset.waarde))),
  );
  const schuif = document.querySelector<HTMLInputElement>('input[type=range]');
  schuif?.addEventListener('input', () => {
    document.getElementById('toon')!.textContent = `${schuif.value} ${vraag.eenheid ?? ''}`;
  });
  document.getElementById('form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const veld = document.getElementById('waarde') as HTMLInputElement;
    const waarde = vraag.type === 'open' ? veld.value.trim() : Number(veld.value);
    if (waarde === '') return;
    verstuur(vraag, waarde);
  });
}

function pauzeScherm(tot: number) {
  const rest = Math.max(0, Math.round((tot - Date.now()) / 1000));
  toon(`<div class="ster"></div><p class="groot">Pauze</p><p class="klok">${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}</p>`);
}

async function peil() {
  if (!naam) return;
  try {
    const stand = await api<Stand>('GET', '/actieve-vraag');
    laatsteStand = stand;
    if (stand.einde) {
      if (!huidigEinde) eindeScherm();
      huidigEinde = true;
      huidigeVraag = null;
      return;
    }
    if (huidigEinde) {
      huidigEinde = false;
      huidigeVraag = 'opnieuw tekenen';
    }
    if (stand.pauze) {
      huidigePauze = stand.pauze;
      huidigeVraag = null;
      pauzeScherm(stand.pauze);
      return;
    }
    huidigePauze = null;
    const id = stand.vraag?.id ?? null;
    if (id === huidigeVraag) return;
    huidigeVraag = id;
    if (!stand.vraag) wacht();
    else if (stand.antwoord !== null) verstuurdScherm();
    else vraagScherm(stand.vraag, stand.antwoord);
  } catch {
    // Netwerk even weg: de volgende peiling probeert het opnieuw.
  }
}

if (naam) {
  wacht();
  peil();
} else {
  aanmelden();
}
setInterval(peil, 1500);
setInterval(() => huidigePauze && pauzeScherm(huidigePauze), 1000);
