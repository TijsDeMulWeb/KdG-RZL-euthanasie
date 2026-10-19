import QRCode from 'qrcode';
import { vragen } from '../data';
import { kolommen, maten, vrijePlek } from '../layout';
import { Live } from '../live';
import { esc, Vak } from '../overlay';
import { Ctx, Hulp, Scene } from '../scene';
import { SterDoel } from '../stage';

export interface LiveStap {
  label: string;
  /** Welke vraag op de gsm's open staat tijdens deze stap; null = geen. */
  vraag: string | null;
  /** Van welke vraag de antwoorden in beeld blijven, ook als ze gesloten is. Standaard dezelfde als `vraag`. */
  bekijk?: string;
  pauzeTot?: () => number;
  /** De gsm's tonen het slotscherm met de hulplijnen. */
  einde?: boolean;
  render(direct: boolean): void;
  notities?: () => string[];
}

/**
 * Scène die met de gsm's meeleeft: elke stap zet de juiste vraag open op de server,
 * en zolang de scène actief is, tekent ze opnieuw zodra er iemand aanmeldt of antwoordt.
 */
export function liveScene(
  naam: string,
  live: Live,
  stappen: LiveStap[],
  extra: { klik?(sleutel: string | null, stap: number): void; toonAntwoord?(id: number | null, metNaam?: boolean, aan?: boolean): void; getoondAntwoorden?(): number[] } = {},
): Scene {
  let i = 0;
  let stopLuisteren: (() => void) | null = null;
  const scene: Scene = {
    naam,
    enter(richting) {
      i = richting === 1 ? 0 : stappen.length - 1;
      stopLuisteren?.();
      stopLuisteren = live.luister(() => stappen[i].render(false));
      scene.render();
    },
    next() {
      if (i >= stappen.length - 1) return false;
      i++;
      scene.render();
      return true;
    },
    prev() {
      if (i <= 0) return false;
      i--;
      scene.render();
      return true;
    },
    render(direct = false) {
      const stap = stappen[i];
      live.open(stap.vraag, stap.pauzeTot?.() ?? null, stap.bekijk ?? stap.vraag, stap.einde ?? false);
      stap.render(direct);
    },
    verlaat() {
      stopLuisteren?.();
      stopLuisteren = null;
      live.open(null);
    },
    klik: extra.klik ? (sleutel) => extra.klik!(sleutel, i) : undefined,
    toonAntwoord: extra.toonAntwoord,
    getoondAntwoorden: extra.getoondAntwoorden,
    hulp(): Hulp {
      const stap = stappen[i];
      return {
        stap: stap.label,
        volgende: i < stappen.length - 1 ? stappen[i + 1].label : 'volgende scène',
        notities: [...(live.bereikbaar ? [] : ['Server niet bereikbaar: controleer de internetverbinding.']), ...(stap.notities?.() ?? [])],
      };
    },
  };
  return scene;
}

/** Iedere deelnemer heeft een vaste ster. Wie nog niet in beeld was, vliegt binnen vanuit het opgegeven punt. */
function gsmSterren(ctx: Ctx, live: Live, getoond: Set<string>, opmaak: (sleutel: string) => Partial<SterDoel> | null, vanaf?: { x: number; y: number }) {
  const uit: Record<string, SterDoel> = {};
  live.deelnemers.forEach((d) => {
    const sleutel = live.sleutel(d.id);
    if (!sleutel) return;
    const extra = opmaak(sleutel);
    if (!extra) return;
    const i = Number(sleutel.slice(4));
    const doel: SterDoel = { ...vrijePlek(ctx.stage.W, ctx.stage.H, i), size: 34, label: 0, ...extra };
    if (!getoond.has(sleutel) && vanaf) {
      doel.vanaf = vanaf;
      doel.boog = (i % 2 ? 1 : -1) * 0.2;
    }
    getoond.add(sleutel);
    uit[sleutel] = doel;
  });
  return uit;
}

// ---------- aanmelden ----------

