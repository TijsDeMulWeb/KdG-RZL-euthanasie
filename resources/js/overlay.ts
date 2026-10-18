import gsap from 'gsap';

export type Regio = 'top' | 'center' | 'card' | 'bottom' | 'abs' | 'theorie';

export interface Vak {
  regio: Regio;
  html: string;
  klasse?: string;
  /** Volgorde binnen de regio, laag eerst. */
  volgorde?: number;
  /** Inline stijl, voor vakken in de regio 'abs'. */
  stijl?: string;
  delay?: number;
  /** Maximaal aantal regels; de letter krimpt tot 32 px om dat te halen. */
  regels?: number;
}

interface Actief {
  el: HTMLDivElement;
  vak: Vak;
}

const MIN_PX = 32;

/** HTML-laag boven de hemel. Elke render beschrijft alle vakken; wat ontbreekt, vervaagt. */
export class Overlay {
  private actief = new Map<string, Actief>();
  private regio: Record<Regio, HTMLElement>;

  constructor() {
    this.regio = {
      top: document.getElementById('r-top')!,
      center: document.getElementById('r-center')!,
      card: document.getElementById('r-card')!,
      bottom: document.getElementById('r-bottom')!,
      abs: document.getElementById('r-abs')!,
      theorie: document.getElementById('r-theorie')!,
    };
  }

  toon(vakken: Record<string, Vak>, direct = false) {
    const d = direct ? 0 : 1;
    for (const [sleutel, a] of this.actief) {
      const nieuw = vakken[sleutel];
      if (nieuw && nieuw.regio === a.vak.regio) continue;
      this.actief.delete(sleutel);
      gsap.killTweensOf(a.el);
      gsap.to(a.el, { opacity: 0, duration: 0.5 * d, onComplete: () => a.el.remove() });
    }

    for (const [sleutel, vak] of Object.entries(vakken)) {
      const a = this.actief.get(sleutel);
      if (!a) {
        const el = document.createElement('div');
        this.vul(el, vak);
        el.style.opacity = '0';
        this.voegIn(el, vak);
        this.pas(el, vak);
        this.actief.set(sleutel, { el, vak });
        gsap.to(el, { opacity: 1, duration: 0.9 * d, delay: (vak.delay ?? 0.25) * d, ease: 'power1.out' });
        continue;
      }
      const zelfde = a.vak.html === vak.html && a.vak.klasse === vak.klasse && a.vak.stijl === vak.stijl;
      a.vak = vak;
      if (zelfde) continue;
      gsap.killTweensOf(a.el);
      gsap.to(a.el, {
        opacity: 0,
        duration: 0.35 * d,
        onComplete: () => {
          this.vul(a.el, a.vak);
          this.pas(a.el, a.vak);
          gsap.to(a.el, { opacity: 1, duration: 0.7 * d, ease: 'power1.out' });
        },
      });
    }
  }

  /** Lettergrootte opnieuw passen, bv. na het wijzigen van de venstergrootte. */
  herpas() {
    for (const a of this.actief.values()) this.pas(a.el, a.vak);
  }

  private vul(el: HTMLDivElement, vak: Vak) {
    el.className = `vak ${vak.klasse ?? ''}`;
    el.innerHTML = vak.html;
    el.style.cssText = `${vak.stijl ?? ''};opacity:${el.style.opacity || 0}`;
  }

  private voegIn(el: HTMLDivElement, vak: Vak) {
    const ouder = this.regio[vak.regio];
    const v = vak.volgorde ?? 0;
    el.dataset.volgorde = String(v);
    const na = [...ouder.children].find((c) => Number((c as HTMLElement).dataset.volgorde) > v);
    ouder.insertBefore(el, na ?? null);
  }

  /** Verkleint de tekst stap voor stap tot ze binnen het aantal regels past, maar nooit onder 32 px. */
  private pas(el: HTMLDivElement, vak: Vak) {
    if (!vak.regels) return;
    for (const doel of el.querySelectorAll<HTMLElement>('[data-pas]')) {
      doel.style.fontSize = '';
      let px = parseFloat(getComputedStyle(doel).fontSize);
      while (px > MIN_PX && regels(doel) > vak.regels) {
        px = Math.max(MIN_PX, px - 2);
        doel.style.fontSize = `${px}px`;
      }
    }
  }
}

function regels(el: HTMLElement): number {
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  return Math.round(el.getBoundingClientRect().height / lh);
}

export function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
