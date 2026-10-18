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
  /** Stand van de cameratelling als die in deze stap loopt, anders null. */
  cameraStand?(): CameraStand | null;
  corrigeerTelling?(zone: number, stap: number): void;
  /** Zet de telling vast (de camera stopt) of geeft ze weer vrij. */
  vergrendelTelling?(aan: boolean): void;
  wisselSpiegel?(): void;
  hulp(): Hulp;
}

export interface CameraStand {
  status: string;
  /** Wat de telling nu toont, per kant (eens, twijfel, oneens). */
  zones: number[];
  /** Wat de camera op dit moment ziet, zonder correctie of uitmiddeling. */
  ruw: number[];
  correctie: number[];
  spiegel: boolean;
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

export class Machine {
  private i = 0;
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

  start() {
    this.huidige.enter(1);
    this.onWissel();
  }

  /** Springt meteen naar een scène, bv. tijdens een repetitie. */
  ga(i: number) {
    if (i === this.i || i < 0 || i >= this.scenes.length) return;
    this.huidige.verlaat?.();
    this.i = i;
    this.huidige.enter(1);
    this.onWissel();
  }

  next() {
    if (!this.huidige.next() && this.i < this.scenes.length - 1) {
      this.huidige.verlaat?.();
      this.i++;
      this.huidige.enter(1);
    }
    this.onWissel();
  }

  prev() {
    if (!this.huidige.prev() && this.i > 0) {
      this.huidige.verlaat?.();
      this.i--;
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
