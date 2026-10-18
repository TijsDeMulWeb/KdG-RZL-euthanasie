import { kaarten } from '../data';
import { esc, Vak } from '../overlay';
import { Ctx, lineair, Scene } from '../scene';
import { klasInHemel } from './opening';

/** Een theoriekaart: de hemel dimt en per klik komt er een punt bij. */
export function theorie(ctx: Ctx, id: string): Scene {
  const kaart = kaarten.find((k) => k.id === id)!;
  const notities = () => [`Bron: ${kaart.bron}`, ...kaart.aanvullen.map((a) => `Nog aanvullen: ${a}`)];

  return lineair(
    `Theorie: ${kaart.titel}`,
    kaart.punten.map((punt, i) => ({
      label: `Punt ${i + 1}: ${punt.slice(0, 60)}${punt.length > 60 ? '…' : ''}`,
      notities,
      render: ({ direct }) => {
        ctx.stage.toon({ achtergrond: 0.45, sterren: klasInHemel(ctx, { alpha: 0.18, label: 0 }), duur: 1.4 }, direct);
        const vakken: Record<string, Vak> = {
          titel: { regio: 'theorie', klasse: 'theorie-titel', html: esc(kaart.titel), delay: 0.2 },
        };
        kaart.punten.slice(0, i + 1).forEach((p, j) => {
          vakken[`punt${j}`] = { regio: 'theorie', klasse: `theorie-punt${j < i ? ' gelezen' : ''}`, html: esc(p), volgorde: j + 1, delay: j === i ? 0.3 : 0 };
        });
        ctx.overlay.toon(vakken, direct);
      },
    })),
  );
}
