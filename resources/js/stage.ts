import * as THREE from 'three';
import gsap from 'gsap';
import { mulberry32 } from './layout';

export type Kleur = 'wit' | 'goud' | 'gedempt';

const WERELDKLEUREN: Record<string, [number, number, number]> = {
  blauw: [0.62, 0.78, 1],
  wit: [0.9, 0.92, 1],
};

const KLEUREN: Record<Kleur, [number, number, number]> = {
  wit: [1, 0.97, 0.92],
  goud: [1, 0.82, 0.5],
  gedempt: [0.68, 0.56, 0.38],
};

export interface SterDoel {
  x: number;
  y: number;
  alpha?: number;
  size?: number;
  kleur?: Kleur;
  flikker?: number;
  puls?: number;
  label?: number;
  nadruk?: boolean;
  delay?: number;
  /** Vertrekpunt: de ster vliegt in een boog van hier naar x,y en trekt een lichtspoor. */
  vanaf?: { x: number; y: number };
  /** Hoe ver de boog uitwijkt, als deel van de afstand. Negatief = andere kant. */
  boog?: number;
  /** Begint meteen met deze helderheid en gaat daarna (na delay) naar alpha. */
  startAlpha?: number;
}

export interface Beeld {
  achtergrond: number;
  sterren: Record<string, SterDoel>;
  camera?: { x: number; y: number; zoom: number };
  lijnen?: [string, string][];
  lijnAlpha?: number;
  duel?: [string, string] | null;
  duur?: number;
  /** Duur van de camerabeweging, als die trager moet dan de sterren. */
  cameraDuur?: number;
  /** Wereldkaart van sterren: hoe zichtbaar, en per land (ISO-code) een kleur en helderheid. */
  wereld?: { alpha: number; landen: Record<string, { kleur: Kleur | 'blauw' | 'wit'; helder: number; delay?: number }> };
  /** Hoeveel 'mensensterren' de hemel vullen (tot MAX_MENSEN), bv. één per euthanasie. */
  mensen?: number;
  mensenDuur?: number;
  /** Welk deel (0 tot 1) van de mensensterren groter en goud oplicht; null of weglaten = geen. */
  mensenUitgelicht?: number | null;
}

export const MAX_MENSEN = 4600;

interface SterToestand {
  sleutel: string;
  x: number;
  y: number;
  alpha: number;
  size: number;
  r: number;
  g: number;
  b: number;
  flikker: number;
  puls: number;
  label: number;
  fase: number;
  labelEl: HTMLDivElement | null;
  /** Wat er na het laatste beeld zichtbaar is, voor de klikdetectie. */
  doelAlpha: number;
  spoor: number;
  spoorPunten: { x: number; y: number }[];
  vlucht: { t: number; x: number; y: number } | null;
}

const ACHTERGROND_AANTAL = 2600;
/** De sprite is groter dan de ster zelf, zodat gloed en stralen ruimte hebben. */
const SPRITE_FACTOR = 2.7;
const MAX_LIJNEN = 40;

const glowVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uPR;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    gl_PointSize = aSize * uPR;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float kern = exp(-d * d * 220.0) * 1.3;
    float binnen = exp(-d * d * 24.0) * 0.85;
    float halo = exp(-d * 3.2) * 0.3;
    float stralen = (exp(-abs(c.x) * 110.0) * exp(-abs(c.y) * 7.0) + exp(-abs(c.y) * 110.0) * exp(-abs(c.x) * 7.0)) * 0.45;
    float a = (kern + binnen + halo + stralen) * vAlpha * (1.0 - smoothstep(0.85, 1.0, d));
    vec3 kleur = mix(vColor, vec3(1.0), clamp(kern, 0.0, 1.0) * 0.75);
    gl_FragColor = vec4(kleur * a, a);
  }
`;

const achtergrondVertex = /* glsl */ `
  attribute float aSize;
  attribute float aFase;
  attribute float aHelder;
  attribute vec3 aTint;
  uniform float uPR;
  uniform float uTijd;
  uniform float uD;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float afstand = -mv.z;
    float schaal = clamp(pow(uD / afstand, 0.75), 0.3, 7.0);
    float twinkel = 0.7 + 0.3 * sin(uTijd * (0.5 + aFase * 1.3) + aFase * 6.2831);
    // Sterren vlak voor de camera vervagen, zodat ze er zacht voorbij glijden in plaats van te knallen.
    float dichtbij = smoothstep(0.04 * uD, 0.3 * uD, afstand);
    vAlpha = aHelder * twinkel * dichtbij * clamp(schaal, 0.5, 1.6);
    vTint = aTint;
    gl_PointSize = aSize * schaal * uPR;
    gl_Position = projectionMatrix * mv;
  }
`;

const achtergrondFragment = /* glsl */ `
  uniform float uAlpha;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float a = (exp(-d * d * 14.0) + exp(-d * d * 60.0) * 0.8) * vAlpha * uAlpha * (1.0 - smoothstep(0.8, 1.0, d));
    gl_FragColor = vec4(vTint * a, a);
  }
