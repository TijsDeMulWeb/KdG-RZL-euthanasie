import { antwoord, Code, CODE_NAAM, isGevoelig, klas, Leerling, leerling, StellingId, stellingen, zelfbeschikking } from '../data';
import { hemel, HEMEL_MARGE, Pt, sterrenbeelden, vrijeY } from '../layout';
import { Live } from '../live';
import { esc, Vak } from '../overlay';
import { Ctx, lineair, Scene } from '../scene';
import { SterDoel } from '../stage';
import { liveScene } from './gsm';
import { asLabels, klasInHemel, MIDDEN } from './opening';

const STELLINGEN: StellingId[] = ['s1', 's2', 's3', 's4', 's5', 's6'];

/** Namen vergelijken zonder hoofdletters, accenten of spaties, want op een gsm typt iedereen anders. */
function gelijkeNaam(a: string, b: string): boolean {
  const zuiver = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase();
  return zuiver(a) === zuiver(b);
}

function nieuweScore(nieuw: Record<string, number>): number {
  const waarde: Record<Code, number> = { 1: 1, 2: -1, 3: 0 };
  return (['s1', 's2', 's3', 's4', 's5'] as StellingId[]).reduce((som, s) => {
    const w = waarde[nieuw[s] as Code] ?? 0;
    return som + (s === 's2' ? -w : w);
  }, 0);
}

// ---------- herstemming ----------

export function herstemming(ctx: Ctx, live: Live): Scene {
  const gevlogen = new Set<string>();

  /** Per klasgenoot het nieuwe antwoord van de gsm, gekoppeld via de voornaam. */
  function nieuweAntwoorden(): Map<string, Record<string, number>> {
    const uit = new Map<string, Record<string, number>>();
    for (const a of live.antwoorden) {
      const l = klas.find((k) => gelijkeNaam(k.naam, a.naam));
      if (l && typeof a.waarde === 'object') uit.set(l.naam, a.waarde);
    }
    return uit;
  }

  function veranderd(l: Leerling, nieuw: Record<string, number>): StellingId[] {
    return STELLINGEN.filter((s) => nieuw[s] !== undefined && nieuw[s] !== antwoord(l, s));
  }

  function xVoor(score: number): number {
    const { W } = ctx.stage;
    const links = W * HEMEL_MARGE;
    return links + ((5 - score) / 10) * (W * (1 - 2 * HEMEL_MARGE));
  }

  const render = (onthul: boolean) => (direct: boolean) => {
    const { H } = ctx.stage;
    const pos = hemel(ctx.stage.W, H);
    const nieuw = nieuweAntwoorden();
    const sterren: Record<string, SterDoel> = {};
    let aantalVeranderd = 0;
    // Eerst wie blijft staan, daarna zoeken de verschuivers een vrije plek ertussen.
    const plekken: Record<string, Pt> = {};
    for (const l of klas) {
      const n = nieuw.get(l.naam);
      if (!n || Math.abs(xVoor(nieuweScore(n)) - pos[l.naam].x) < 0.5) plekken[l.naam] = pos[l.naam];
    }
    for (const l of klas) {
      const n = nieuw.get(l.naam);
      if (!n || plekken[l.naam]) continue;
      const x = xVoor(nieuweScore(n));
      plekken[l.naam] = { x, y: vrijeY(H, l.naam, x, pos[l.naam].y, plekken) };
    }

    for (const l of klas) {
      const n = nieuw.get(l.naam);
      const oud = pos[l.naam];
      if (!n) {
        sterren[l.naam] = { ...oud, alpha: onthul ? 0.25 : 0.45, label: onthul ? 0.4 : 0.6 };
        continue;
      }
      const wissels = veranderd(l, n);
      if (wissels.length) aantalVeranderd++;
      // Wie opschuift op de as, vliegt als vallende ster met een lichtspoor naar de nieuwe plek.
      const doel: SterDoel = { ...plekken[l.naam], alpha: 1, label: 1 };
      if (wissels.length) Object.assign(doel, { kleur: 'goud', nadruk: onthul, size: onthul ? 56 : 48 });
      else if (onthul) Object.assign(doel, { alpha: 0.4, label: 0.55 });
      const verschuift = Math.hypot(doel.x - oud.x, doel.y - oud.y) > 1;
      if (verschuift && !gevlogen.has(l.naam) && !direct) {
        doel.vanaf = oud;
        doel.boog = doel.x > oud.x ? -0.35 : 0.35;
        gevlogen.add(l.naam);
      }
      sterren[l.naam] = doel;
    }
    ctx.stage.toon({ achtergrond: 1, sterren, duur: 2.4 }, direct);

    const gestemd = nieuw.size;
    const vakken: Record<string, Vak> = { ...asLabels(ctx, onthul ? 0.4 : 1) };
    if (!onthul) {
      vakken.vraag = { regio: 'top', klasse: 'vraag-titel', html: 'Stem opnieuw op je gsm. Wat vind je nu?' };
      vakken.teller = { regio: 'top', klasse: 'telling', html: `${gestemd} van ${klas.length} klasgenoten stemden opnieuw`, volgorde: 1 };
    } else {
      const zin =
        gestemd === 0
          ? 'Nog niemand stemde opnieuw.'
          : aantalVeranderd === 0
            ? `Niemand van de ${gestemd} veranderde van mening.`
            : aantalVeranderd === gestemd
              ? `Alle ${gestemd} veranderden van mening.`
              : `${aantalVeranderd} van ${gestemd} veranderden van mening.`;
      vakken.uitkomst = { regio: 'top', klasse: 'vraag-titel', html: esc(zin) };
    }
    ctx.overlay.toon(vakken, direct);
  };

  function notities(): string[] {
    const nieuw = nieuweAntwoorden();
    const regels = klas.flatMap((l) => {
      const n = nieuw.get(l.naam);
      if (!n) return [];
      const wissels = veranderd(l, n);
      if (!wissels.length) return [];
      const oud = zelfbeschikking(l);
      const nu = nieuweScore(n);
      return [`${l.naam}: ${wissels.map((s) => `${s.slice(1)} ${CODE_NAAM[antwoord(l, s)]} → ${CODE_NAAM[n[s] as Code]}`).join(', ')}${oud !== nu ? ` (score ${oud} → ${nu})` : ''}`];
    });
    const losse = live.antwoorden.filter((a) => !klas.some((k) => gelijkeNaam(k.naam, a.naam))).map((a) => a.naam);
    if (losse.length) regels.push(`Niet op de klaslijst, telt niet mee: ${losse.join(', ')}.`);
    return regels;
  }

  return liveScene('Herstemming', live, [
    { label: 'Iedereen stemt opnieuw op de gsm', vraag: 'herstemming', render: render(false), notities },
    { label: 'Hoeveel veranderden van mening?', vraag: null, bekijk: 'herstemming', render: render(true), notities },
  ]);
}

