import { antwoord, CODE_NAAM, klas, stellingen } from '../data';
import { hemel, mulberry32 } from '../layout';
import { esc, Vak } from '../overlay';
import { Ctx, lineair, Scene } from '../scene';
import { SterDoel } from '../stage';

export const MIDDEN = 'midden';

const middenPunt = (ctx: Ctx) => ({ x: ctx.stage.W / 2, y: ctx.stage.H * 0.4 });

/** Dicht bij de ene ster, zodat het uitzoomen in de volgende scène de hemel laat openvallen. */
function cameraOpMidden(ctx: Ctx) {
  const zoom = 1.5;
  const m = middenPunt(ctx);
  return { x: m.x, y: m.y + (ctx.stage.H * 0.1) / zoom, zoom };
}

/** De 13 klassterren op hun vaste plek in de hemel. */
export function klasInHemel(ctx: Ctx, opties: { alpha?: number; label?: number } = {}): Record<string, SterDoel> {
  const pos = hemel(ctx.stage.W, ctx.stage.H);
  const uit: Record<string, SterDoel> = {};
  for (const l of klas) {
    uit[l.naam] = { ...pos[l.naam], alpha: opties.alpha ?? 1, label: opties.label ?? 1 };
  }
  return uit;
}

export function asLabels(ctx: Ctx, alpha = 1): Record<string, Vak> {
  const y = ctx.stage.H * 0.9;
  const stijl = (kant: string) => `${kant}:${ctx.stage.W * 0.04}px;top:${y}px`;
  const html = (tekst: string) => `<span style="opacity:${alpha};transition:opacity 1.2s">${tekst}</span>`;
  return {
    asLinks: { regio: 'abs', klasse: 'as', html: html('← mijn leven is van mij'), stijl: stijl('left') },
    asRechts: { regio: 'abs', klasse: 'as', html: html('het leven behoort ons niet toe →'), stijl: stijl('right') },
  };
}

export function leeg(ctx: Ctx): Scene {
  return lineair('Leeg', [
    {
      label: 'Eén ster en de titel',
      render: ({ direct }) => {
        ctx.stage.toon(
          { achtergrond: 0, sterren: { [MIDDEN]: { ...middenPunt(ctx), size: 70, puls: 0.5 } }, camera: cameraOpMidden(ctx), duur: 2.4 },
          direct,
        );
        ctx.overlay.toon({ titel: { regio: 'center', klasse: 'titel', html: 'Hoe ver mag zelfbeschikking gaan?', delay: 0.8 } }, direct);
      },
    },
  ]);
}

export function jullieHemel(ctx: Ctx): Scene {
  const oneens = klas.filter((l) => antwoord(l, 's1') === 2).map((l) => l.naam);
  const t = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
  klas.forEach((l) => t[antwoord(l, 's1')]++);

  return lineair('Jullie hemel', [
    {
      label: 'De 13 sterren verschijnen',
      render: ({ direct, opkomst }) => {
        const sterren = klasInHemel(ctx);
        // De eerste keer worden ze geboren uit de ene ster: één voor één schieten ze in een boog naar hun plek,
        // terwijl de camera achteruit glijdt en de hemel opengaat. Terugkeren gebeurt in één rustige beweging.
        const tussen = 0.62;
        const start = 1.4;
        const einde = start + klas.length * tussen + 2.6;
        if (opkomst) {
          const rnd = mulberry32(31);
          klas.forEach((l, i) => {
            Object.assign(sterren[l.naam], { delay: start + i * tussen, vanaf: middenPunt(ctx), boog: (rnd() < 0.5 ? -1 : 1) * (0.15 + rnd() * 0.25) });
          });
          sterren[MIDDEN] = { ...middenPunt(ctx), size: 70, startAlpha: 1, alpha: 0, delay: einde - 2.4 };
        }
        ctx.stage.toon(
          { achtergrond: 1, sterren, duur: opkomst ? 2.6 : 1.4, cameraDuur: opkomst ? einde : undefined },
          direct,
        );
        ctx.overlay.toon(
          Object.fromEntries(Object.entries(asLabels(ctx)).map(([k, v]) => [k, { ...v, delay: opkomst ? einde - 1 : 0.3 }])),
          direct,
        );
      },
    },
    {
      label: 'Stelling 1: telling, de oneens-sterren lichten op',
      render: ({ direct }) => {
        const sterren = klasInHemel(ctx, { alpha: 0.4, label: 0.7 });
        for (const naam of oneens) {
          sterren[naam] = { ...sterren[naam], alpha: 1, label: 1, kleur: 'goud', size: 58, nadruk: true };
        }
        ctx.stage.toon({ achtergrond: 0.8, sterren, duur: 1.2 }, direct);
        const telling = ([1, 2, 3] as const).map((c) => `${t[c]} ${CODE_NAAM[c]}`).join('<span class="punt">·</span>');
        ctx.overlay.toon(
          {
            ...asLabels(ctx, 0.5),
            stelling: { regio: 'top', klasse: 'stelling', html: `<span data-pas>${esc(stellingen.s1)}</span>`, regels: 2 },
            telling: { regio: 'top', klasse: 'telling', html: telling, volgorde: 1, delay: 0.6 },
          },
          direct,
        );
      },
    },
  ]);
}

export function achtergrond(ctx: Ctx): Scene {
  return lineair('Achtergrond', [
    {
      label: 'Hemel gedimd tot 20 % (slides of Wooclap)',
      render: ({ direct }) => {
        ctx.stage.toon({ achtergrond: 0.2, sterren: klasInHemel(ctx, { alpha: 0.2 }), duur: 1.4 }, direct);
        ctx.overlay.toon({ ...asLabels(ctx, 0.2) }, direct);
      },
      notities: ['→ brengt de hemel terug (commissie).'],
    },
  ]);
}
