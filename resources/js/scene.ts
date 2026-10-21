import type { Overlay } from './overlay';
import type { Stage } from './stage';

export interface Hulp {
  stap: string;
  volgende: string;
  notities?: string[];
}

export interface Scene {
  naam: string;
  /** richting 1: van voren binnen (eerste substap), -1: van achteren (laatste substap). */
  enter(richting: 1 | -1): void;
  /** true als de scène zelf een substap verder kon, false om naar de volgende scène te gaan. */
  next(): boolean;
  prev(): boolean;
  /** Tekent de huidige toestand opnieuw, bv. na het wijzigen van de venstergrootte. */
  render(direct?: boolean): void;
  klik?(sleutel: string | null): void;
  /** Extra toetsen voor deze scène; true als de toets gebruikt is. */
  toets?(event: KeyboardEvent): boolean;
  /** Opruimen bij het verlaten, bv. een vraag op de gsm's sluiten. */
  verlaat?(): void;
  /** Toont een antwoord van een gsm groot op de beamer (null = verbergen), op vraag van het presentatorscherm. */
  /** id null = alles verbergen; aan false = dit ene antwoord weer verbergen. */
  toonAntwoord?(id: number | null, metNaam?: boolean, aan?: boolean): void;
  getoondAntwoorden?(): number[];
  /** Wereldkaart: een land in de kijker zetten (null = terug naar de hele kaart). */
  kiesLand?(iso: string | null): void;
  /** Eigen toestand die een herladen moet overleven (bv. tellingen, welke dossiers besproken zijn). */
  bewaar?(): unknown;
  /** Zet een bewaarde toestand terug. Geeft true als de scène daarmee ook haar positie terug heeft. */
  herstelToestand?(toestand: unknown): boolean;
  gekozenLand?(): string | null;
  /** Stand van de manuele telling (gaan staan) als die in deze stap loopt, anders null. */
  tellingStand?(): TellingStand | null;
  corrigeerTelling?(zone: number, stap: number): void;
  /** Zet de telling vast (de camera stopt) of geeft ze weer vrij. */
  vergrendelTelling?(aan: boolean): void;
  hulp(): Hulp;
}

export interface TellingStand {
  /** Hoeveel mensen er per kant staan (eens, twijfel, oneens). */
  zones: number[];
  vast: boolean;
}

export interface Ctx {
  stage: Stage;
  overlay: Overlay;
}

export interface Stap {
  label: string;
  render(opties: { direct: boolean; opkomst: boolean }): void;
  notities?: string[] | (() => string[]);
}

export interface LineairExtra {
  verlaat?(): void;
  klik?(sleutel: string | null, stap: number): void;
  toets?(event: KeyboardEvent, stap: number): boolean;
}

/** Scène met een vaste reeks substappen. Elke stap tekent het volledige beeld, dus terugkeren werkt vanzelf. */
export function lineair(naam: string, stappen: Stap[], extra: LineairExtra = {}): Scene {
  let i = 0;
  let opkomst = false;
  const scene: Scene = {
    naam,
    enter(richting) {
      i = richting === 1 ? 0 : stappen.length - 1;
      opkomst = richting === 1;
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
      stappen[i].render({ direct, opkomst: opkomst && !direct });
      opkomst = false;
    },
    hulp() {
      return {
        stap: stappen[i].label,
        volgende: i < stappen.length - 1 ? stappen[i + 1].label : 'volgende scène',
        notities: typeof stappen[i].notities === 'function' ? (stappen[i].notities as () => string[])() : (stappen[i].notities as string[] | undefined),
      };
    },
    verlaat: extra.verlaat,
    klik: extra.klik ? (sleutel) => extra.klik!(sleutel, i) : undefined,
    toets: extra.toets ? (event) => extra.toets!(event, i) : undefined,
  };
  return scene;
}

/**
 * Waar de les staat: welke scène, en hoeveel stappen vanaf het begin of het einde van die scène.
 * Een scène waar je met 'vorige' in komt, start op haar laatste stap; daarom tellen we dan vanaf het einde.
 */