// ---------- afsluiter ----------

export function afsluiter(ctx: Ctx, live: Live): Scene {
  return liveScene('Afsluiter', live, [
    {
      label: 'Alles dooft behalve één ster',
      vraag: null,
      einde: true,
      render(direct) {
        const { W, H } = ctx.stage;
        // Alle sterren doven traag; één blijft over in het midden.
        ctx.stage.toon({ achtergrond: 0.15, sterren: { [MIDDEN]: { x: W / 2, y: H * 0.4, size: 70, puls: 0.4 } }, duur: 5 }, direct);
        ctx.overlay.toon({ slot: { regio: 'center', klasse: 'titel slotzin', html: 'Achter elk lichtje zit een mens met een verhaal.', delay: 4 } }, direct);
      },
    },
    {
      label: 'Hulplijnen',
      vraag: null,
      einde: true,
      render(direct) {
        const { W, H } = ctx.stage;
        ctx.stage.toon({ achtergrond: 0.35, sterren: { [MIDDEN]: { x: W / 2, y: H * 0.22, size: 50, alpha: 0.7 } }, duur: 3 }, direct);
        ctx.overlay.toon(
          {
            hulp: {
              regio: 'center',
              klasse: 'hulplijnen',
              html: `<p>Zit je ergens mee? Praat erover.</p>
                <p><span class="lijn">Tele-Onthaal</span> <span class="nummer">106</span></p>
                <p><span class="lijn">Zelfmoordlijn</span> <span class="nummer">1813</span></p>`,
              delay: 0.8,
            },
          },
          direct,
        );
      },
    },
  ]);
}

// ---------- elk lichtje een mens ----------

export function mensen(ctx: Ctx): Scene {
  const AANTAL = 3000;
  const DUUR = 12;
  let teller = 0;
  return lineair('Zo’n 3.000 mensen', [
    {
      label: 'De hemel vult zich met 3.000 sterren',
      notities: ['Bron: "Zo\'n 3.000 mensen" in 2022, VRT NWS februari 2023 (p. 14). Het is een afgerond getal.'],
      render: ({ direct }) => {
        ctx.stage.toon({ achtergrond: 0.5, sterren: klasInHemel(ctx, { alpha: 0.9, label: 0.6 }), mensen: AANTAL, mensenDuur: DUUR, duur: 1.6 }, direct);
        ctx.overlay.toon(
          {
            getal: { regio: 'top', klasse: 'mensen-teller', html: '<span id="mensenteller">0</span>' },
            zin: { regio: 'bottom', klasse: 'uitleg', html: 'Zo’n 3.000 mensen kregen in 2022 euthanasie in België. Elk lichtje is een mens.', delay: DUUR - 2 },
          },
          direct,
        );
        clearInterval(teller);
        const nf = new Intl.NumberFormat('nl-BE');
        const tik = () => {
          const el = document.getElementById('mensenteller');
          if (!el) return clearInterval(teller);
          el.textContent = nf.format(Math.min(AANTAL, ctx.stage.mensenNu));
        };
        teller = window.setInterval(tik, 50);
      },
    },
  ]);
}

