const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

export async function api<T>(methode: string, url: string, body?: unknown): Promise<T> {
  const antwoord = await fetch(url, {
    method: methode,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrf(),
    },
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!antwoord.ok) throw new Error(`${antwoord.status}`);
  return antwoord.json() as Promise<T>;
}

export interface VraagDef {
  id: string;
  type: 'open' | 'keuze' | 'getal' | 'schuif' | 'stelling' | 'herstemming';
  stellingen?: string[];
  tekst?: string;
  stelling?: string;
  opties?: string[];
  juist?: number;
  min?: number;
  max?: number;
  eenheid?: string;
  antwoord?: number;
  uitleg?: string;
  bron?: string;
  maxLengte?: number;
  markeringen?: { waarde: number; label: string }[];
}

export interface Antwoord {
  id: number;
  deelnemer: number;
  naam: string;
  vraag: string;
  waarde: string | number | Record<string, number>;
}
