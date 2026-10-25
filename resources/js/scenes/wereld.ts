import { Land, landen, vragen } from '../data';
import { Live } from '../live';
import { esc, Vak } from '../overlay';
import { Ctx, Scene } from '../scene';
import { wereldPunten } from '../wereld';
import { liveScene, LiveStap } from './gsm';

const KLEUR: Record<Land['status'], 'goud' | 'blauw' | 'gedempt'> = {
  beide: 'goud',
  euthanasie: 'goud',
  hulp: 'blauw',
  niet_in_werking: 'gedempt',
};

const STATUS_TEKST: Record<Land['status'], string> = {
  beide: 'Euthanasie en hulp bij zelfdoding',
  euthanasie: 'Euthanasie',
  hulp: 'Alleen hulp bij zelfdoding',
  niet_in_werking: 'Wet aangenomen, niet in werking',
};

/**
 * Wereldkaart van sterren. Eventueel eerst raden op de gsm, dan een jaarteller waarbij elk land oplicht
 * in het jaar dat het legaal werd. Daarna kan de presentator een land aantikken om in te zoomen.
 */
export function wereldkaart(ctx: Ctx, live: Live, vraagId: string | null): Scene {
  const DUUR = 11;
  let gekozen: string | null = null;
  let inOnthulling = false;
  let tellerTimer = 0;
  let jaarteller = { start: 0 };

  const legaal = () => landen.filter((l) => l.status !== 'niet_in_werking');
  const jaren = () => {
    const metJaar = landen.filter((l) => l.jaar);
    const eerste = Math.min(...metJaar.map((l) => l.jaar!));
    return { eerste, laatste: Math.max(new Date().getFullYear(), ...metJaar.map((l) => l.jaar!)) };
  };

  function klaarzetten() {
    const { W, H } = ctx.stage;
    const { punten } = wereldPunten(W, H);
    ctx.stage.zetWereld(`${W}x${H}`, punten);
    return wereldPunten(W, H).vormen;
  }

  function gokken(): Map<string, number> {
    const tel = new Map<string, number>();
    for (const a of live.antwoorden) {
      for (const iso of (a.waarde as unknown as string[]) ?? []) tel.set(iso, (tel.get(iso) ?? 0) + 1);
    }
    return tel;
  }

  function renderRaden(direct: boolean) {
    inOnthulling = false;
    klaarzetten();
    const tel = gokken();
    const n = Math.max(1, live.antwoorden.length);
    const kaart: Record<string, { kleur: 'wit'; helder: number }> = {};
    for (const [iso, aantal] of tel) kaart[iso] = { kleur: 'wit', helder: 0.15 + 0.85 * (aantal / n) };
    ctx.stage.toon({ achtergrond: 0.6, sterren: {}, wereld: { alpha: 1, landen: kaart }, duur: 1.2 }, direct);
    const vraag = vragen[vraagId!];
    ctx.overlay.toon(
      {
        vraag: { regio: 'top', klasse: 'vraag-titel', html: esc(vraag?.tekst ?? '') },
        teller: { regio: 'top', klasse: 'telling', html: `${live.antwoorden.length} van ${live.deelnemers.length} antwoordden`, volgorde: 1 },
      },
      direct,
    );
  }

  function renderOnthulling(direct: boolean, opnieuwTellen: boolean) {
    const vormen = klaarzetten();
    const { W } = ctx.stage;
    inOnthulling = true;
    const { eerste, laatste } = jaren();
    const tijd = (jaar: number | null) => (jaar ? ((jaar - eerste) / Math.max(1, laatste - eerste)) * DUUR : 0);
    const kaart: Record<string, { kleur: 'goud' | 'blauw' | 'gedempt'; helder: number; delay?: number }> = {};
    for (const land of landen) {
      const isGekozen = gekozen === land.iso;
      kaart[land.iso] = {
        kleur: KLEUR[land.status],
        helder: gekozen && !isGekozen ? 0.35 : land.status === 'niet_in_werking' ? 0.45 : 1,
        delay: opnieuwTellen ? tijd(land.jaar) + 0.6 : 0,
      };
    }

    let camera: { x: number; y: number; zoom: number } | undefined;
    const vakken: Record<string, Vak> = {};
    const land = landen.find((l) => l.iso === gekozen);
    const vorm = gekozen ? vormen.get(gekozen) : undefined;
    if (land && vorm) {
      // Inzoomen op het land, met de uitleg rechts ernaast, zoals bij de dossiers.
      const zoom = Math.min(3.2, Math.max(1.4, (W * 0.3) / vorm.breedte));
      camera = { x: vorm.midden.x - (W * 0.2 - W / 2) / zoom, y: vorm.midden.y, zoom };
      vakken.land = {
        regio: 'card',
        klasse: 'kaart land-kaart',
        html: `<p class="land-naam">${esc(land.naam)}</p>
          <p class="land-status ${KLEUR[land.status]}">${esc(STATUS_TEKST[land.status])}${land.jaar ? ` · sinds ${land.jaar}` : ''}${land.gedeeltelijk ? ' · in een deel van het land' : ''}</p>
          ${land.voorwaarden.map((v) => `<p>${esc(v)}</p>`).join('')}
          ${land.bron ? `<p class="land-bron">Bron: ${esc(land.bron)}</p>` : ''}`,
        delay: 1,
      };
    } else {
      vakken.jaar = { regio: 'top', klasse: 'mensen-teller', html: `<span id="wereldjaar">${opnieuwTellen ? eerste : laatste}</span>` };
      vakken.legenda = {
        regio: 'bottom',
        klasse: 'legenda',
        html: `<span><i class="goud"></i>Euthanasie</span><span><i class="blauw"></i>Alleen hulp bij zelfdoding</span><span><i class="gedempt"></i>Wet niet in werking</span>`,
        delay: opnieuwTellen ? DUUR : 0.3,
      };
      const vergeten = vergetenLanden();
      if (vergeten) vakken.vergeten = { regio: 'bottom', klasse: 'hulpzin', html: esc(vergeten), volgorde: 1, delay: opnieuwTellen ? DUUR + 0.8 : 0.4 };
    }

    ctx.stage.toon({ achtergrond: 0.6, sterren: {}, wereld: { alpha: 1, landen: kaart }, camera, duur: 1.4, cameraDuur: 2.4 }, direct);
    ctx.overlay.toon(vakken, direct);

    clearInterval(tellerTimer);
    if (opnieuwTellen && !land) {
      jaarteller = { start: performance.now() + 600 };
      tellerTimer = window.setInterval(() => {
        const el = document.getElementById('wereldjaar');
        if (!el) return clearInterval(tellerTimer);
        const t = Math.min(1, Math.max(0, (performance.now() - jaarteller.start) / (DUUR * 1000)));
        el.textContent = String(Math.round(eerste + t * (laatste - eerste)));
        if (t >= 1) clearInterval(tellerTimer);
      }, 50);
    }
  }

  /** Welke legale landen de klas het minst aanduidde: daar zit vaak het gesprek. */
  function vergetenLanden(): string | null {
    if (!vraagId || !live.antwoorden.length) return null;
    const tel = gokken();
    const n = live.antwoorden.length;
    const minst = legaal()
      .map((l) => ({ naam: l.naam, pct: Math.round(((tel.get(l.iso) ?? 0) / n) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);
    return `Het minst aangeduid: ${minst.map((m) => `${m.naam} (${m.pct}%)`).join(', ')}`;
  }

  let getoondeOnthulling = false;
  const stappen: LiveStap[] = [];
  if (vraagId && vragen[vraagId]) {
    stappen.push({ label: 'Raden: tik de landen aan op de gsm', vraag: vraagId, render: (direct) => renderRaden(direct) });
  }
  stappen.push({
    label: 'Jaarteller: landen lichten op; tik daarna een land aan op het presentatorscherm',
    vraag: null,
    bekijk: vraagId ?? undefined,
    render: (direct) => {
      const eersteKeer = !getoondeOnthulling && !direct;
      getoondeOnthulling = true;
      gekozen = null;
      renderOnthulling(direct, eersteKeer);
    },
    notities: () => [`Landen in het beheer: ${landen.length}. Tik een land aan op het presentatorscherm om in te zoomen.`],
  });

  const scene = liveScene('Wereldkaart', live, stappen);
  const enter = scene.enter.bind(scene);
  return {
    ...scene,
    enter(richting) {
      getoondeOnthulling = false;
      enter(richting);
    },
    kiesLand(iso) {
      if (!inOnthulling) return;
      gekozen = iso && landen.some((l) => l.iso === iso) && iso !== gekozen ? iso : null;
      renderOnthulling(false, false);
    },
    gekozenLand() {
      return gekozen;
    },
  };
}
