import gsap from 'gsap';
import { api } from './api';
import { dossiers, kaarten, klas, laadInhoud, les, LesStap, vragen } from './data';
import { wisCache } from './layout';
import { esc, Overlay } from './overlay';
import { Ctx, lineair, Machine, Positie, Scene } from './scene';
import { Live, MAX_GSM } from './live';
import { commissie, dossierSleutel, MAX_STAAN, staanSleutel } from './scenes/commissie';
import { aanmelden, getallenlijn, openVraag, pauze, quiz } from './scenes/gsm';
import { jullieHemel, leeg, MIDDEN } from './scenes/opening';
import { afsluiter, herstemming, mensen, sterrenbeeld } from './scenes/slot';
import { publiek } from './scenes/publiek';
import { wereldkaart } from './scenes/wereld';
import { theorie } from './scenes/theorie';
import { Stage } from './stage';
import { Teller } from './teller';
import type { CommissieScene } from './scenes/commissie';

/** Zichtbare melding in plaats van een scène die naar iets verwijst dat niet (meer) bestaat in het beheer. */
function ontbrekend(ctx: Ctx, wat: string): Scene {
  return lineair(`Ontbreekt: ${wat}`, [
    {
      label: `Ontbreekt in het beheer: ${wat}`,
      render: ({ direct }) => {
        ctx.stage.toon({ achtergrond: 0.6, sterren: {} }, direct);
        ctx.overlay.toon({ melding: { regio: 'bottom', klasse: 'melding', html: `Deze stap verwijst naar iets dat niet bestaat: ${esc(wat)}` } }, direct);
      },
    },
  ]);
}

