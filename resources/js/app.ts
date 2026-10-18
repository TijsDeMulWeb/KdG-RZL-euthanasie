import gsap from 'gsap';
import { api } from './api';
import { dossiers, klas } from './data';
import { wisCache } from './layout';
import { esc, Overlay } from './overlay';
import { Machine } from './scene';
import { Live, MAX_GSM } from './live';
import { commissie, dossierSleutel, MAX_STAAN, staanSleutel } from './scenes/commissie';
import { aanmelden, getallenlijn, openVraag, pauze, quiz } from './scenes/gsm';
import { jullieHemel, leeg, MIDDEN } from './scenes/opening';
import { abortusSterrenbeelden, afsluiter, herstemming, mensen } from './scenes/slot';
import { theorie } from './scenes/theorie';
import { Stage } from './stage';
import { Teller } from './teller';

async function start() {
  // Labels worden gemeten voor de plaatsing, dus eerst moeten de lettertypes geladen zijn.
  await document.fonts.ready;

  const stage = new Stage(document.getElementById('hemel') as HTMLCanvasElement, document.getElementById('labels')!, [
    { sleutel: MIDDEN },
    ...klas.map((l) => ({ sleutel: l.naam, label: l.naam })),
    ...dossiers.map((d) => ({ sleutel: dossierSleutel(d.id), label: d.titel, labelKlasse: 'dossier' })),
    ...Array.from({ length: MAX_GSM }, (_, i) => ({ sleutel: `gsm:${i}` })),
    ...[0, 1, 2].flatMap((zone) => Array.from({ length: MAX_STAAN }, (_, i) => ({ sleutel: staanSleutel(zone, i) }))),
  ]);
  const teller = new Teller();
  const live = new Live();
  const overlay = new Overlay();
  const ctx = { stage, overlay };

  // De volgorde van de les (2 uur, met één pauze).
  const commissie1 = commissie(ctx, teller, live, ['trauma', 'misdaad']);
  const commissie2 = commissie(ctx, teller, live, ['voltooid', 'dementie'], () => commissie1.besproken());
  const machine = new Machine([
    leeg(ctx),
    aanmelden(ctx, live),
    openVraag(ctx, live, 'betekenis'),
    theorie(ctx, 'kader'),
    jullieHemel(ctx),
    theorie(ctx, 'wet'),
    quiz(ctx, live, 'Waar of niet waar: de wet', ['wet-terminaal', 'wet-psychisch', 'wet-dementie', 'wet-familie', 'wet-kinderen', 'wet-belg']),
    theorie(ctx, 'uitvoering'),
    commissie1,
    pauze(ctx, live, 10),
    theorie(ctx, 'ethiek'),
    openVraag(ctx, live, 'voltooid'),
    commissie2,
    getallenlijn(ctx, live, 'cijfer-2022'),
    mensen(ctx),
    getallenlijn(ctx, live, 'cijfer-70'),
    theorie(ctx, 'cijfers'),
    theorie(ctx, 'afbakening'),
    getallenlijn(ctx, live, 'abortus-weken'),
    theorie(ctx, 'abortus'),
    abortusSterrenbeelden(ctx),
    herstemming(ctx, live),
    afsluiter(ctx, live),
  ]);

  teller.luister(() => machine.onWissel());
  live.luister(() => machine.onWissel());

  const zwart = document.getElementById('zwart')!;
  let isZwart = false;

  const hulp = document.getElementById('hulp')!;
  machine.onWissel = () => {
    const lijstOpen = hulp.querySelector<HTMLDetailsElement>('details.scenes')?.open ?? false;
    const h = machine.huidige.hulp();
    hulp.innerHTML = `
      <h2>Scène ${machine.nummer}/${machine.aantal} · ${esc(machine.huidige.naam)}</h2>
      <p><b>Nu:</b> ${esc(h.stap)}</p>
      <p><b>→</b> ${esc(h.volgende === 'volgende scène' ? `scène: ${machine.volgendeScene?.naam ?? 'einde'}` : h.volgende)}</p>
      ${(h.notities ?? []).map((n) => `<p class="notitie">${esc(n)}</p>`).join('')}
      <p class="toetsen">Bediening via /presentator · F volledig scherm · B zwart · H hulp</p>
      <details class="scenes"><summary>Naar scène…</summary>${machine.namen
        .map((n, i) => `<button data-scene="${i}" class="${i + 1 === machine.nummer ? 'actief' : ''}">${i + 1}. ${esc(n)}</button>`)
        .join('')}</details>`;
    hulp.querySelector<HTMLDetailsElement>('details.scenes')!.open = lijstOpen;
    deelStand();
  };

  // Het presentatorscherm (gsm) volgt de beamer en kan hem bedienen.
  let standTimer = 0;
  function deelStand() {
    clearTimeout(standTimer);
    standTimer = window.setTimeout(() => {
      const h = machine.huidige.hulp();
      api('PUT', '/presentator/beamer', {
        nummer: machine.nummer,
        naam: machine.huidige.naam,
        stap: h.stap,
        volgende: h.volgende === 'volgende scène' ? `Scène: ${machine.volgendeScene?.naam ?? 'einde'}` : h.volgende,
        notities: h.notities ?? [],
        scenes: machine.namen,
        zwart: isZwart,
        bekijk: live.bekijk,
        getoond: machine.huidige.getoondAntwoord?.() ?? null,
      }).catch(() => {});
    }, 200);
  }

  function zetZwart(aan: boolean) {
    isZwart = aan;
    gsap.to(zwart, { opacity: isZwart ? 1 : 0, duration: 0.8 });
    deelStand();
  }

  let laatsteOpdracht: number | null = null;
  async function volgOpdrachten() {
    try {
      const opdrachten = await api<{ id: number; soort: string; scene?: number; antwoord?: number | null }[]>('GET', `/presentator/opdrachten?na=${laatsteOpdracht ?? 0}`);
      // Bij het laden van de pagina alleen onthouden waar we zitten, oude opdrachten niet uitvoeren.
      if (laatsteOpdracht === null) {
        laatsteOpdracht = Math.max(0, ...opdrachten.map((o) => o.id));
        return;
      }
      for (const o of opdrachten) {
        laatsteOpdracht = o.id;
        if (o.soort === 'zwart') zetZwart(!isZwart);
        // Bij een zwart scherm brengt de eerste klik eerst het beeld terug.
        else if (isZwart) zetZwart(false);
        else if (o.soort === 'volgende') machine.next();
        else if (o.soort === 'vorige') machine.prev();
        else if (o.soort === 'scene' && o.scene !== undefined) machine.ga(o.scene);
        else if (o.soort === 'toon') {
          machine.huidige.toonAntwoord?.(o.antwoord ?? null);
          machine.onWissel();
        }
      }
    } catch {
      // Volgende ronde opnieuw.
    }
  }
  window.setInterval(volgOpdrachten, 600);
  window.setInterval(deelStand, 15000);

  hulp.addEventListener('click', (event) => {
    const knop = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scene]');
    if (knop) machine.ga(Number(knop.dataset.scene));
  });


  window.addEventListener('keydown', (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!isZwart && machine.toets(event)) {
      event.preventDefault();
      return;
    }
    switch (event.key) {
      // Volgende en vorige gaan bewust alleen via het presentatorscherm, niet via toetsen op de beamer.
      case 'f':
      case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        break;
      case 'b':
      case 'B':
      case '.':
        zetZwart(!isZwart);
        break;
      case 'h':
      case 'H':
        hulp.hidden = !hulp.hidden;
        break;
    }
  });

  window.addEventListener('click', (event) => {
    if (isZwart || hulp.contains(event.target as Node)) return;
    machine.klik(stage.raak(event.clientX, event.clientY));
  });

  // De cursor verdwijnt als de muis even stil ligt, zodat hij niet op de beamer blijft hangen.
  let cursorTimer = 0;
  window.addEventListener('mousemove', () => {
    document.body.classList.remove('geen-cursor');
    clearTimeout(cursorTimer);
    cursorTimer = window.setTimeout(() => document.body.classList.add('geen-cursor'), 2500);
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      stage.resize();
      wisCache();
      machine.huidige.render(true);
      overlay.herpas();
    }, 150);
  });

  machine.start();
}

start();