export interface Positie {
  scene: number;
  vanaf: 'begin' | 'eind';
  stappen: number;
}

export class Machine {
  private i = 0;
  private positieInScene: Omit<Positie, 'scene'> = { vanaf: 'begin', stappen: 0 };
  onWissel: () => void = () => {};

  constructor(private scenes: Scene[]) {}

  get huidige(): Scene {
    return this.scenes[this.i];
  }

  get nummer(): number {
    return this.i + 1;
  }

  get aantal(): number {
    return this.scenes.length;
  }

  get volgendeScene(): Scene | null {
    return this.scenes[this.i + 1] ?? null;
  }

  get namen(): string[] {
    return this.scenes.map((s) => s.naam);
  }

  get positie(): Positie {
    return { scene: this.i, ...this.positieInScene };
  }

  /** Toestanden van alle scènes die er een bijhouden, per scène-index. */
  get toestanden(): Record<number, unknown> {
    const uit: Record<number, unknown> = {};
    this.scenes.forEach((scene, i) => {
      if (scene.bewaar) uit[i] = scene.bewaar();
    });
    return uit;
  }

  start() {
    this.huidige.enter(1);
    this.onWissel();
  }

  /**
   * Zet de les na een herladen terug op exact dezelfde plek. De stappen worden opnieuw doorlopen,
   * en daarna wordt alles in één keer getekend, zonder animaties.
   */
  herstel(positie: Positie, toestanden: Record<number, unknown> = {}) {
    if (positie.scene < 0 || positie.scene >= this.scenes.length) return this.start();
    let eigenPositie = false;
    for (const [index, toestand] of Object.entries(toestanden)) {
      const herstelde = this.scenes[Number(index)]?.herstelToestand?.(toestand) ?? false;
      if (Number(index) === positie.scene) eigenPositie = herstelde;
    }
    this.i = positie.scene;
    this.huidige.enter(1);
    if (!eigenPositie) {
      if (positie.vanaf === 'eind') {
        for (let n = 0; n < 500 && this.huidige.next(); n++);
        for (let n = 0; n < positie.stappen; n++) this.huidige.prev();
      } else {
        for (let n = 0; n < positie.stappen; n++) this.huidige.next();
      }
    }
    this.positieInScene = { vanaf: positie.vanaf, stappen: positie.stappen };
    this.huidige.render(true);
    this.onWissel();
  }

  /** Springt meteen naar een scène, bv. tijdens een repetitie. */
  ga(i: number) {
    if (i === this.i || i < 0 || i >= this.scenes.length) return;
    this.huidige.verlaat?.();
    this.i = i;
    this.positieInScene = { vanaf: 'begin', stappen: 0 };
    this.huidige.enter(1);
    this.onWissel();
  }

  next() {
    if (this.huidige.next()) {
      this.positieInScene.stappen += this.positieInScene.vanaf === 'begin' ? 1 : -1;
    } else if (this.i < this.scenes.length - 1) {
      this.huidige.verlaat?.();
      this.i++;
      this.positieInScene = { vanaf: 'begin', stappen: 0 };
      this.huidige.enter(1);
    }
    this.onWissel();
  }

  prev() {
    if (this.huidige.prev()) {
      this.positieInScene.stappen += this.positieInScene.vanaf === 'begin' ? -1 : 1;
    } else if (this.i > 0) {
      this.huidige.verlaat?.();
      this.i--;
      this.positieInScene = { vanaf: 'eind', stappen: 0 };
      this.huidige.enter(-1);
    }
    this.onWissel();
  }

  toets(event: KeyboardEvent): boolean {
    const gebruikt = this.huidige.toets?.(event) ?? false;
    if (gebruikt) this.onWissel();
    return gebruikt;
  }

  klik(sleutel: string | null) {
    this.huidige.klik?.(sleutel);
    this.onWissel();
  }
}