async function start() {
  // Labels worden gemeten voor de plaatsing, dus eerst moeten de lettertypes geladen zijn.
  await document.fonts.ready;
  await laadInhoud();

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

  // De volgorde van de les komt uit het beheerplatform (Lesverloop).
  const commissies: CommissieScene[] = [];
  const tekst = (stap: LesStap, sleutel: string) => String(stap.instellingen?.[sleutel] ?? '');
  const lijst = (stap: LesStap, sleutel: string) => (stap.instellingen?.[sleutel] as string[] | undefined) ?? [];

  function maakScene(stap: LesStap): Scene {
    switch (stap.type) {
      case 'titel':
        return leeg(ctx, tekst(stap, 'titel'));
      case 'aanmelden':
        return aanmelden(ctx, live);
      case 'openVraag':
      case 'getallenlijn': {
        const id = tekst(stap, 'vraag');
        if (!vragen[id]) return ontbrekend(ctx, `vraag "${id}"`);
        return stap.type === 'openVraag' ? openVraag(ctx, live, id) : getallenlijn(ctx, live, id);
      }
      case 'theorie': {
        const id = tekst(stap, 'kaart');
        return kaarten.some((k) => k.id === id) ? theorie(ctx, id) : ontbrekend(ctx, `theoriekaart "${id}"`);
      }
      case 'jullieHemel':
        return jullieHemel(ctx);
      case 'quiz': {
        const ids = lijst(stap, 'vragen').filter((id) => vragen[id]);
        return ids.length ? quiz(ctx, live, tekst(stap, 'naam') || 'Quiz', ids) : ontbrekend(ctx, 'quizvragen');
      }
      case 'commissie': {
        const ids = lijst(stap, 'dossiers').filter((id) => dossiers.some((d) => d.id === id));
        if (!ids.length) return ontbrekend(ctx, 'dossiers');
        // Dossiers uit een vorig commissiedeel blijven goud in het overzicht.
        const vorige = [...commissies];
        const scene = commissie(ctx, teller, live, ids, () => new Set(vorige.flatMap((c) => [...c.besproken()])));
        commissies.push(scene);
        return scene;
      }
      case 'pauze':
        return pauze(ctx, live, Number(stap.instellingen?.minuten ?? 10));
      case 'mensen':
        return mensen(
          ctx,
          live,
          Number(stap.instellingen?.aantal ?? 3000),
          tekst(stap, 'tekst'),
          tekst(stap, 'bron'),
          ((stap.instellingen?.uitlichtingen as { procent: number | string; tekst: string; vraag?: string | null }[] | undefined) ?? [])
            .map((u) => ({ procent: Number(u.procent), tekst: u.tekst ?? '', vraag: u.vraag ?? null }))
            .filter((u) => u.procent > 0 && u.procent <= 100),
        );
      case 'sterrenbeeld': {
        const namen = [tekst(stap, 'links'), ...lijst(stap, 'rechts')];
        if (namen.some((n) => !klas.some((l) => l.naam === n))) return ontbrekend(ctx, 'leerling in het duel');
        return sterrenbeeld(ctx, tekst(stap, 'stelling') as Parameters<typeof sterrenbeeld>[1], tekst(stap, 'links'), lijst(stap, 'rechts'));
      }
      case 'wereldkaart': {
        const id = tekst(stap, 'vraag');
        return wereldkaart(ctx, live, id && vragen[id] ? id : null);
      }
      case 'publieksvragen':
        return publiek(ctx, ((stap.instellingen?.vragen as (number | string)[] | undefined) ?? []).map(Number));
      case 'herstemming':
        return herstemming(ctx, live);
      case 'afsluiter':
        return afsluiter(ctx, live);
      default:
        return ontbrekend(ctx, `scènetype "${stap.type}"`);
    }
  }

  const machine = new Machine(les.length ? les.map(maakScene) : [leeg(ctx, 'Nog geen lesverloop in het beheer')]);

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
        getoond: machine.huidige.getoondAntwoorden?.() ?? [],
        land: machine.huidige.gekozenLand?.() ?? null,
        wereld: !!machine.huidige.kiesLand,
        telling: machine.huidige.tellingStand?.() ?? null,
        positie: machine.positie,
        toestanden: machine.toestanden,
        opdracht: laatsteOpdracht,
      }).catch(() => {});
    }, 120);
  }

  function zetZwart(aan: boolean) {
    isZwart = aan;
    gsap.to(zwart, { opacity: isZwart ? 1 : 0, duration: 0.8 });
    deelStand();
  }

  let laatsteOpdracht: number | null = null;
  let opdrachtenBezig = false;
  async function volgOpdrachten() {
    // Nooit twee peilingen tegelijk: op trage wifi zou dezelfde klik anders twee keer uitgevoerd worden.
    if (opdrachtenBezig) return;
    opdrachtenBezig = true;
    try {
      const opdrachten = await api<{ id: number; soort: string; scene?: number; antwoord?: number | null; zone?: number; stap?: number; aan?: boolean; metNaam?: boolean; land?: string | null }[]>('GET', `/presentator/opdrachten?na=${laatsteOpdracht ?? 0}`);
      // Bij het laden van de pagina alleen onthouden waar we zitten, oude opdrachten niet uitvoeren.
      if (laatsteOpdracht === null) {
        laatsteOpdracht = Math.max(0, ...opdrachten.map((o) => o.id));
        return;
      }
      for (const o of opdrachten) {
        if (o.id <= laatsteOpdracht) continue;
        laatsteOpdracht = o.id;
        if (o.soort === 'zwart') zetZwart(!isZwart);
        // Bij een zwart scherm brengt de eerste klik eerst het beeld terug.
        else if (isZwart) zetZwart(false);
        else if (o.soort === 'volgende') machine.next();
        else if (o.soort === 'vorige') machine.prev();
        else if (o.soort === 'scene' && o.scene !== undefined) machine.ga(o.scene);
        else if (o.soort === 'telling' && o.zone !== undefined && o.stap !== undefined) machine.huidige.corrigeerTelling?.(o.zone, o.stap);
        else if (o.soort === 'land') {
          machine.huidige.kiesLand?.(o.land ?? null);
          machine.onWissel();
        } else if (o.soort === 'vergrendel') {
          machine.huidige.vergrendelTelling?.(!!o.aan);
          machine.onWissel();
        } else if (o.soort === 'toon') {
          machine.huidige.toonAntwoord?.(o.antwoord ?? null, !!o.metNaam, o.aan ?? true);
          machine.onWissel();
        }
      }
      // Meteen laten weten welke opdracht uitgevoerd is, zodat het presentatorscherm kan bevestigen.
      if (opdrachten.length) deelStand();
    } catch {
      // Volgende ronde opnieuw.
    } finally {
      opdrachtenBezig = false;
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

  // Na een herladen gaat de beamer verder waar hij was, in plaats van opnieuw te beginnen.
  const bewaard = await api<{ positie?: Positie; toestanden?: Record<number, unknown>; zwart?: boolean } | null>('GET', '/presentator/beamer').catch(() => null);
  if (bewaard?.positie) {
    machine.herstel(bewaard.positie, bewaard.toestanden ?? {});
    if (bewaard.zwart) zetZwart(true);
  } else {
    machine.start();
  }
}

start();