`;

/** Eén ster per mens; een deel ervan kan oplichten om een verhouding te tonen (bv. 73,7 % ouder dan 70). */
const mensenVertex = /* glsl */ `
  attribute float aIndex;
  attribute float aFase;
  attribute float aRang;
  uniform float uPR;
  uniform float uAantal;
  uniform float uTijd;
  uniform float uFractie;
  uniform float uNadruk;
  varying float vAlpha;
  varying float vUitgelicht;
  void main() {
    // Elke ster licht zacht op zodra de teller haar nummer passeert.
    float aan = clamp((uAantal - aIndex) / 40.0, 0.0, 1.0);
    float uitgelicht = step(aRang, uFractie - 0.0000001) * uNadruk;
    vUitgelicht = uitgelicht;
    float gedimd = 1.0 - uNadruk * 0.6 * (1.0 - uitgelicht);
    vAlpha = aan * gedimd * (0.55 + 0.25 * sin(uTijd * (0.6 + aFase) + aFase * 6.28) + uitgelicht * 0.35);
    gl_PointSize = (6.0 + aFase * 4.0) * (1.0 + uitgelicht * 0.9) * uPR;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const mensenFragment = /* glsl */ `
  varying float vAlpha;
  varying float vUitgelicht;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (exp(-d * d * 10.0) + exp(-d * d * 50.0)) * 0.95 * vAlpha * (1.0 - smoothstep(0.8, 1.0, d));
    vec3 kleur = mix(vec3(1.0, 0.9, 0.74), vec3(1.0, 0.76, 0.36), vUitgelicht);
    gl_FragColor = vec4(kleur * a, a);
  }
`;

const wereldVertex = /* glsl */ `
  attribute vec3 aKleur;
  attribute float aHelder;
  attribute float aFase;
  uniform float uPR;
  uniform float uTijd;
  uniform float uZoom;
  uniform float uAlpha;
  varying vec3 vKleur;
  varying float vAlpha;
  void main() {
    float twinkel = 0.85 + 0.15 * sin(uTijd * (0.8 + aFase) + aFase * 6.28);
    vKleur = aKleur;
    vAlpha = uAlpha * (0.6 + aHelder * 0.4) * twinkel;
    gl_PointSize = (5.0 + aHelder * 4.5) * uPR * uZoom;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const wereldFragment = /* glsl */ `
  varying vec3 vKleur;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (exp(-d * d * 7.0) * 0.9 + exp(-d * d * 36.0) * 0.9) * vAlpha * (1.0 - smoothstep(0.8, 1.0, d));
    gl_FragColor = vec4(vKleur * a, a);
  }
`;

/** Melkweg: een zachte band van nevel en stof, met ruis opgebouwd, die heel traag verschuift. */
const nevelVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const nevelFragment = /* glsl */ `
  uniform float uTijd;
  uniform float uAlpha;
  uniform vec2 uVerschuif;
  uniform float uAspect;
  uniform float uZoom;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float ruis(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      s += a * ruis(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return s;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) / uZoom + uVerschuif;
    p += vec2(uTijd * 0.004, uTijd * 0.0015);
    // Band schuin over het beeld, licht golvend.
    float hoek = -0.42;
    vec2 r = vec2(cos(hoek) * p.x - sin(hoek) * p.y, sin(hoek) * p.x + cos(hoek) * p.y);
    float golf = (fbm(r * 1.3 + 3.0) - 0.5) * 0.35;
    float afstand = r.y + golf;
    float band = exp(-afstand * afstand * 9.0);
    float kern = exp(-afstand * afstand * 40.0);

    float wolk = fbm(p * 2.2);
    float fijn = fbm(p * 6.0 + wolk * 1.5);
    float stof = smoothstep(0.45, 0.75, fbm(p * 3.4 + vec2(5.0, 1.0)));

    vec3 diep = vec3(0.06, 0.09, 0.2);
    vec3 paars = vec3(0.13, 0.08, 0.2);
    vec3 warm = vec3(0.28, 0.22, 0.17);
    vec3 kleur = mix(diep, paars, smoothstep(0.3, 0.7, wolk));
    kleur += warm * kern * fijn * 0.9;

    float sterkte = band * (0.35 + wolk * 0.9) * (0.6 + fijn * 0.6) * (1.0 - stof * 0.75 * band);
    vec3 uit = kleur * sterkte * 2.3 * uAlpha;
    // Fijne korrel tegen kleurbanden op goedkope beamers.
    uit += (hash(gl_FragCoord.xy + uTijd) - 0.5) * 0.012;
    uit = max(uit, 0.0);
    gl_FragColor = vec4(uit, max(max(uit.r, uit.g), uit.b));
  }