// ---------- abortus: sterrenbeelden en duel ----------

export function abortusSterrenbeelden(ctx: Ctx): Scene {
  const s: StellingId = 's6';
  const links = 'Wout';
  const rechts = ['Romy', 'Franka'];
  let selectie: { naam: string; open: boolean } | null = null;
  let stap = 0;

  function citaatHtml(naam: string, open: boolean): string {
    const tekst = leerling(naam).citaten[s];
    const inhoud = !open ? '<span class="wacht">…</span>' : tekst ? `<q data-pas>${esc(tekst)}</q>` : '<span class="geen">(geen citaat)</span>';
    return `<span class="wie">${esc(naam)}</span>${inhoud}`;
  }

  function render(duel: boolean, direct: boolean) {
    const { W, H } = ctx.stage;
    const beeld = sterrenbeelden(W, H, s);
    const sterren: Record<string, SterDoel> = {};
    klas.forEach((l, i) => {
      const doel: SterDoel = { ...beeld.pos[l.naam], delay: i * 0.05 };
      const inDuel = l.naam === links || rechts.includes(l.naam);
      if (duel) Object.assign(doel, inDuel ? { kleur: 'goud', size: 60, nadruk: true } : { alpha: 0.25, label: 0 });
      else if (selectie) Object.assign(doel, selectie.naam === l.naam ? { kleur: 'goud', size: 58, nadruk: true } : { alpha: 0.6, label: 0.8 });
      sterren[l.naam] = doel;
    });
    ctx.stage.toon(
      {
        achtergrond: 0.75,
        sterren,
        lijnen: duel ? rechts.map((r) => [links, r] as [string, string]) : beeld.lijnen,
        lijnAlpha: duel ? 2 : 1,
        duur: duel ? 1.2 : 2.2,
      },
      direct,
    );

    const telling = { 1: 0, 2: 0, 3: 0 } as Record<Code, number>;
    klas.forEach((l) => telling[antwoord(l, s)]++);
    const vakken: Record<string, Vak> = {
      stelling: { regio: 'top', klasse: 'stelling', html: `<span data-pas>${esc(stellingen[s])}</span>`, regels: 2 },
    };
    for (const g of beeld.groepen) {
      vakken[`groep${g.code}`] = {
        regio: 'abs',
        klasse: `groep${duel ? ' gedimd' : ''}`,
        html: `${CODE_NAAM[g.code]} <span class="aantal">${telling[g.code]}</span>`,
        stijl: `left:${g.x}px;top:${H * 0.18}px`,
        delay: 1.4,
      };
    }
    if (!duel && selectie) vakken.citaat = { regio: 'bottom', klasse: 'citaat', html: citaatHtml(selectie.naam, selectie.open), regels: 2, delay: 0 };
    if (duel) {
      vakken.duel0 = { regio: 'bottom', klasse: 'citaat duel links', html: citaatHtml(links, true), regels: 2, delay: 0.8 };
      vakken.duel1 = {
        regio: 'bottom',
        klasse: 'citaat duel rechts',
        html: rechts.map((n) => citaatHtml(n, true)).join(''),
        volgorde: 1,
        regels: 2,
        delay: 1.2,
      };
    }
    ctx.overlay.toon(vakken, direct);
  }

  return lineair(
    'Abortus: sterrenbeelden',
    [
      { label: 'Sterrenbeelden stelling 6, klik op een ster voor het citaat', render: ({ direct }) => ((stap = 0), (selectie = null), render(false, direct)) },
      { label: `Duel: ${links} tegenover ${rechts.join(' en ')}`, render: ({ direct }) => ((stap = 1), (selectie = null), render(true, direct)) },
    ],
    {
      klik(sleutel) {
        if (stap !== 0 || !sleutel) return;
        const l = klas.find((k) => k.naam === sleutel);
        if (!l) return;
        if (selectie?.naam !== l.naam) selectie = { naam: l.naam, open: !isGevoelig(l, s) };
        else if (!selectie.open) selectie.open = true;
        else selectie = null;
        render(false, false);
      },
    },
  );
}
