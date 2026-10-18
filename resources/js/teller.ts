import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export type CameraStatus = 'uit' | 'laden' | 'aan' | 'fout';

const NEUS = 0;

/**
 * Telt hoeveel mensen er links, in het midden en rechts in het lokaal staan, volledig lokaal in de browser.
 * Het model en de wasm-bestanden staan in public/mediapipe. Er wordt geen beeld getoond, bewaard of verstuurd;
 * per meting blijven alleen drie getallen over.
 */
export class Teller {
  status: CameraStatus = 'uit';
  ruw: [number, number, number] = [0, 0, 0];
  correctie: [number, number, number] = [0, 0, 0];
  /** De camera kijkt naar de klas, dus links voor de klas is rechts in het camerabeeld. */
  spiegel = true;
  private luisteraars = new Set<() => void>();

  private video = document.createElement('video');
  private model: PoseLandmarker | null = null;
  private metingen: { tijd: number; zones: number[] }[] = [];
  private stabiel: [number, number, number] = [0, 0, 0];
  private timer = 0;

  luister(f: () => void): () => void {
    this.luisteraars.add(f);
    return () => this.luisteraars.delete(f);
  }

  private meld(): void {
    this.luisteraars.forEach((f) => f());
  }

  get zones(): [number, number, number] {
    return this.stabiel.map((n, i) => Math.max(0, n + this.correctie[i])) as [number, number, number];
  }

  async start(): Promise<void> {
    if (this.status === 'laden' || this.status === 'aan') return;
    this.status = 'laden';
    this.meld();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      this.video.srcObject = stream;
      this.video.muted = true;
      this.video.playsInline = true;
      await this.video.play();
      const bestanden = await FilesetResolver.forVisionTasks('/mediapipe');
      const opties = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: '/mediapipe/pose_landmarker_full.task', delegate },
        runningMode: 'VIDEO' as const,
        numPoses: 20,
        minPoseDetectionConfidence: 0.4,
        minPosePresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });
      this.model = await PoseLandmarker.createFromOptions(bestanden, opties('GPU')).catch(() =>
        PoseLandmarker.createFromOptions(bestanden, opties('CPU')),
      );
      this.status = 'aan';
    } catch (fout) {
      console.error('Camera of model niet beschikbaar', fout);
      this.status = 'fout';
    }
    this.meld();
  }

  /** Begint te tellen vanaf een eerder bewaarde telling (bv. bij terugkeren). */
  tel(vanaf: [number, number, number] = [0, 0, 0]): void {
    this.stoppen();
    this.metingen = [];
    this.stabiel = [...vanaf];
    this.correctie = [0, 0, 0];
    this.timer = window.setInterval(() => this.meet(), 200);
  }

  stoppen(): void {
    clearInterval(this.timer);
    this.timer = 0;
  }

  corrigeer(zone: number, stap: number): void {
    this.correctie[zone] += stap;
    this.meld();
  }

  private meet(): void {
    if (!this.model || this.video.readyState < 2) return;
    const resultaat = this.model.detectForVideo(this.video, performance.now());
    const zones: [number, number, number] = [0, 0, 0];
    for (const punten of resultaat.landmarks) {
      const x = this.spiegel ? 1 - punten[NEUS].x : punten[NEUS].x;
      zones[Math.min(2, Math.max(0, Math.floor(x * 3)))]++;
    }
    this.ruw = zones;
    this.verwerk(zones);
  }

  /** Mediaan per zone over de laatste 1,5 seconde, zodat iemand die even wegvalt de telling niet doet springen. */
  private verwerk(zones: number[]): void {
    const nu = performance.now();
    this.metingen.push({ tijd: nu, zones });
    this.metingen = this.metingen.filter((m) => nu - m.tijd < 1500);
    const mediaan = [0, 1, 2].map((z) => {
      const reeks = this.metingen.map((m) => m.zones[z]).sort((a, b) => a - b);
      return reeks[Math.floor(reeks.length / 2)];
    }) as [number, number, number];
    if (mediaan.some((n, i) => n !== this.stabiel[i])) {
      this.stabiel = mediaan;
      this.meld();
    }
  }
}
