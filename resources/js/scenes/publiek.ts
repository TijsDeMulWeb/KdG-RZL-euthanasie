import { publieksvragen } from '../data';
import { esc, Vak } from '../overlay';
import { Ctx, lineair, Scene } from '../scene';
import { klasInHemel } from './opening';

/** De vragen die medestudenten vooraf instuurden, één per klik, zichtbaar gebruikt in het gesprek. */
export function publiek(ctx: Ctx, ids: number[]): Scene {
  const lijst = ids.length ? ids.map((id) => publieksvragen.find((v) => v.id === id)).filter((v) => v !== undefined) : publieksvragen;

  if (!lijst.length) {
    return lineair('Publieksvragen', [
      {
        label: 'Nog geen publieksvragen in het beheer',
        render: ({ direct }) => {
          ctx.stage.toon({ achtergrond: 0.5, sterren: klasInHemel(ctx, { alpha: 0.2, label: 0 }) }, direct);
          ctx.overlay.toon({ leeg: { regio: 'bottom', klasse: 'melding', html: 'Voeg de publieksvragen toe in het beheer.' } }, direct);
        },
      },
    ]);
  }

  return lineair(
    'Publieksvragen',
    lijst.map((vraag, i) => ({
      label: `Vraag ${i + 1}: ${vraag.vraag.slice(0, 60)}${vraag.vraag.length > 60 ? '…' : ''}`,
      notities: [lijst[i + 1] ? `Daarna: ${lijst[i + 1].vraag}` : 'Laatste publieksvraag.'],
      render: ({ direct }) => {
        ctx.stage.toon({ achtergrond: 0.6, sterren: klasInHemel(ctx, { alpha: 0.22, label: 0 }), duur: 1.4 }, direct);
        const vakken: Record<string, Vak> = {
          label: {
            regio: 'theorie',
            klasse: 'publiek-label',
            html: `Publieksvraag ${i + 1} van ${lijst.length}${vraag.invalshoek ? ` · ${esc(vraag.invalshoek)}` : ''}`,
          },
          vraag: { regio: 'theorie', klasse: 'publiek-vraag', html: `<span data-pas>${esc(vraag.vraag)}</span>`, volgorde: 1, regels: 4 },
        };
        if (vraag.van) vakken.van = { regio: 'theorie', klasse: 'publiek-van', html: `Vraag van ${esc(vraag.van)}`, volgorde: 2, delay: 0.6 };
        ctx.overlay.toon(vakken, direct);
      },
    })),
  );
}
