import { api, VraagDef } from './api';

export type StellingId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
export type Code = 1 | 2 | 3;

export const CODE_NAAM: Record<Code, string> = { 1: 'eens', 2: 'oneens', 3: 'twijfel' };

export interface Leerling {
  naam: string;
  antwoorden: Record<StellingId, Code>;
  citaten: Partial<Record<StellingId, string>>;
  gevoelig?: StellingId[];
  tegenstrijdig?: Partial<Record<StellingId, { bedoeld: Code; uitleg: string }>>;
  opgelet?: string;
}

export interface Dossier {
  id: string;
  stelling: StellingId;
  titel: string;
  kaart: string[];
  onthulling: string;
  duel: [string, string];
  tegenspraak?: boolean;
}

export interface Kaart {
  id: string;
  titel: string;
  punten: string[];
  bron: string;
  aanvullen: string[];
}

export interface Publieksvraag {
  id: number;
  vraag: string;
  van: string | null;
  invalshoek: string | null;
}

export interface Land {
  iso: string;
  naam: string;
  status: 'beide' | 'euthanasie' | 'hulp' | 'niet_in_werking';
  jaar: number | null;
  gedeeltelijk: boolean;
  voorwaarden: string[];
  bron: string | null;
}

export interface LesStap {
  type: string;
  instellingen: Record<string, unknown> | null;
}

interface Inhoud {
  stellingen: Record<StellingId, string>;
  klas: Leerling[];
  dossiers: Dossier[];
  vragen: VraagDef[];
  kaarten: Kaart[];
  publieksvragen: Publieksvraag[];
  landen: Land[];
  les: LesStap[];
}

// De inhoud komt uit het beheerplatform (database). `laadInhoud` vult deze bindingen bij het opstarten.
export let stellingen = {} as Record<StellingId, string>;
export let klas: Leerling[] = [];
export let dossiers: Dossier[] = [];
export let vragen: Record<string, VraagDef> = {};
export let kaarten: Kaart[] = [];
export let publieksvragen: Publieksvraag[] = [];
export let landen: Land[] = [];
export let les: LesStap[] = [];

export async function laadInhoud(): Promise<void> {
  const inhoud = await api<Inhoud>('GET', '/presentator/inhoud');
  stellingen = inhoud.stellingen;
  klas = inhoud.klas;
  dossiers = inhoud.dossiers;
  vragen = Object.fromEntries(inhoud.vragen.map((v) => [v.id, v]));
  kaarten = inhoud.kaarten;
  publieksvragen = inhoud.publieksvragen;
  landen = inhoud.landen;
  les = inhoud.les;
}

export const STELLING_NR: Record<StellingId, number> = { s1: 1, s2: 2, s3: 3, s4: 4, s5: 5, s6: 6 };

/** Het antwoord zoals bedoeld: waar het cijfer en de uitleg botsen, telt de uitleg. */
export function antwoord(l: Leerling, s: StellingId): Code {
  return l.tegenstrijdig?.[s]?.bedoeld ?? l.antwoorden[s];
}

export function isGevoelig(l: Leerling, s: StellingId): boolean {
  return l.gevoelig?.includes(s) ?? false;
}

/** Zelfbeschikkingsscore over s1 tot s5: eens = +1, oneens = -1, twijfel = 0; bij s2 omgekeerd. */
export function zelfbeschikking(l: Leerling): number {
  const waarde: Record<Code, number> = { 1: 1, 2: -1, 3: 0 };
  return (['s1', 's2', 's3', 's4', 's5'] as StellingId[]).reduce((som, s) => {
    const w = waarde[antwoord(l, s)];
    return som + (s === 's2' ? -w : w);
  }, 0);
}

export function telling(s: StellingId): Record<Code, number> {
  const t: Record<Code, number> = { 1: 0, 2: 0, 3: 0 };
  klas.forEach((l) => t[antwoord(l, s)]++);
  return t;
}

export function leerling(naam: string): Leerling {
  const l = klas.find((k) => k.naam === naam);
  if (!l) throw new Error(`Onbekende leerling: ${naam}`);
  return l;
}
