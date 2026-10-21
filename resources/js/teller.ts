/**
 * Telt hoeveel mensen er links (eens), in het midden (twijfel) en rechts (oneens) staan.
 * De presentator telt zelf met + en - op het presentatorscherm: een webcam bleek 5 tot 10 mensen
 * in een lokaal niet betrouwbaar te herkennen.
 */
export class Teller {
  private telling: [number, number, number] = [0, 0, 0];
  private luisteraars = new Set<() => void>();

  get zones(): [number, number, number] {
    return [...this.telling];
  }

  luister(f: () => void): () => void {
    this.luisteraars.add(f);
    return () => this.luisteraars.delete(f);
  }

  /** Begint vanaf een eerder bewaarde telling (bv. bij terugkeren naar dit dossier). */
  tel(vanaf: [number, number, number]): void {
    this.telling = [...vanaf];
  }

  corrigeer(zone: number, stap: number): void {
    this.telling[zone] = Math.max(0, this.telling[zone] + stap);
    this.luisteraars.forEach((f) => f());
  }
}
