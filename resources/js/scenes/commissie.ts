import { antwoord, CODE_NAAM, Dossier, dossiers, isGevoelig, klas, leerling, STELLING_NR, stellingen } from '../data';
import { dossierPosities, GROEP_VOLGORDE, kolommen, sterrenbeelden } from '../layout';
import { Live } from '../live';
import { Teller } from '../teller';
import { esc, Vak } from '../overlay';
import { Ctx, Hulp, Scene } from '../scene';
import { SterDoel } from '../stage';
import { klasInHemel } from './opening';
import { verdeelOverKanten } from './slot';

type Sub = 'kaart' | 'gsm' | 'staan' | 'onthulling' | 'sterrenbeeld' | 'duel' | 'tegenspraak';

type Toestand = { soort: 'overzicht' } | { soort: 'dossier'; id: string; sub: Sub };

const SUB_LABEL: Record<Sub, string> = {
  kaart: 'kaart (zonder naam)',
  gsm: 'anoniem stemmen op de gsm',
  staan: 'gaan staan: de camera telt',
  onthulling: 'onthulling: naam en afloop',
  sterrenbeeld: 'sterrenbeelden, klik op een ster voor het citaat',
  duel: 'duel',
  tegenspraak: 'tegenspraak met voltooid leven',
};

export const dossierSleutel = (id: string) => `d:${id}`;

export const MAX_STAAN = 16;
export const staanSleutel = (zone: number, i: number) => `staan:${zone}:${i}`;

export type CommissieScene = Scene & { besproken(): Set<string> };

function subs(d: Dossier): Sub[] {
  const lijst: Sub[] = ['kaart', 'gsm', 'staan', 'onthulling', 'sterrenbeeld', 'duel'];
  return d.tegenspraak ? [...lijst, 'tegenspraak'] : lijst;
}

function dossier(id: string): Dossier {
  return dossiers.find((d) => d.id === id)!;
}

/** Wie bij voltooid leven 'eigen keuze' zei, maar Lhermitte geen euthanasie gunde. */
const tegenspraakNamenVan = () => klas.filter((l) => antwoord(l, 's5') === 1 && antwoord(l, 's4') === 2).map((l) => l.naam);

/**
 * De commissie. `ids` zijn de dossiers die in dit deel aan bod komen (de les splitst ze rond de pauze);
 * `eerder` geeft de dossiers die in een vorig deel al besproken zijn, zodat hun ster goud blijft.
 */
