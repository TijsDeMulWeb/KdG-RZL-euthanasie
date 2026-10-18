import { Antwoord, api } from './api';

export interface Deelnemer {
  id: number;
  naam: string;
}

export const MAX_GSM = 40;

/** De verbinding van de beamer met de server: welke vraag open staat, wie meedoet en wat ze antwoorden. */
export class Live {
  deelnemers: Deelnemer[] = [];
  antwoorden: Antwoord[] = [];
  vraag: string | null = null;
  /** Van welke vraag de antwoorden getoond worden; kan blijven staan nadat de vraag gesloten is. */
  bekijk: string | null = null;
  pauzeTot: number | null = null;
  einde = false;
  bereikbaar = true;
  private luisteraars = new Set<() => void>();
  private vorige = '';

  constructor() {
    this.peil();
    window.setInterval(() => this.peil(), 1500);
  }

  luister(f: () => void): () => void {
    this.luisteraars.add(f);
    return () => this.luisteraars.delete(f);
  }

  /**
   * Opent een vraag op de gsm's, of sluit alles met null. Met pauzeTot tonen de gsm's een aftelklok.
   * `bekijk` houdt de antwoorden van een gesloten vraag in beeld, bv. om het juiste antwoord te onthullen.
   */
  async open(vraag: string | null, pauzeTot: number | null = null, bekijk: string | null = vraag, einde = false): Promise<void> {
    if (bekijk !== this.bekijk) {
      this.bekijk = bekijk;
      this.antwoorden = [];
      this.meld();
    }
    if (vraag === this.vraag && pauzeTot === this.pauzeTot && einde === this.einde) return;
    this.vraag = vraag;
    this.pauzeTot = pauzeTot;
    this.einde = einde;
    try {
      await api('PUT', '/presentator/actieve-vraag', { vraag, pauzeTot, einde });
      this.bereikbaar = true;
    } catch {
      this.bereikbaar = false;
    }
    this.peil();
  }

  /** Vaste sterplek per deelnemer, op volgorde van aanmelden. */
  sleutel(deelnemer: number): string | null {
    const i = this.deelnemers.findIndex((d) => d.id === deelnemer);
    return i >= 0 && i < MAX_GSM ? `gsm:${i}` : null;
  }

  antwoordVan(sleutel: string): Antwoord | undefined {
    return this.antwoorden.find((a) => this.sleutel(a.deelnemer) === sleutel);
  }

  private async peil() {
    try {
      const vraag = this.bekijk;
      const [deelnemers, antwoorden] = await Promise.all([
        api<Deelnemer[]>('GET', '/presentator/deelnemers'),
        vraag ? api<Antwoord[]>('GET', `/presentator/antwoorden?vraag=${encodeURIComponent(vraag)}`) : Promise.resolve([]),
      ]);
      // Een antwoord van een vraag die intussen gesloten werd, telt niet meer mee.
      if (vraag !== this.bekijk) return;
      this.deelnemers = deelnemers;
      this.antwoorden = antwoorden;
      this.bereikbaar = true;
    } catch {
      this.bereikbaar = false;
    }
    this.meld();
  }

  private meld() {
    const nu = JSON.stringify([this.deelnemers, this.antwoorden, this.vraag, this.bekijk, this.bereikbaar]);
    if (nu === this.vorige) return;
    this.vorige = nu;
    this.luisteraars.forEach((f) => f());
  }
}