`;

/** Dunne lijnen als vlakjes, want WebGL-lijnen zijn altijd 1 px en dat is te fijn voor een beamer. */
class Lijnen {
  readonly mesh: THREE.Mesh;
  private pos: Float32Array;
  private kleur: Float32Array;

  constructor(max: number) {
    this.pos = new Float32Array(max * 6 * 3);
    this.kleur = new Float32Array(max * 6 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.kleur, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  zet(segmenten: SpoorSegment[]) {
    let v = 0;
    const punt = (x: number, y: number, c: [number, number, number], a: number) => {
      this.pos.set([x, -y, 0], v * 3);
      this.kleur.set([c[0] * a, c[1] * a, c[2] * a], v * 3);
      v++;
    };
    for (const s of segmenten) {
      const dx = s.b.x - s.a.x;
      const dy = s.b.y - s.a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1 || s.alpha < 0.002 || s.groei <= 0) continue;
      // Lijn begint en eindigt een eindje buiten de ster, zodat de ster zelf vrij blijft.
      const ux = dx / len;
      const uy = dy / len;
      const inkort = Math.min(s.rand ?? 18, len / 3);
      const ax = s.a.x + ux * inkort;
      const ay = s.a.y + uy * inkort;
      const bx = ax + (s.b.x - ux * inkort - ax) * s.groei;
      const by = ay + (s.b.y - uy * inkort - ay) * s.groei;
      const nx = (-uy * s.breedte) / 2;
      const ny = (ux * s.breedte) / 2;
      const a = s.alpha * Math.min(s.a.alpha ?? 1, s.b.alpha ?? 1);
      punt(ax + nx, ay + ny, s.kleur, a);
      punt(ax - nx, ay - ny, s.kleur, a);
      punt(bx + nx, by + ny, s.kleur, a);
      punt(bx + nx, by + ny, s.kleur, a);
      punt(ax - nx, ay - ny, s.kleur, a);
      punt(bx - nx, by - ny, s.kleur, a);
    }
    const geo = this.mesh.geometry;
    geo.setDrawRange(0, v);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
}

export interface SterDef {
  sleutel: string;
  label?: string;
  labelKlasse?: string;
}

export class Stage {
  W = window.innerWidth;
  H = window.innerHeight;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private achtergrondScene = new THREE.Scene();
  private nevelScene = new THREE.Scene();
  private nevelMat: THREE.ShaderMaterial;
  private nevelCamera = new THREE.Camera();
  private camera = new THREE.PerspectiveCamera(50, 1, 1, 100000);
  /** Afstand waarop het vlak van de klassterren (z = 0) precies 1 px per eenheid toont. */
  private D = 1000;
  private spoorLijnen = new Lijnen(400);
  private mensenGeo = new THREE.BufferGeometry();
  private wereldGeo = new THREE.BufferGeometry();
  private wereldMat: THREE.ShaderMaterial;
  private wereldIso: string[] = [];
  private wereldStaat = new Map<string, { r: number; g: number; b: number; helder: number }>();
  private wereldSleutel = '';
  private mensenMat: THREE.ShaderMaterial;
  private achtergrondMat: THREE.ShaderMaterial;
  private achtergrondGeo = new THREE.BufferGeometry();
  private sterGeo = new THREE.BufferGeometry();
  private sterMat: THREE.ShaderMaterial;
  private sterren: SterToestand[] = [];
  private index = new Map<string, SterToestand>();
  private lijnen = new Lijnen(MAX_LIJNEN);
  private duelLijn = new Lijnen(1);

  private cam = { x: 0, y: 0, zoom: 1 };
  private sfeer = { achtergrond: 0, lijnAlpha: 0, lijnGroei: 0, duelAlpha: 0, duelGroei: 0, mensen: 0, mensenNadruk: 0, wereld: 0 };
  private huidigeLijnen: [string, string][] = [];
  private huidigDuel: [string, string] | null = null;
  private standaardCamera = true;
  /** Heel trage zweving van de camera, zodat de hemel nooit helemaal stilstaat. */
  private drift = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, labels: HTMLElement, defs: SterDef[]) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;


    const pr = this.renderer.getPixelRatio();
    this.achtergrondMat = new THREE.ShaderMaterial({
      vertexShader: achtergrondVertex,
      fragmentShader: achtergrondFragment,
      uniforms: { uPR: { value: pr }, uTijd: { value: 0 }, uAlpha: { value: 0 }, uD: { value: 1000 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.nevelMat = new THREE.ShaderMaterial({
      vertexShader: nevelVertex,
      fragmentShader: nevelFragment,
      uniforms: {
        uTijd: { value: 0 },
        uAlpha: { value: 0 },
        uVerschuif: { value: new THREE.Vector2() },
        uAspect: { value: 1 },
        uZoom: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const nevel = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.nevelMat);
    nevel.frustumCulled = false;
    this.nevelScene.add(nevel);

    this.mensenMat = new THREE.ShaderMaterial({
      vertexShader: mensenVertex,
      fragmentShader: mensenFragment,
      uniforms: { uPR: { value: pr }, uAantal: { value: 0 }, uTijd: { value: 0 }, uFractie: { value: 0 }, uNadruk: { value: 0 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.wereldMat = new THREE.ShaderMaterial({
      vertexShader: wereldVertex,
      fragmentShader: wereldFragment,
      uniforms: { uPR: { value: pr }, uTijd: { value: 0 }, uZoom: { value: 1 }, uAlpha: { value: 0 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const wereld = new THREE.Points(this.wereldGeo, this.wereldMat);
    wereld.frustumCulled = false;
    wereld.renderOrder = -1;
    this.scene.add(wereld);

    const mensen = new THREE.Points(this.mensenGeo, this.mensenMat);
    mensen.frustumCulled = false;
    mensen.renderOrder = -1;
    this.scene.add(mensen);

    const achtergrond = new THREE.Points(this.achtergrondGeo, this.achtergrondMat);
    achtergrond.frustumCulled = false;
    this.achtergrondScene.add(achtergrond);

    defs.forEach((d, i) => {
      let labelEl: HTMLDivElement | null = null;
      if (d.label) {
        labelEl = document.createElement('div');
        labelEl.className = `label ${d.labelKlasse ?? ''}`;
        labelEl.textContent = d.label;
        labelEl.style.opacity = '0';
        labels.appendChild(labelEl);
      }
      const t: SterToestand = {
        sleutel: d.sleutel,
        x: 0,
        y: 0,
        alpha: 0,
        size: 40,
        r: 1,
        g: 1,
        b: 1,
        flikker: 0,
        puls: 0,
        label: 0,
        fase: mulberry32(i + 11)() * Math.PI * 2,
        labelEl,
        doelAlpha: 0,
        spoor: 0,
        spoorPunten: [],
        vlucht: null,
      };
      this.sterren.push(t);
      this.index.set(d.sleutel, t);
    });

    const n = this.sterren.length;
    this.sterGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.sterGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
    this.sterGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.sterGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
    this.sterMat = new THREE.ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      uniforms: { uPR: { value: pr } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const punten = new THREE.Points(this.sterGeo, this.sterMat);
    punten.frustumCulled = false;
    punten.renderOrder = 2;
    this.lijnen.mesh.renderOrder = 0;
    this.duelLijn.mesh.renderOrder = 1;
    this.spoorLijnen.mesh.renderOrder = 1;
    this.scene.add(this.lijnen.mesh, this.duelLijn.mesh, this.spoorLijnen.mesh, punten);

    this.resize();
    gsap.ticker.add((tijd) => this.frame(tijd));
  }

  resize() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.renderer.setSize(this.W, this.H);
    this.camera.aspect = this.W / this.H;
    this.D = this.H / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.far = this.D * 12;
    this.camera.updateProjectionMatrix();
    this.achtergrondMat.uniforms.uD.value = this.D;
    if (this.standaardCamera) {
      this.cam.x = this.W / 2;
      this.cam.y = this.H / 2;
    }
    this.maakAchtergrond();
    this.maakMensen();
  }

  /** Verspreid over het hele beeld, net achter het vlak van de klas. */
  private maakMensen() {
    const rnd = mulberry32(2022);
    const pos = new Float32Array(MAX_MENSEN * 3);
    const index = new Float32Array(MAX_MENSEN);
    const fase = new Float32Array(MAX_MENSEN);
    for (let i = 0; i < MAX_MENSEN; i++) {
      pos[i * 3] = rnd() * this.W * 1.04 - this.W * 0.02;
      pos[i * 3 + 1] = -(rnd() * this.H * 1.04 - this.H * 0.02);
      pos[i * 3 + 2] = -this.D * 0.05;
      index[i] = i;
      fase[i] = rnd();
    }
    this.mensenGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mensenGeo.setAttribute('aIndex', new THREE.BufferAttribute(index, 1));
    this.mensenGeo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    this.mensenGeo.setAttribute('aRang', new THREE.BufferAttribute(new Float32Array(MAX_MENSEN).fill(1), 1));
    this.mensenRangVoor = 0;
  }

  private mensenRangVoor = 0;

  /**
   * Geeft elk van de eerste N sterren een vaste, verspreide plaats in de rij (i * 7919 mod N).
   * Zo licht bij 73,7 % exact 73,7 % van de getoonde sterren op, verspreid over het hele scherm.
   */
  private zetMensenRang(aantal: number) {
    if (aantal === this.mensenRangVoor || aantal < 1) return;
    this.mensenRangVoor = aantal;
    const rang = new Float32Array(MAX_MENSEN).fill(1);
    for (let i = 0; i < Math.min(aantal, MAX_MENSEN); i++) rang[i] = ((i * 7919) % aantal) / aantal;
    this.mensenGeo.setAttribute('aRang', new THREE.BufferAttribute(rang, 1));
  }

  /** Zet de punten van de wereldkaart klaar (één keer per schermgrootte). */
  zetWereld(sleutel: string, punten: { x: number; y: number; iso: string }[]) {
    if (sleutel === this.wereldSleutel) return;
    this.wereldSleutel = sleutel;
    const n = punten.length;
    const pos = new Float32Array(n * 3);
    const fase = new Float32Array(n);
    punten.forEach((p, i) => {
      pos.set([p.x, -p.y, -this.D * 0.02], i * 3);
      fase[i] = (i * 0.618) % 1;
    });
    this.wereldIso = punten.map((p) => p.iso);
    this.wereldGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.wereldGeo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    this.wereldGeo.setAttribute('aKleur', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.wereldGeo.setAttribute('aHelder', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
  }

  private toonWereld(wereld: Beeld['wereld'], direct: boolean, duur: number) {
    gsap.to(this.sfeer, { wereld: wereld?.alpha ?? 0, duration: direct ? 0 : duur, ease: 'power2.inOut' });
    const doelen = wereld?.landen ?? {};
    const isos = new Set([...this.wereldStaat.keys(), ...Object.keys(doelen)]);
    for (const iso of isos) {
      let staat = this.wereldStaat.get(iso);
      if (!staat) {
        staat = { r: 0.9, g: 0.92, b: 1, helder: 0 };
        this.wereldStaat.set(iso, staat);
      }
      const doel = doelen[iso];
      const kleur = doel ? (WERELDKLEUREN[doel.kleur] ?? KLEUREN[doel.kleur as Kleur]) : [staat.r, staat.g, staat.b];
      gsap.killTweensOf(staat);
      gsap.to(staat, {
        r: kleur[0],
        g: kleur[1],
        b: kleur[2],
        helder: doel?.helder ?? 0,
        duration: direct ? 0 : 0.9,
        delay: direct ? 0 : doel?.delay ?? 0,
        ease: 'power2.out',
      });
    }
  }

  /** Hoeveel mensensterren er nu (afgerond) branden, voor een teller in beeld. */
  get mensenNu(): number {
    return Math.round(this.sfeer.mensen);
  }

  private maakAchtergrond() {
    // Een echte ruimte: de meeste sterren ver achter het vlak van de klas, een handvol ervoor.
    // Bij het inzoomen vliegt de camera daar letterlijk doorheen.
    const rnd = mulberry32(1987);
    const D = this.D;
    const pos = new Float32Array(ACHTERGROND_AANTAL * 3);
    const size = new Float32Array(ACHTERGROND_AANTAL);
    const fase = new Float32Array(ACHTERGROND_AANTAL);
    const helder = new Float32Array(ACHTERGROND_AANTAL);
    const tint = new Float32Array(ACHTERGROND_AANTAL * 3);
    const hoek = -0.42;
    const tinten = [
      [0.8, 0.86, 1],
      [0.92, 0.94, 1],
      [1, 0.93, 0.82],
      [1, 0.85, 0.7],
    ];
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    for (let i = 0; i < ACHTERGROND_AANTAL; i++) {
      const z = rnd() < 0.07 ? rnd() * 0.85 * D : -Math.pow(rnd(), 0.8) * 4 * D;
      const schaal = (D - z) / D;
      let x: number;
      let y: number;
      if (rnd() < 0.55) {
        const langs = (rnd() - 0.5) * 3.2;
        const dwars = gauss() * 0.28;
        x = Math.cos(hoek) * langs + Math.sin(hoek) * dwars;
        y = -Math.sin(hoek) * langs + Math.cos(hoek) * dwars;
      } else {
        x = (rnd() - 0.5) * (this.W / this.H) * 1.7;
        y = (rnd() - 0.5) * 1.7;
      }
      pos[i * 3] = x * this.H * schaal + this.W / 2;
      pos[i * 3 + 1] = y * this.H * schaal - this.H / 2;
      pos[i * 3 + 2] = z;
      size[i] = 2.4 + Math.pow(rnd(), 6) * 9;
      helder[i] = 0.2 + Math.pow(rnd(), 3) * 0.8;
      fase[i] = rnd();
      tint.set(tinten[Math.floor(rnd() * tinten.length)], i * 3);
    }
    this.achtergrondGeo.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    this.achtergrondGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.achtergrondGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.achtergrondGeo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    this.achtergrondGeo.setAttribute('aHelder', new THREE.BufferAttribute(helder, 1));
  }

  /** Zet de hele hemel in één keer naar een nieuw beeld. Sterren die niet vermeld worden, doven. */
  toon(beeld: Beeld, direct = false) {
    const duur = direct ? 0 : beeld.duur ?? 1.6;
    const ease = 'power2.inOut';

    for (const s of this.sterren) {
      this.zetSter(s, beeld.sterren[s.sleutel], direct, duur);
    }

    gsap.killTweensOf(this.cam);
    this.standaardCamera = !beeld.camera;
    const cam = beeld.camera ?? { x: this.W / 2, y: this.H / 2, zoom: 1 };
    gsap.to(this.cam, { ...cam, duration: direct ? 0 : beeld.cameraDuur ?? duur * 1.1, ease: 'power3.inOut' });

    const nieuweLijnen = beeld.lijnen ?? [];
    const nieuwDuel = beeld.duel ?? null;
    gsap.killTweensOf(this.sfeer);
    gsap.to(this.sfeer, { achtergrond: beeld.achtergrond, duration: duur, ease });
    this.toonWereld(beeld.wereld, direct, duur);
    if (beeld.mensen) this.zetMensenRang(beeld.mensen);
    const uitgelicht = beeld.mensenUitgelicht ?? null;
    if (uitgelicht !== null) this.mensenMat.uniforms.uFractie.value = uitgelicht;
    gsap.to(this.sfeer, { mensenNadruk: uitgelicht !== null ? 1 : 0, duration: direct ? 0 : 1.2, ease });
    gsap.to(this.sfeer, {
      mensen: beeld.mensen ?? 0,
      duration: direct ? 0 : beeld.mensenDuur ?? duur,
      ease: beeld.mensen ? 'power1.inOut' : 'power2.in',
    });

    const zelfdeLijnen = JSON.stringify(nieuweLijnen) === JSON.stringify(this.huidigeLijnen);
    if (zelfdeLijnen) {
      gsap.to(this.sfeer, { lijnAlpha: beeld.lijnAlpha ?? 0, duration: duur * 0.6, ease });
    } else {
      // Eerst de oude lijnen weg, dan de nieuwe tekenen zodra de sterren aangekomen zijn.
      gsap.to(this.sfeer, {
        lijnAlpha: 0,
        duration: direct ? 0 : 0.4,
        onComplete: () => {
          this.huidigeLijnen = nieuweLijnen;
          this.sfeer.lijnGroei = direct ? 1 : 0;
          gsap.to(this.sfeer, { lijnAlpha: beeld.lijnAlpha ?? 0, duration: direct ? 0 : 0.6, delay: direct ? 0 : duur * 0.75 });
          gsap.to(this.sfeer, { lijnGroei: 1, duration: direct ? 0 : 2.6, delay: direct ? 0 : duur * 0.75, ease: 'power1.inOut' });
        },
      });
    }

    if (JSON.stringify(nieuwDuel) === JSON.stringify(this.huidigDuel)) {
      gsap.to(this.sfeer, { duelAlpha: nieuwDuel ? 1 : 0, duration: duur * 0.6 });
    } else {
      gsap.to(this.sfeer, {
        duelAlpha: 0,
        duration: direct ? 0 : 0.3,
        onComplete: () => {
          this.huidigDuel = nieuwDuel;
          this.sfeer.duelGroei = direct ? 1 : 0;
          if (nieuwDuel) {
            gsap.to(this.sfeer, { duelAlpha: 1, duration: direct ? 0 : 0.4, delay: direct ? 0 : duur * 0.5 });
            gsap.to(this.sfeer, { duelGroei: 1, duration: direct ? 0 : 1.4, delay: direct ? 0 : duur * 0.5, ease: 'power2.inOut' });
          }
        },
      });
    }
  }

  /** Werkt alleen de genoemde sterren bij; null dooft er een. De rest van de hemel blijft ongemoeid. */
  werk(sterren: Record<string, SterDoel | null>, duur = 1.6) {
    for (const [sleutel, doel] of Object.entries(sterren)) {
      const s = this.index.get(sleutel);
      if (s) this.zetSter(s, doel ?? undefined, false, duur);
    }
  }

  private zetSter(s: SterToestand, doel: SterDoel | undefined, direct: boolean, duur: number) {
    const ease = 'power2.inOut';
    // Een ster die al onderweg is naar hetzelfde doel, laten we rustig verder vliegen.
    if (!direct && doel && s.vlucht && Math.abs(s.vlucht.x - doel.x) < 0.5 && Math.abs(s.vlucht.y - doel.y) < 0.5) return;
    gsap.killTweensOf(s);
    if (s.vlucht) {
      gsap.killTweensOf(s.vlucht);
      s.vlucht = null;
    }
    if (!doel) {
      s.doelAlpha = 0;
      gsap.to(s, { alpha: 0, label: 0, flikker: 0, puls: 0, duration: direct ? 0 : 0.8, ease });
      return;
    }
    const kleur = KLEUREN[doel.kleur ?? 'wit'];
    const alpha = doel.alpha ?? 1;
    s.doelAlpha = alpha;
    // Een ster die nog onzichtbaar is, verschijnt meteen op zijn plek in plaats van erheen te vliegen.
    if (s.alpha < 0.02) {
      gsap.set(s, { x: doel.x, y: doel.y, r: kleur[0], g: kleur[1], b: kleur[2], size: doel.size ?? 44 });
    }
    if (doel.startAlpha !== undefined && !direct) gsap.set(s, { alpha: doel.startAlpha });
    s.labelEl?.classList.toggle('nadruk', !!doel.nadruk);
    if (doel.vanaf && !direct) {
      this.vlieg(s, doel, kleur, alpha, duur);
      return;
    }
    gsap.to(s, {
      x: doel.x,
      y: doel.y,
      alpha,
      size: doel.size ?? 44,
      r: kleur[0],
      g: kleur[1],
      b: kleur[2],
      flikker: doel.flikker ?? 0,
      puls: doel.puls ?? 0,
      label: doel.label ?? 1,
      duration: duur,
      delay: direct ? 0 : doel.delay ?? 0,
      ease,
    });
  }

  /** Laat een ster in een boog vliegen met een lichtspoor dat achter hem uitdooft. */
  private vlieg(s: SterToestand, doel: SterDoel, kleur: [number, number, number], alpha: number, duur: number) {
    const van = doel.vanaf!;
    const delay = doel.delay ?? 0;
    const dx = doel.x - van.x;
    const dy = doel.y - van.y;
    const boog = doel.boog ?? 0.3;
    const cx = (van.x + doel.x) / 2 - dy * boog;
    const cy = (van.y + doel.y) / 2 + dx * boog;
    gsap.set(s, { x: van.x, y: van.y, alpha: 0, label: 0, spoor: 0, r: 1, g: 0.9, b: 0.7, size: (doel.size ?? 44) * 0.8 });
    s.spoorPunten = [];
    const vlucht = { t: 0, x: doel.x, y: doel.y };
    s.vlucht = vlucht;
    gsap.to(s, { alpha, spoor: 1, duration: 0.35, delay });
    gsap.to(vlucht, {
      t: 1,
      duration: duur,
      delay,
      ease: 'power2.inOut',
      onComplete: () => {
        if (s.vlucht === vlucht) s.vlucht = null;
      },
      onUpdate: () => {
        const t = vlucht.t;
        const u = 1 - t;
        s.x = u * u * van.x + 2 * u * t * cx + t * t * doel.x;
        s.y = u * u * van.y + 2 * u * t * cy + t * t * doel.y;
      },
    });
    gsap.to(s, {
      r: kleur[0],
      g: kleur[1],
      b: kleur[2],
      size: doel.size ?? 44,
      flikker: doel.flikker ?? 0,
      puls: doel.puls ?? 0,
      duration: 0.8,
      delay: delay + duur * 0.85,
    });
    gsap.to(s, { label: doel.label ?? 1, duration: 1, delay: delay + duur * 0.9 });
    gsap.to(s, { spoor: 0, duration: 1.4, delay: delay + duur * 0.9 });
  }

  private naarScherm(x: number, y: number): Pt2 {
    return {
      x: (x - this.cam.x - this.drift.x) * this.cam.zoom + this.W / 2,
      y: (y - this.cam.y - this.drift.y) * this.cam.zoom + this.H / 2,
    };
  }

  /** Geeft de dichtstbijzijnde zichtbare ster onder de muis, of null. */
  raak(cx: number, cy: number): string | null {
    let beste: string | null = null;
    let besteD = Infinity;
    for (const s of this.sterren) {
      if (s.doelAlpha < 0.3) continue;
      const p = this.naarScherm(s.x, s.y);
      let d = Math.hypot(p.x - cx, p.y - cy);
      if (s.labelEl && s.label > 0.1) {
        const r = s.labelEl.getBoundingClientRect();
        if (cx >= r.left - 8 && cx <= r.right + 8 && cy >= r.top - 8 && cy <= r.bottom + 8) d = Math.min(d, 20);
      }
      if (d < 56 && d < besteD) {
        beste = s.sleutel;
        besteD = d;
      }
    }
    return beste;
  }

  private frame(tijd: number) {
    const pos = this.sterGeo.attributes.position.array as Float32Array;
    const size = this.sterGeo.attributes.aSize.array as Float32Array;
    const kleur = this.sterGeo.attributes.aColor.array as Float32Array;
    const alpha = this.sterGeo.attributes.aAlpha.array as Float32Array;
    const zoomSize = 1 + (this.cam.zoom - 1) * 0.35;
    this.drift.x = Math.sin(tijd * 0.031) * 7;
    this.drift.y = Math.sin(tijd * 0.023 + 1.3) * 5;

    this.sterren.forEach((s, i) => {
      // Rustig, onregelmatig flikkeren: twee trage golven over elkaar.
      const golf = 0.5 + 0.5 * Math.sin(tijd * 2.1 + s.fase) * (0.65 + 0.35 * Math.sin(tijd * 4.3 + s.fase * 2));
      const flikker = 1 - s.flikker * 0.72 * golf;
      const puls = 1 + s.puls * 0.2 * Math.sin(tijd * 1.4 + s.fase);
      const a = s.alpha * flikker;
      pos[i * 3] = s.x;
      pos[i * 3 + 1] = -s.y;
      size[i] = s.size * SPRITE_FACTOR * puls * zoomSize;
      kleur.set([s.r, s.g, s.b], i * 3);
      alpha[i] = a * (1 + s.puls * 0.15 * Math.sin(tijd * 1.4 + s.fase));

      if (s.spoor > 0.01) {
        s.spoorPunten.push({ x: s.x, y: s.y });
        if (s.spoorPunten.length > 34) s.spoorPunten.shift();
      } else if (s.spoorPunten.length) {
        s.spoorPunten = [];
      }

      if (s.labelEl) {
        const p = this.naarScherm(s.x, s.y);
        const la = s.alpha * s.label * Math.sqrt(flikker);
        s.labelEl.style.opacity = la.toFixed(3);
        s.labelEl.style.visibility = la < 0.005 ? 'hidden' : 'visible';
        s.labelEl.style.transform = `translate3d(${p.x.toFixed(1)}px, ${(p.y + 22 * zoomSize).toFixed(1)}px, 0) translateX(-50%)`;
      }
    });
    for (const k of ['position', 'aSize', 'aColor', 'aAlpha']) this.sterGeo.attributes[k].needsUpdate = true;

    const goud = KLEUREN.goud;
    this.lijnen.zet(
      this.huidigeLijnen
        .map(([a, b], i, alle) => ({
          a: this.index.get(a)!,
          b: this.index.get(b)!,
          alpha: this.sfeer.lijnAlpha * 0.42,
          breedte: 2,
          kleur: goud,
          // Lijn na lijn getekend, met wat overlap, zoals iemand een sterrenbeeld natrekt.
          groei: Math.min(1, Math.max(0, (this.sfeer.lijnGroei * 1.6 - i / alle.length) * 3)),
        }))
        .filter((s) => s.a && s.b),
    );
    const duel = this.huidigDuel;
    this.duelLijn.zet(
      duel ? [{ a: this.index.get(duel[0])!, b: this.index.get(duel[1])!, alpha: this.sfeer.duelAlpha * 0.8, breedte: 3, kleur: goud, groei: this.sfeer.duelGroei }] : [],
    );

    const spoorSegmenten: SpoorSegment[] = [];
    for (const s of this.sterren) {
      const punten = s.spoorPunten;
      for (let i = 1; i < punten.length; i++) {
        const f = i / punten.length;
        spoorSegmenten.push({ a: punten[i - 1], b: punten[i], alpha: s.spoor * s.alpha * f * f * 0.9, breedte: 0.6 + f * 3.4, kleur: goud, groei: 1, rand: 0 });
      }
    }
    this.spoorLijnen.zet(spoorSegmenten);

    // Inzoomen = de camera echt naar voren bewegen, door de sterren heen.
    this.camera.position.set(this.cam.x + this.drift.x, -(this.cam.y + this.drift.y), this.D / this.cam.zoom);
    this.camera.updateMatrixWorld();
    this.achtergrondMat.uniforms.uTijd.value = tijd;
    this.achtergrondMat.uniforms.uAlpha.value = this.sfeer.achtergrond;
    this.nevelMat.uniforms.uTijd.value = tijd;
    this.mensenMat.uniforms.uTijd.value = tijd;
    this.wereldMat.uniforms.uTijd.value = tijd;
    this.wereldMat.uniforms.uAlpha.value = this.sfeer.wereld;
    this.wereldMat.uniforms.uZoom.value = 1 + (this.cam.zoom - 1) * 0.5;
    if (this.sfeer.wereld > 0.001 && this.wereldIso.length) {
      const kleur = this.wereldGeo.attributes.aKleur.array as Float32Array;
      const helder = this.wereldGeo.attributes.aHelder.array as Float32Array;
      const standaard = { r: 0.9, g: 0.92, b: 1, helder: 0 };
      this.wereldIso.forEach((iso, i) => {
        const st = this.wereldStaat.get(iso) ?? standaard;
        kleur[i * 3] = st.r;
        kleur[i * 3 + 1] = st.g;
        kleur[i * 3 + 2] = st.b;
        helder[i] = st.helder;
      });
      this.wereldGeo.attributes.aKleur.needsUpdate = true;
      this.wereldGeo.attributes.aHelder.needsUpdate = true;
    }
    this.mensenMat.uniforms.uAantal.value = this.sfeer.mensen;
    this.mensenMat.uniforms.uNadruk.value = this.sfeer.mensenNadruk;
    this.nevelMat.uniforms.uAlpha.value = this.sfeer.achtergrond;
    this.nevelMat.uniforms.uAspect.value = this.W / this.H;
    this.nevelMat.uniforms.uZoom.value = 1 + (this.cam.zoom - 1) * 0.12;
    this.nevelMat.uniforms.uVerschuif.value.set(((this.cam.x - this.W / 2) / this.H) * 0.12, (-(this.cam.y - this.H / 2) / this.H) * 0.12);

    this.renderer.clear();
    this.renderer.render(this.nevelScene, this.nevelCamera);
    this.renderer.render(this.achtergrondScene, this.camera);
    this.renderer.render(this.scene, this.camera);
  }
}

interface SpoorSegment {
  a: { x: number; y: number; alpha?: number };
  b: { x: number; y: number; alpha?: number };
  alpha: number;
  breedte: number;
  kleur: [number, number, number];
  groei: number;
  rand?: number;
}

interface Pt2 {
  x: number;
  y: number;
}