export function commissie(ctx: Ctx, teller: Teller, live: Live, ids: string[], eerder: () => Set<string> = () => new Set()): CommissieScene {
  // De volledige geschiedenis blijft bewaard, ook als de scène verlaten wordt. Terug = één toestand eraf.
  const geschiedenis: Toestand[] = [{ soort: 'overzicht' }];
  let selectie: { naam: string; open: boolean } | null = null;
  const duelOpen = new Set<string>();
  /** Hoeveel mensen er per kant stonden, per dossier, zodat terugkeren dezelfde telling toont. */
  const staan = new Map<string, [number, number, number]>();
  const getoondeGsm = new Set<string>();
  const gsmUitslag = new Map<string, [number, number, number]>();
  /** Dossiers waarvan de telling vaststaat: de camera telt niet meer mee en het gesprek kan beginnen. */
  const vast = new Set<string>();
  let stopLuisteren: (() => void) | null = null;

  const huidig = () => geschiedenis[geschiedenis.length - 1];

  /** Een dossier is besproken zodra de geschiedenis er na dat dossier terug naar het overzicht ging. */
  function besproken(): Set<string> {
    const klaar = new Set<string>(eerder());
    let laatste: string | null = null;
    for (const t of geschiedenis) {
      if (t.soort === 'dossier') laatste = t.id;
      else if (laatste) {
        klaar.add(laatste);
        laatste = null;
      }
    }
    return klaar;
  }

  function volgendDossier(): Dossier | null {
    const klaar = besproken();
    return dossiers.find((d) => ids.includes(d.id) && !klaar.has(d.id)) ?? null;
  }

  function volgendeToestand(): Toestand | null {
    const t = huidig();
    if (t.soort === 'overzicht') {
      const d = volgendDossier();
      return d ? { soort: 'dossier', id: d.id, sub: 'kaart' } : null;
    }
    const lijst = subs(dossier(t.id));
    const i = lijst.indexOf(t.sub);
    return i < lijst.length - 1 ? { ...t, sub: lijst[i + 1] } : { soort: 'overzicht' };
  }

  function ga(t: Toestand) {
    geschiedenis.push(t);
    selectie = null;
    duelOpen.clear();
    render();
  }

  // ---------- stemmen: anoniem op de gsm, daarna gaan staan ----------

  function camera(d: Dossier) {
    const { W, H } = ctx.stage;
    const p = dossierPosities(W, H)[d.id];
    const zoom = 2.4;
    // De dossierster komt links in beeld, de kaart rechts ernaast.
    return { x: p.x - (W * 0.19 - W / 2) / zoom, y: p.y - (H * 0.46 - H / 2) / zoom, zoom };
  }

  /** Antwoorden op de gsm per groep, in de volgorde eens, twijfel, oneens. */
  function gsmGroepen(): string[][] {
    return GROEP_VOLGORDE.map((code) =>
      live.antwoorden.filter((a) => Number(a.waarde) === code).map((a) => live.sleutel(a.deelnemer)).filter((k): k is string => !!k),
    );
  }

  function groepVakken(d: Dossier, regel: (i: number) => string, top: number, gedimd = false): Record<string, Vak> {
    const { W } = ctx.stage;
    const vakken: Record<string, Vak> = {};
    GROEP_VOLGORDE.forEach((code, i) => {
      vakken[`groep${code}`] = {
        regio: 'abs',
        klasse: `groep${gedimd ? ' gedimd' : ''}`,
        html: `${CODE_NAAM[code]} ${regel(i)}`,
        stijl: `left:${(W / 3) * (i + 0.5)}px;top:${top}px`,
        delay: 0.4,
      };
    });
    vakken.stelling = { regio: 'top', klasse: 'stelling', html: `<span data-pas>${esc(stellingen[d.stelling])}</span>`, regels: 2 };
    return vakken;
  }

  function renderGsm(d: Dossier, direct: boolean) {
    const { W, H } = ctx.stage;
    const groepen = gsmGroepen();
    const pos = kolommen(W, H, groepen, 700 + STELLING_NR[d.stelling], [H * 0.34, H * 0.84]);
    const sterren: Record<string, SterDoel> = {};
    for (const [sleutel, p] of Object.entries(pos)) {
      sterren[sleutel] = { ...p, size: 40, label: 0 };
      if (!getoondeGsm.has(sleutel)) {
        sterren[sleutel].vanaf = { x: W / 2, y: -40 };
        sterren[sleutel].boog = 0.15;
        getoondeGsm.add(sleutel);
      }
    }
    ctx.stage.toon({ achtergrond: 0.9, sterren, duur: 1.6 }, direct);
    ctx.overlay.toon(
      {
        ...groepVakken(d, (i) => `<span class="aantal">${groepen[i].length}</span>`, H * 0.24),
        teller: {
          regio: 'bottom',
          klasse: 'telling',
          html: `Stem anoniem op je gsm · ${live.antwoorden.length} van ${live.deelnemers.length}`,
        },
      },
      direct,
    );
  }

  function staanTelling(d: Dossier): [number, number, number] {
    return staan.get(d.id) ?? [0, 0, 0];
  }

  function renderStaan(d: Dossier, direct: boolean) {
    const { W, H } = ctx.stage;
    const groepen = gsmGroepen();
    const telling = staanTelling(d);
    const sterren: Record<string, SterDoel> = {};
    // Bovenaan klein de anonieme stemming, onderaan wie er echt staat.
    const pos = kolommen(W, H, groepen, 800 + STELLING_NR[d.stelling], [H * 0.3, H * 0.46]);
    for (const [sleutel, p] of Object.entries(pos)) sterren[sleutel] = { ...p, size: 26, alpha: 0.45, label: 0 };
    telling.forEach((n, zone) => {
      const namen = Array.from({ length: Math.min(n, MAX_STAAN) }, (_, i) => staanSleutel(zone, i));
      const plekken = kolommen(W, H, [[], [], []].map((_, z) => (z === zone ? namen : [])), 900 + zone, [H * 0.58, H * 0.86]);
      namen.forEach((sleutel) => {
        sterren[sleutel] = { ...plekken[sleutel], kleur: 'goud', size: 44, label: 0, vanaf: { x: plekken[sleutel].x, y: -60 }, boog: 0.04 };
      });
    });
    ctx.stage.toon({ achtergrond: 0.9, sterren, duur: 1.4 }, direct);

    const vakken = groepVakken(d, (i) => `<span class="aantal">${telling[i]}</span>`, H * 0.5);
    GROEP_VOLGORDE.forEach((_, i) => {
      vakken[`anoniem${i}`] = {
        regio: 'abs',
        klasse: 'anoniem',
        html: `anoniem ${groepen[i].length}`,
        stijl: `left:${(W / 3) * (i + 0.5)}px;top:${H * 0.21}px`,
      };
    });
    vakken.uitleg = {
      regio: 'bottom',
      klasse: 'camera-melding',
      html: vast.has(d.id)
        ? 'Jullie mogen weer gaan zitten.'
        : 'Ga staan aan jouw kant.',
    };
    ctx.overlay.toon(vakken, direct);
  }

  function liveGewijzigd() {
    const t = huidig();
    if (t.soort === 'dossier' && t.sub === 'gsm') renderGsm(dossier(t.id), false);
  }

  function tellerGewijzigd() {
    const t = huidig();
    if (t.soort !== 'dossier' || t.sub !== 'staan') return;
    const d = dossier(t.id);
    const vorig = staanTelling(d);
    const nieuw = teller.zones.map((n) => Math.min(n, MAX_STAAN)) as [number, number, number];
    staan.set(d.id, nieuw);
    // Alleen sterren die bijkomen of wegvallen aanpassen; de rest blijft liggen.
    const wijziging: Record<string, SterDoel | null> = {};
    const { W, H } = ctx.stage;
    nieuw.forEach((n, zone) => {
      const namen = Array.from({ length: n }, (_, i) => staanSleutel(zone, i));
      const plekken = kolommen(W, H, [[], [], []].map((_, z) => (z === zone ? namen : [])), 900 + zone, [H * 0.58, H * 0.86]);
      for (let i = 0; i < MAX_STAAN; i++) {
        if (i >= vorig[zone] && i < n) {
          const p = plekken[staanSleutel(zone, i)];
          wijziging[staanSleutel(zone, i)] = { ...p, kleur: 'goud', size: 44, label: 0, vanaf: { x: p.x, y: -60 }, boog: 0.04, delay: (i - vorig[zone]) * 0.15 };
        }
        if (i >= n && i < vorig[zone]) wijziging[staanSleutel(zone, i)] = null;
      }
    });
    ctx.stage.werk(wijziging, 1.3);
    const vakken = groepVakken(d, (i) => `<span class="aantal">${nieuw[i]}</span>`, H * 0.5);
    const groepen = gsmGroepen();
    GROEP_VOLGORDE.forEach((_, i) => {
      vakken[`anoniem${i}`] = { regio: 'abs', klasse: 'anoniem', html: `anoniem ${groepen[i].length}`, stijl: `left:${(W / 3) * (i + 0.5)}px;top:${H * 0.21}px` };
    });
    vakken.uitleg = { regio: 'bottom', klasse: 'camera-melding', html: 'Ga staan aan jouw kant.' };
    ctx.overlay.toon(vakken);
  }


  // ---------- beelden ----------

  function dossierSterren(nadruk?: string): Record<string, SterDoel> {
    const pos = dossierPosities(ctx.stage.W, ctx.stage.H);
    const klaar = besproken();
    const uit: Record<string, SterDoel> = {};
    for (const d of dossiers) {
      const k = dossierSleutel(d.id);
      if (nadruk && d.id !== nadruk) continue;
      uit[k] = klaar.has(d.id)
        ? { ...pos[d.id], kleur: 'gedempt', size: 50, alpha: 0.9, label: 0.75 }
        : { ...pos[d.id], kleur: 'wit', size: 58, puls: 1, label: 1 };
    }
    return uit;
  }

  function renderOverzicht(direct: boolean) {
    ctx.stage.toon({ achtergrond: 1, sterren: { ...klasInHemel(ctx, { alpha: 0.6, label: 0.55 }), ...dossierSterren() } }, direct);
    ctx.overlay.toon({}, direct);
  }

  function renderKaart(d: Dossier, sub: Sub, direct: boolean) {
    const p = dossierPosities(ctx.stage.W, ctx.stage.H)[d.id];
    const sterren: Record<string, SterDoel> = {
      [dossierSleutel(d.id)]: { ...p, kleur: sub === 'onthulling' ? 'goud' : 'wit', size: 72, puls: 0.6, label: 0 },
    };
    ctx.stage.toon({ achtergrond: 1, sterren, camera: camera(d), duur: 2, cameraDuur: sub === 'kaart' ? 3.2 : 2 }, direct);
    ctx.overlay.toon(kaartVakken(d, sub), direct);
  }

  function kaartVakken(d: Dossier, sub: Sub): Record<string, Vak> {
    const vakken: Record<string, Vak> = {
      kaart: {
        regio: 'card',
        klasse: 'kaart',
        html: d.kaart.map((r) => `<p>${esc(r)}</p>`).join(''),
        delay: 1.2,
      },
    };
    if (sub === 'onthulling') vakken.voet = { regio: 'card', klasse: 'onthulling', html: esc(d.onthulling), volgorde: 1, delay: 0.2 };
    return vakken;
  }

  function citaatHtml(naam: string, open: boolean, s: Dossier['stelling']): string {
    const l = leerling(naam);
    const tekst = l.citaten[s];
    const inhoud = !open ? '<span class="wacht">…</span>' : tekst ? `<q data-pas>${esc(tekst)}</q>` : '<span class="geen">(geen citaat)</span>';
    return `<span class="wie">${esc(naam)}</span>${inhoud}`;
  }

  function renderSterrenbeeld(d: Dossier, sub: Sub, direct: boolean) {
    const { W, H } = ctx.stage;
    const beeld = sterrenbeelden(W, H, d.stelling);
    const duel = sub === 'duel' ? d.duel : null;
    const flikkeraars = sub === 'tegenspraak' ? tegenspraakNamenVan() : [];

    const sterren: Record<string, SterDoel> = {};
    klas.forEach((l, i) => {
      const doel: SterDoel = { ...beeld.pos[l.naam], delay: i * 0.05 };
      if (duel) {
        if (duel.includes(l.naam)) Object.assign(doel, { kleur: 'goud', size: 60, nadruk: true });
        else Object.assign(doel, { alpha: 0.25, label: 0 });
      } else if (sub === 'tegenspraak') {
        if (flikkeraars.includes(l.naam)) Object.assign(doel, { flikker: 1, nadruk: true });
        else Object.assign(doel, { alpha: 0.3, label: 0.6 });
      } else if (selectie) {
        if (selectie.naam === l.naam) Object.assign(doel, { kleur: 'goud', size: 58, nadruk: true });
        else Object.assign(doel, { alpha: 0.6, label: 0.8 });
      }
      sterren[l.naam] = doel;
    });
    ctx.stage.toon(
      {
        achtergrond: 0.75,
        sterren,
        lijnen: beeld.lijnen,
        lijnAlpha: duel || sub === 'tegenspraak' ? 0.35 : 1,
        duel,
        duur: sub === 'sterrenbeeld' ? 2.2 : 1.2,
        cameraDuur: sub === 'sterrenbeeld' ? 2.8 : undefined,
      },
      direct,
    );

    const tellingen = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
    klas.forEach((l) => tellingen[antwoord(l, d.stelling)]++);
    const vakken: Record<string, Vak> = {
      stelling: {
        regio: 'top',
        klasse: 'stelling',
        html: `<span data-pas>${esc(stellingen[d.stelling])}</span>`,
        regels: 2,
      },
    };
    for (const g of beeld.groepen) {
      vakken[`groep${g.code}`] = {
        regio: 'abs',
        klasse: `groep${duel || sub === 'tegenspraak' ? ' gedimd' : ''}`,
        html: `${CODE_NAAM[g.code]} <span class="aantal">${tellingen[g.code]}</span>`,
        stijl: `left:${g.x}px;top:${H * 0.18}px`,
        delay: 1.4,
      };
    }

    // Onder elke groep: wat de klas anoniem en staand koos, naast wat ze op papier schreven.
    const gestaan = staan.get(d.id);
    const anoniem = gsmUitslag.get(d.id);
    if (sub === 'sterrenbeeld' && (gestaan || anoniem)) {
      beeld.groepen.forEach((g, i) => {
        const delen = [anoniem ? `gsm ${anoniem[i]}` : '', gestaan ? `staand ${gestaan[i]}` : ''].filter(Boolean);
        vakken[`vergelijk${g.code}`] = { regio: 'abs', klasse: 'anoniem', html: delen.join(' · '), stijl: `left:${g.x}px;top:${H * 0.235}px`, delay: 1.8 };
      });
    }
    if (sub === 'sterrenbeeld' && selectie) {
      vakken.citaat = { regio: 'bottom', klasse: 'citaat', html: citaatHtml(selectie.naam, selectie.open, d.stelling), regels: 2, delay: 0 };
    }
    if (duel) {
      // Het citaat van wie links aan de hemel staat, komt ook links.
      const [kantLinks, kantRechts] = verdeelOverKanten(duel, beeld.pos, W);
      [...kantLinks, ...kantRechts].forEach((naam, i) => {
        const open = !isGevoelig(leerling(naam), d.stelling) || duelOpen.has(naam);
        vakken[`duel${i}`] = {
          regio: 'bottom',
          klasse: `citaat duel ${i === 0 ? 'links' : 'rechts'}`,
          html: citaatHtml(naam, open, d.stelling),
          volgorde: i,
          regels: 2,
          delay: 0.8 + i * 0.4,
        };
      });
    }
    if (sub === 'tegenspraak') {
      vakken.tegenspraak = { regio: 'bottom', klasse: 'tegenspraak', html: 'Bij voltooid leven zeiden jullie: eigen keuze.', delay: 1 };
    }
    ctx.overlay.toon(vakken, direct);
  }

  function render(direct = false) {
    const t = huidig();
    const d = t.soort === 'dossier' ? dossier(t.id) : null;
    // De gsm-uitslag bewaren voor we verdergaan, zodat ze later naast de rest kan staan.
    if (d && live.bekijk === d.stelling && live.antwoorden.length) gsmUitslag.set(d.id, gsmGroepen().map((g) => g.length) as [number, number, number]);
    const sub = d ? (t as { sub: Sub }).sub : null;
    live.open(sub === 'gsm' ? d!.stelling : null, null, sub === 'gsm' || sub === 'staan' ? d!.stelling : null);
    if (d && (t as { sub: Sub }).sub === 'staan' && !vast.has(d.id)) teller.tel(staanTelling(d));
    else teller.stoppen();

    if (t.soort === 'overzicht') return renderOverzicht(direct);
    if (t.sub === 'kaart' || t.sub === 'onthulling') return renderKaart(d!, t.sub, direct);
    if (t.sub === 'gsm') return renderGsm(d!, direct);
    if (t.sub === 'staan') return renderStaan(d!, direct);
    renderSterrenbeeld(d!, t.sub, direct);
  }

  // ---------- presentatorhulp ----------

  function beschrijf(t: Toestand | null): string {
    if (!t) return 'volgende scène';
    if (t.soort === 'overzicht') return 'terug naar de hemel (ster wordt goud)';
    return `${dossier(t.id).titel}: ${SUB_LABEL[t.sub]}`;
  }

  function hulp(): Hulp {
    const t = huidig();
    const notities: string[] = [];
    if (t.soort === 'overzicht') {
      notities.push('Klik op een dossierster, of → voor het volgende dossier.');
    } else {
      const d = dossier(t.id);
      const s = d.stelling;
      notities.push(`Stelling ${STELLING_NR[s]}. Duel: ${d.duel.join(' tegen ')}.`);
      const gevoelig = klas.filter((l) => isGevoelig(l, s)).map((l) => l.naam);
      if (gevoelig.length) notities.push(`Eerst toestemming vragen (citaat na extra klik): ${gevoelig.join(', ')}.`);
      for (const l of klas) {
        const tg = l.tegenstrijdig?.[s];
        if (tg) notities.push(`${l.naam} staat bij ${CODE_NAAM[tg.bedoeld]}: ${tg.uitleg}`);
        if (l.opgelet && s === 's5') notities.push(`${l.naam}: ${l.opgelet}`);
      }
      if (t.sub === 'tegenspraak') notities.push(`Flikkeren: ${tegenspraakNamenVan().join(', ')}.`);
      if (t.sub === 'gsm') notities.push(`${live.antwoorden.length} van ${live.deelnemers.length} stemden.`);
      if (t.sub === 'staan') {
        const status = { uit: 'uit', laden: 'wordt gestart', aan: `aan, ziet nu ${teller.ruw.join(' / ')}`, fout: 'niet beschikbaar' }[teller.status];
        notities.push(`Camera ${status}. Corrigeer met + en − in het camerablok.`);
      }
    }
    return { stap: beschrijf(t), volgende: beschrijf(volgendeToestand()), notities };
  }

  return {
    naam: ids.length < dossiers.length ? `Commissie (${ids.map((id) => dossier(id).titel).join(', ')})` : 'Commissie',
    besproken,
    enter() {
      // Van voren: begint in het overzicht. Van achteren: de bewaarde geschiedenis loopt gewoon terug.
      selectie = null;
      duelOpen.clear();
      teller.start();
      stopLuisteren?.();
      const stopLive = live.luister(liveGewijzigd);
      const stopTeller = teller.luister(tellerGewijzigd);
      stopLuisteren = () => {
        stopLive();
        stopTeller();
      };
      render();
    },
    verlaat() {
      stopLuisteren?.();
      stopLuisteren = null;
      teller.stoppen();
      live.open(null);
    },
    next() {
      const t = volgendeToestand();
      if (!t) return false;
      ga(t);
      return true;
    },
    prev() {
      if (geschiedenis.length <= 1) return false;
      geschiedenis.pop();
      selectie = null;
      duelOpen.clear();
      render();
      return true;
    },
    render,
    cameraStand() {
      const t = huidig();
      if (t.soort !== 'dossier' || t.sub !== 'staan') return null;
      const isVast = vast.has(t.id);
      return {
        status: teller.status,
        zones: isVast ? [...staanTelling(dossier(t.id))] : [...teller.zones],
        ruw: [...teller.ruw],
        correctie: [...teller.correctie],
        spiegel: teller.spiegel,
        vast: isVast,
      };
    },
    corrigeerTelling(zone, stap) {
      const t = huidig();
      if (t.soort === 'dossier' && t.sub === 'staan' && !vast.has(t.id)) teller.corrigeer(zone, stap);
    },
    vergrendelTelling(aan) {
      const t = huidig();
      if (t.soort !== 'dossier' || t.sub !== 'staan') return;
      const d = dossier(t.id);
      if (aan) {
        teller.stoppen();
        vast.add(d.id);
      } else {
        vast.delete(d.id);
        teller.tel(staanTelling(d));
      }
      renderStaan(d, false);
    },
    wisselSpiegel() {
      teller.spiegel = !teller.spiegel;
    },
    toets(event) {
      const t = huidig();
      if (t.soort !== 'dossier' || t.sub !== 'staan' || vast.has(t.id)) return false;
      const zone = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
      if (zone >= 0) {
        teller.corrigeer(zone, event.shiftKey ? -1 : 1);
        return true;
      }
      if (event.code === 'KeyM') {
        teller.spiegel = !teller.spiegel;
        return true;
      }
      return false;
    },
    klik(sleutel) {
      const t = huidig();
      if (!sleutel) return;
      if (t.soort === 'overzicht') {
        if (sleutel.startsWith('d:')) ga({ soort: 'dossier', id: sleutel.slice(2), sub: 'kaart' });
        return;
      }
      const d = dossier(t.id);
      const l = klas.find((k) => k.naam === sleutel);
      if (!l) return;
      if (t.sub === 'sterrenbeeld') {
        // Gevoelig: eerste klik selecteert, tweede klik toont het citaat, nog een klik sluit.
        if (selectie?.naam !== l.naam) selectie = { naam: l.naam, open: !isGevoelig(l, d.stelling) };
        else if (!selectie.open) selectie.open = true;
        else selectie = null;
        render();
      } else if (t.sub === 'duel' && d.duel.includes(l.naam) && isGevoelig(l, d.stelling)) {
        duelOpen.add(l.naam);
        render();
      }
    },
    hulp,
  };
}
