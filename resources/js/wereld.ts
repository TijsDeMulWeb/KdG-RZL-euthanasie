import { geoArea, geoCentroid, geoNaturalEarth1, geoPath, GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import wereldJson from 'world-atlas/countries-110m.json';

export interface WereldPunt {
  x: number;
  y: number;
  iso: string;
}

export interface LandVorm {
  iso: string;
  /** Middelpunt van het grootste stuk land, zodat bv. Frans-Guyana Frankrijk niet naar de oceaan trekt. */
  midden: { x: number; y: number };
  breedte: number;
}

type LandFeature = Feature<Polygon | MultiPolygon, { name: string }>;

const topo = wereldJson as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;

/** Alle landen behalve Antarctica, dat de kaart onnodig groot zou maken. */
export const landenGeo = (feature(topo, topo.objects.countries) as FeatureCollection<Polygon | MultiPolygon, { name: string }>).features.filter(
  (f) => f.id !== '010',
) as LandFeature[];

function grootsteStuk(f: LandFeature): Feature<Polygon> {
  if (f.geometry.type === 'Polygon') return f as Feature<Polygon>;
  const stukken = f.geometry.coordinates.map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } }) as Feature<Polygon>);
  return stukken.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
}

export function projectie(breedte: number, hoogte: number, marge: [number, number, number, number]): GeoProjection {
  const [l, t, r, b] = marge;
  return geoNaturalEarth1().fitExtent(
    [
      [l, t],
      [breedte - r, hoogte - b],
    ],
    { type: 'FeatureCollection', features: landenGeo },
  );
}

const cache = new Map<string, { punten: WereldPunt[]; vormen: Map<string, LandVorm> }>();

/**
 * Zet de wereldkaart om in sterren. Elk land wordt in een eigen kleur op een verborgen canvas getekend;
 * een raster van punten leest daarna af in welk land het valt. Zo kost het geen dure geometrie per punt.
 */
export function wereldPunten(W: number, H: number): { punten: WereldPunt[]; vormen: Map<string, LandVorm> } {
  const sleutel = `${W}x${H}`;
  const bewaard = cache.get(sleutel);
  if (bewaard) return bewaard;

  const proj = projectie(W, H, [W * 0.04, H * 0.15, W * 0.04, H * 0.1]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const pad = geoPath(proj, ctx);
  landenGeo.forEach((f, i) => {
    // Index in rood, een controlewaarde in groen: gemengde randpixels vallen zo weg.
    ctx.fillStyle = `rgb(${i + 1}, ${(i * 37) % 256}, 0)`;
    ctx.beginPath();
    pad(f);
    ctx.fill();
  });
  const pixels = ctx.getImageData(0, 0, W, H).data;

  const punten: WereldPunt[] = [];
  const afstand = Math.max(6, Math.round(W / 240));
  let zaad = 7;
  const toeval = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let y = afstand / 2; y < H; y += afstand) {
    for (let x = afstand / 2; x < W; x += afstand) {
      const px = Math.round(x + toeval() * afstand * 0.6);
      const py = Math.round(y + toeval() * afstand * 0.6);
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const o = (py * W + px) * 4;
      const i = pixels[o] - 1;
      if (i < 0 || i >= landenGeo.length || pixels[o + 1] !== (i * 37) % 256) continue;
      punten.push({ x: px, y: py, iso: String(landenGeo[i].id) });
    }
  }

  const vormen = new Map<string, LandVorm>();
  for (const f of landenGeo) {
    const iso = String(f.id);
    const [mx, my] = proj(geoCentroid(grootsteStuk(f))) ?? [0, 0];
    const [[x0], [x1]] = geoPath(proj).bounds(grootsteStuk(f));
    vormen.set(iso, { iso, midden: { x: mx, y: my }, breedte: Math.max(4, x1 - x0) });
    // Kleine landen (Luxemburg) krijgen toch een paar sterren.
    if (punten.filter((p) => p.iso === iso).length < 3) {
      for (let k = 0; k < 3; k++) punten.push({ x: mx + toeval() * 6, y: my + toeval() * 6, iso });
    }
  }

  const resultaat = { punten, vormen };
  cache.set(sleutel, resultaat);
  return resultaat;
}
