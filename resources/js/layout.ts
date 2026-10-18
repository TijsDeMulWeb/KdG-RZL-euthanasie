import { antwoord, Code, dossiers, klas, StellingId, zelfbeschikking } from './data';

export interface Pt {
  x: number;
  y: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lettergroottes in px, nooit kleiner dan 32 zodat alles achteraan leesbaar is. */
export function maten(H: number) {
  return {
    naam: Math.max(32, Math.round(H * 0.031)),
    tekst: Math.max(32, Math.round(H * 0.036)),
    titel: Math.max(48, Math.round(H * 0.066)),
  };
}

const meetCanvas = document.createElement('canvas').getContext('2d')!;

function labelBreedte(naam: string, H: number): number {
  meetCanvas.font = `600 ${maten(H).naam}px 'Manrope Variable'`;
  return meetCanvas.measureText(naam).width;
}

interface Doos {
  l: number;
  r: number;
  t: number;
  b: number;
}

/** Anonieme sterren (van gsm's of de camera) hebben geen naamlabel. */
const zonderLabel = (sleutel: string) => sleutel.includes(':');

/** Ruimte die een ster met zijn naamlabel eronder inneemt. */
function doos(p: Pt, naam: string, H: number): Doos {
  if (zonderLabel(naam)) return { l: p.x - 26, r: p.x + 26, t: p.y - 26, b: p.y + 26 };
  const half = Math.max(labelBreedte(naam, H) / 2, 20) + 12;
  return { l: p.x - half, r: p.x + half, t: p.y - 24, b: p.y + 26 + maten(H).naam * 1.25 + 8 };
}

function overlap(a: Doos, b: Doos): number {
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
  const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Plaatst sterren op vaste x (of x binnen een bereik) en een y met seed, zonder dat naamlabels overlappen.
 * Lukt dat niet, dan wint de kandidaat met de kleinste overlap.
 */
function plaats(
  namen: string[],
  H: number,
  rnd: () => number,
  xVan: (naam: string) => [number, number],
  yBereik: [number, number],
  bezet: Doos[] = [],
): Record<string, Pt> {
  const uit: Record<string, Pt> = {};
  const dozen = [...bezet];
  for (const naam of namen) {
    const labelH = zonderLabel(naam) ? 26 : 26 + maten(H).naam * 1.25 + 8;
    const [x0, x1] = xVan(naam);
    let beste: Pt | null = null;
    let besteScore = Infinity;
    for (let i = 0; i < 600 && besteScore > 0; i++) {
      const p = { x: x0 + (x1 - x0) * rnd(), y: yBereik[0] + (yBereik[1] - labelH - yBereik[0]) * rnd() };
      const d = doos(p, naam, H);
      const score = dozen.reduce((s, o) => s + overlap(d, o), 0);
      if (score < besteScore) {
        beste = p;
        besteScore = score;
      }
    }
    uit[naam] = beste!;
    dozen.push(doos(beste!, naam, H));
  }
  return uit;
}

function geschud<T>(lijst: T[], rnd: () => number): T[] {
  const a = [...lijst];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const cache = new Map<string, unknown>();

export function wisCache() {
  cache.clear();
}

function onthoud<T>(sleutel: string, maak: () => T): T {
  if (!cache.has(sleutel)) cache.set(sleutel, maak());
  return cache.get(sleutel) as T;
}

export const HEMEL_MARGE = 0.11;

/** x volgens de zelfbeschikkingsscore (+5 links, -5 rechts), y willekeurig maar vast. */
export function hemel(W: number, H: number): Record<string, Pt> {
  return onthoud(`hemel ${W}x${H}`, () => {
    const rnd = mulberry32(20240513);
    const links = W * HEMEL_MARGE;
    const rechts = W * (1 - HEMEL_MARGE);
    const xVoor = (naam: string) => {
      const score = zelfbeschikking(klas.find((k) => k.naam === naam)!);
      const x = links + ((5 - score) / 10) * (rechts - links);
      return [x, x] as [number, number];
    };
    const namen = geschud(klas.map((k) => k.naam), rnd);
    return plaats(namen, H, rnd, xVoor, [H * 0.27, H * 0.84]);
  });
}

export function dossierPosities(W: number, H: number): Record<string, Pt> {
  return onthoud(`dossiers ${W}x${H}`, () => {
    const uit: Record<string, Pt> = {};
    dossiers.forEach((d, i) => {
      uit[d.id] = { x: W * (0.2 + i * 0.2), y: H * 0.1 };
    });
    return uit;
  });
}

export const GROEP_VOLGORDE: Code[] = [1, 3, 2];

export interface Sterrenbeeld {
  pos: Record<string, Pt>;
  lijnen: [string, string][];
  groepen: { code: Code; x: number }[];
}

/** Drie sterrenbeelden (eens, twijfel, oneens), elk verbonden met een minimaal opspannende boom. */
export function sterrenbeelden(W: number, H: number, s: StellingId): Sterrenbeeld {
  return onthoud(`beeld ${s} ${W}x${H}`, () => {
    const rnd = mulberry32(7919 * Number(s.slice(1)));
    const kolom = W / 3;
    const groepen = GROEP_VOLGORDE.map((code, i) => ({ code, x: kolom * (i + 0.5) }));
    const pos: Record<string, Pt> = {};
    const lijnen: [string, string][] = [];
    for (const g of groepen) {
      const namen = geschud(klas.filter((l) => antwoord(l, s) === g.code).map((l) => l.naam), rnd);
      const marge = 60;
      Object.assign(
        pos,
        plaats(namen, H, rnd, () => [g.x - kolom / 2 + marge + 40, g.x + kolom / 2 - marge - 40], [H * 0.25, H * 0.67]),
      );
      lijnen.push(...boom(namen, pos));
    }
    return { pos, lijnen, groepen };
  });
}

function boom(namen: string[], pos: Record<string, Pt>): [string, string][] {
  if (namen.length < 2) return [];
  const in_ = new Set([namen[0]]);
  const uit: [string, string][] = [];
  while (in_.size < namen.length) {
    let best: [string, string] | null = null;
    let bestD = Infinity;
    for (const a of in_) {
      for (const b of namen) {
        if (in_.has(b)) continue;
        const d = Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y);
        if (d < bestD) {
          bestD = d;
          best = [a, b];
        }
      }
    }
    uit.push(best!);
    in_.add(best![1]);
  }
  return uit;
}

/**
 * Verdeelt sterren over kolommen (bv. eens, twijfel, oneens). Dezelfde sleutels krijgen altijd dezelfde plek,
 * zodat een ster die er al staat niet verspringt als er nieuwe bijkomen.
 */
export function kolommen(W: number, H: number, groepen: string[][], seed: number, yBereik: [number, number]): Record<string, Pt> {
  const kolom = W / groepen.length;
  const pos: Record<string, Pt> = {};
  groepen.forEach((namen, i) => {
    const vast = onthoud(`kolom ${seed} ${i} ${W}x${H}`, () => new Map<string, Pt>());
    for (const naam of namen) {
      if (vast.has(naam)) continue;
      const bezet = [...vast.entries()].filter(([n]) => namen.includes(n)).map(([n, p]) => doos(p, n, H));
      const rnd = mulberry32(seed + i * 101 + [...naam].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
      const p = plaats([naam], H, rnd, () => [kolom * i + 70, kolom * (i + 1) - 70], yBereik, bezet)[naam];
      vast.set(naam, p);
    }
    for (const naam of namen) pos[naam] = vast.get(naam)!;
  });
  return pos;
}

/** Vaste, verspreide plek in de hemel voor een anonieme ster, weg van het midden waar de tekst staat. */
export function vrijePlek(W: number, H: number, index: number): Pt {
  const rnd = mulberry32(9000 + index * 7);
  for (let i = 0; i < 40; i++) {
    const p = { x: W * (0.06 + rnd() * 0.88), y: H * (0.24 + rnd() * 0.5) };
    const inMidden = Math.abs(p.x - W / 2) < W * 0.22 && Math.abs(p.y - H * 0.5) < H * 0.12;
    if (!inMidden) return p;
  }
  return { x: W * 0.1, y: H * 0.3 };
}

/**
 * Zoekt voor een ster die naar een nieuwe x verschuift een y waar zijn naam niets overlapt,
 * zo dicht mogelijk bij de oude y. Zo blijft de beweging leesbaar als een verschuiving opzij.
 */
export function vrijeY(H: number, naam: string, x: number, voorkeur: number, anderen: Record<string, Pt>, bereik: [number, number] = [H * 0.27, H * 0.84]): number {
  const labelH = 26 + maten(H).naam * 1.25 + 8;
  const bezet = Object.entries(anderen)
    .filter(([n]) => n !== naam)
    .map(([n, p]) => doos(p, n, H));
  let beste = voorkeur;
  let besteScore = Infinity;
  for (let stap = 0; stap < 120; stap++) {
    // Afwisselend boven en onder de oude plek zoeken, steeds iets verder.
    const y = voorkeur + (stap % 2 ? -1 : 1) * Math.ceil(stap / 2) * 8;
    if (y < bereik[0] || y > bereik[1] - labelH) continue;
    const d = doos({ x, y }, naam, H);
    const score = bezet.reduce((s, o) => s + overlap(d, o), 0);
    if (score < besteScore) {
      beste = y;
      besteScore = score;
      if (score === 0) break;
    }
  }
  return beste;
}