export function aanmelden(ctx: Ctx, live: Live): Scene {
  const getoond = new Set<string>();
  const url = `${location.origin}/doe-mee`;
  let qr = '';
  QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#ece9f2', light: '#00000000' } }).then((svg) => {
    qr = svg;
  });

  return liveScene('Aanmelden', live, [
    {
      label: 'QR-code: iedereen meldt zich aan',
      vraag: null,
      render(direct) {
        const { W, H } = ctx.stage;
        const sterren = gsmSterren(ctx, live, getoond, () => ({ alpha: 0.95 }), { x: W / 2, y: H * 0.45 });
        ctx.stage.toon({ achtergrond: 1, sterren, duur: 2 }, direct);
        const aantal = live.deelnemers.length;
        ctx.overlay.toon(
          {
            qr: { regio: 'center', klasse: 'qr', html: qr, stijl: '' },
            url: { regio: 'center', klasse: 'qr-url', html: esc(url.replace(/^https?:\/\//, '')), volgorde: 1 },
            aantal: {
              regio: 'center',
              klasse: 'qr-aantal',
              html: aantal ? `<span class="getal">${aantal}</span> ${aantal === 1 ? 'ster' : 'sterren'} aan de hemel` : 'Scan de code met je gsm',
              volgorde: 2,
            },
          },
          direct,
        );
      },
    },
  ]);
}

// ---------- open vraag ----------

export function openVraag(ctx: Ctx, live: Live, id: string): Scene {
  const vraag = vragen[id];
  const getoond = new Set<string>();
  /** Sterren waarvan het antwoord in beeld staat, in de volgorde waarin ze aangezet werden, met of zonder naam. */
  const zichtbaar = new Map<string, { metNaam: boolean }>();

  /**
   * Zoekt voor elk getoond antwoord een plek onder of boven zijn ster, zonder over een ander antwoord
   * of de vraag bovenaan te vallen. De maten zijn een schatting op basis van het aantal tekens.
   */
  function plaatsTeksten(): Record<string, Vak> {
    const { W, H } = ctx.stage;
    const fs = Math.max(32, Math.round(H * 0.034));
    const maxB = W * 0.28;
    const bezet: { l: number; r: number; t: number; b: number }[] = [{ l: 0, r: W, t: 0, b: H * 0.19 }];
    const vakken: Record<string, Vak> = {};
    for (const [sleutel, { metNaam }] of zichtbaar) {
      const antwoord = live.antwoordVan(sleutel);
      if (!antwoord) continue;
      const tekst = String(antwoord.waarde);
      const ster = vrijePlek(W, H, Number(sleutel.slice(4)));
      const breed = Math.min(maxB, tekst.length * fs * 0.48 + 24);
      const hoog = Math.ceil((tekst.length * fs * 0.48) / maxB) * fs * 1.3 + (metNaam ? fs * 0.9 : 0) + 12;
      const x = Math.min(Math.max(ster.x, breed / 2 + 24), W - breed / 2 - 24);
      const kandidaten = [ster.y + 30, ster.y - 30 - hoog, ster.y + 30 + hoog * 0.6, ster.y - 30 - hoog * 1.6];
      const vrij = (t: number) => t > H * 0.19 && t + hoog < H * 0.97 && !bezet.some((o) => x - breed / 2 < o.r && x + breed / 2 > o.l && t < o.b && t + hoog > o.t);
      const top = kandidaten.find(vrij) ?? kandidaten[0];
      bezet.push({ l: x - breed / 2, r: x + breed / 2, t: top, b: top + hoog });
      const naam = metNaam ? `<span class="wie">${esc(antwoord.naam)}</span>` : '';
      vakken[`antwoord-${sleutel}`] = {
        regio: 'abs',
        klasse: 'ster-tekst',
        html: `${naam}<span class="zin">${esc(tekst)}</span>`,
        stijl: `left:${x}px;top:${top}px;width:${breed}px`,
        delay: 0.15,
      };
    }
    return vakken;
  }

  function render(direct: boolean) {
    const sterren = gsmSterren(ctx, live, getoond, (sleutel) => {
      const antwoord = live.antwoordVan(sleutel);
      if (!antwoord) return { alpha: 0.35, size: 28 };
      return zichtbaar.has(sleutel) ? { kleur: 'goud', size: 56, alpha: 1 } : { kleur: 'goud', size: 42, alpha: 1, puls: 0.4 };
    });
    ctx.stage.toon({ achtergrond: 1, sterren, duur: 1.2 }, direct);
    ctx.overlay.toon(
      {
        vraag: { regio: 'top', klasse: 'vraag-titel', html: esc(vraag.tekst ?? '') },
        ...(vraag.uitleg ? { hulpzin: { regio: 'top' as const, klasse: 'hulpzin', html: esc(vraag.uitleg), volgorde: 1 } } : {}),
        teller: { regio: 'top', klasse: 'telling', html: `${live.antwoorden.length} van ${live.deelnemers.length} antwoordden`, volgorde: 2 },
        ...plaatsTeksten(),
      },
      direct,
    );
  }

  return liveScene(
    vraag.tekst ?? id,
    live,
    [{ label: 'Antwoorden komen binnen; klik op gouden sterren om ze te tonen', vraag: id, render: (direct) => render(direct) }],
    {
      klik(sleutel) {
        if (!sleutel || !sleutel.startsWith('gsm:') || !live.antwoordVan(sleutel)) return;
        if (zichtbaar.has(sleutel)) zichtbaar.delete(sleutel);
        else zichtbaar.set(sleutel, { metNaam: false });
        render(false);
      },
      toonAntwoord(antwoordId, metNaam = false, aan = true) {
        if (antwoordId === null) {
          zichtbaar.clear();
        } else {
          const antwoord = live.antwoorden.find((a) => a.id === antwoordId);
          const sleutel = antwoord ? live.sleutel(antwoord.deelnemer) : null;
          if (sleutel && aan) zichtbaar.set(sleutel, { metNaam });
          if (sleutel && !aan) zichtbaar.delete(sleutel);
        }
        render(false);
      },
      getoondAntwoorden() {
        return [...zichtbaar.keys()].map((k) => live.antwoordVan(k)?.id).filter((i): i is number => i !== undefined);
      },
    },
  );
}

// ---------- waar of niet waar ----------

export function quiz(ctx: Ctx, live: Live, naam: string, ids: string[]): Scene {
  const getoond = new Set<string>();
  const stappen: LiveStap[] = [];

  for (const id of ids) {
    const vraag = vragen[id];
    const opties = vraag.opties ?? [];
    const render = (onthul: boolean) => (direct: boolean) => {
      const { W, H } = ctx.stage;
      const groepen = opties.map((_, o) => live.antwoorden.filter((a) => Number(a.waarde) === o).map((a) => live.sleutel(a.deelnemer)!).filter(Boolean));
      const pos = kolommen(W, H, groepen, 300 + ids.indexOf(id), [H * 0.34, H * 0.78]);
      const sterren = gsmSterren(ctx, live, getoond, (sleutel) => {
        if (!pos[sleutel]) return null;
        const juist = groepen[vraag.juist ?? -1]?.includes(sleutel);
        if (!onthul) return { ...pos[sleutel], alpha: 1 };
        return juist ? { ...pos[sleutel], kleur: 'goud', size: 44 } : { ...pos[sleutel], alpha: 0.35 };
      }, { x: W / 2, y: H * 0.1 });
      ctx.stage.toon({ achtergrond: 0.8, sterren, duur: 1.4 }, direct);

      const vakken: Record<string, Vak> = {
        vraag: { regio: 'top', klasse: 'vraag-titel', html: `<span data-pas>${esc(vraag.tekst ?? '')}</span>`, regels: 2 },
      };
      opties.forEach((optie, o) => {
        const isJuist = onthul && o === vraag.juist;
        vakken[`optie${o}`] = {
          regio: 'abs',
          klasse: `groep${onthul && !isJuist ? ' gedimd' : ''}${isJuist ? ' juist' : ''}`,
          html: `${esc(optie)} <span class="aantal">${groepen[o].length}</span>`,
          stijl: `left:${(W / opties.length) * (o + 0.5)}px;top:${H * 0.24}px`,
        };
      });
      if (onthul && vraag.uitleg) vakken.uitleg = { regio: 'bottom', klasse: 'uitleg', html: `<span data-pas>${esc(vraag.uitleg)}</span>`, regels: 2, delay: 0.6 };
      ctx.overlay.toon(vakken, direct);
    };
    stappen.push({ label: `${vraag.tekst}`, vraag: id, render: render(false) });
    stappen.push({ label: 'Juiste antwoord tonen', vraag: null, bekijk: id, render: render(true), notities: () => (vraag.bron ? [`Bron: ${vraag.bron}`] : []) });
  }
  return liveScene(naam, live, stappen);
}

// ---------- getallenlijn: raad het getal en de schuifbalk ----------

function mooieStap(bereik: number): number {
  const ruw = bereik / 5;
  const macht = Math.pow(10, Math.floor(Math.log10(ruw)));
  return [1, 2, 2.5, 5, 10].map((f) => f * macht).find((s) => s >= ruw) ?? ruw;
}

export function getallenlijn(ctx: Ctx, live: Live, id: string): Scene {
  const vraag = vragen[id];
  const getoond = new Set<string>();
  const nf = new Intl.NumberFormat('nl-BE');

  const render = (onthul: boolean) => (direct: boolean) => {
    const { W, H } = ctx.stage;
    const waarden = live.antwoorden.map((a) => Number(a.waarde));
    const min = vraag.min ?? 0;
    const doelen = [...(vraag.antwoord !== undefined ? [vraag.antwoord] : []), ...(vraag.markeringen ?? []).map((m) => m.waarde)];
    // Bij een gok schaalt de lijn mee met de antwoorden, bij een schuifbalk ligt ze vast.
    const max = vraag.type === 'schuif' ? vraag.max ?? 100 : Math.min(vraag.max ?? Infinity, Math.max(...waarden, ...doelen.map((d) => d * 1.6), 10));
    const links = W * 0.08;
    const breed = W * 0.84;
    const xVan = (v: number) => links + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * breed;
    const lijnY = H * 0.7;

    // Gelijke of bijna gelijke antwoorden stapelen zich op, zoals bolletjes op een telraam.
    const stapels = new Map<number, number>();
    const sterren = gsmSterren(ctx, live, getoond, (sleutel) => {
      const antwoord = live.antwoordVan(sleutel);
      if (!antwoord) return null;
      const x = xVan(Number(antwoord.waarde));
      const vak = Math.round(x / 30);
      const hoogte = stapels.get(vak) ?? 0;
      stapels.set(vak, hoogte + 1);
      return { x, y: lijnY - 34 - hoogte * 34, size: 38, alpha: onthul ? 0.7 : 1 };
    }, { x: W / 2, y: -40 });
    ctx.stage.toon({ achtergrond: 0.8, sterren, duur: 1.4 }, direct);

    const stap = mooieStap(max - min);
    const ticks: number[] = [];
    for (let t = Math.ceil(min / stap) * stap; t <= max + 1e-9; t += stap) ticks.push(t);
    const eenheid = vraag.eenheid ? ` ${vraag.eenheid}` : '';
    const vakken: Record<string, Vak> = {
      vraag: { regio: 'top', klasse: 'vraag-titel', html: `<span data-pas>${esc(vraag.tekst ?? '')}</span>`, regels: 2 },
      teller: { regio: 'top', klasse: 'telling', html: `${live.antwoorden.length} van ${live.deelnemers.length} antwoordden`, volgorde: 1 },
      lijn: {
        regio: 'abs',
        klasse: 'getallenlijn',
        html: ticks.map((t) => `<span class="tick" style="left:${xVan(t) - links}px">${nf.format(t)}</span>`).join(''),
        stijl: `left:${links}px;top:${lijnY}px;width:${breed}px`,
      },
    };
    if (onthul) {
      const markeringen = vraag.markeringen ?? (vraag.antwoord !== undefined ? [{ waarde: vraag.antwoord, label: `${nf.format(vraag.antwoord)}${eenheid}` }] : []);
      markeringen.forEach((m, i) => {
        vakken[`markering${i}`] = {
          regio: 'abs',
          klasse: 'markering',
          html: `<span class="streep"></span><span class="tekst">${esc(m.label)}${vraag.markeringen ? ` · ${m.waarde}${eenheid}` : ''}</span>`,
          stijl: `left:${xVan(m.waarde)}px;top:${H * 0.32 + (i % 2) * maten(H).naam * 1.6}px;height:${lijnY - H * 0.32 - (i % 2) * maten(H).naam * 1.6}px`,
          delay: 0.3 + i * 0.5,
        };
      });
      if (vraag.uitleg) vakken.uitleg = { regio: 'bottom', klasse: 'uitleg', html: `<span data-pas>${esc(vraag.uitleg)}</span>`, regels: 2, delay: 1 };
    }
    ctx.overlay.toon(vakken, direct);
  };

  return liveScene(vraag.tekst ?? id, live, [
    { label: 'Antwoorden komen binnen', vraag: id, render: render(false) },
    { label: vraag.type === 'schuif' ? 'Wetgeving tonen' : 'Juiste antwoord tonen', vraag: null, bekijk: id, render: render(true), notities: () => (vraag.bron ? [`Bron: ${vraag.bron}`] : []) },
  ]);
}

// ---------- pauze ----------

export function pauze(ctx: Ctx, live: Live, minuten: number): Scene {
  let tot = 0;
  let klok = 0;
  return liveScene('Pauze', live, [
    {
      label: `Pauze van ${minuten} minuten`,
      vraag: null,
      pauzeTot: () => {
        if (!tot || tot < Date.now()) tot = Date.now() + minuten * 60_000;
        return tot;
      },
      render(direct) {
        ctx.stage.toon({ achtergrond: 1, sterren: {}, duur: 2.4 }, direct);
        ctx.overlay.toon(
          {
            titel: { regio: 'center', klasse: 'titel', html: 'Pauze' },
            klok: { regio: 'center', klasse: 'klok', html: '<span id="pauzeklok"></span>', volgorde: 1 },
          },
          direct,
        );
        clearInterval(klok);
        const tik = () => {
          const el = document.getElementById('pauzeklok');
          if (!el) return clearInterval(klok);
          const rest = Math.max(0, Math.round((tot - Date.now()) / 1000));
          el.textContent = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
        };
        tik();
        klok = window.setInterval(tik, 1000);
      },
      notities: () => ['→ beëindigt de pauze.'],
    },
  ]);
}
