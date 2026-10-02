import * as THREE from 'three';
import type { Style } from './styles';

/** Procedural grayscale textures (tinted by material colour). */
function canvasTexture(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const plateTexture = () =>
  canvasTexture(64, (c, s) => {
    c.fillStyle = '#e8e8e8';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#d6d6d6';
    c.fillRect(4, 4, s - 8, s - 8);
    // Diamond tread.
    c.fillStyle = '#c4c4c4';
    for (let y = 8; y < s - 8; y += 8) for (let x = 8 + ((y / 8) % 2) * 4; x < s - 8; x += 8) c.fillRect(x, y, 3, 2);
    c.fillStyle = '#9a9a9a';
    for (const [x, y] of [
      [6, 6],
      [s - 9, 6],
      [6, s - 9],
      [s - 9, s - 9],
    ])
      c.fillRect(x, y, 3, 3);
  });

const grateTexture = () =>
  canvasTexture(64, (c, s) => {
    c.fillStyle = '#3a3a3a';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#d8d8d8';
    for (let i = 0; i <= s; i += 12) {
      c.fillRect(i, 0, 3, s);
      c.fillRect(0, i, s, 3);
    }
  });

const deckTexture = () =>
  canvasTexture(64, (c, s) => {
    c.fillStyle = '#e2e2e2';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#cfcfcf';
    c.fillRect(0, s / 2 - 1, s, 2);
    c.fillRect(s / 2 - 1, 0, 2, s);
    c.fillStyle = '#b5b5b5';
    c.fillRect(0, 0, s, 2);
    c.fillRect(0, 0, 2, s);
  });

const crateTexture = () =>
  canvasTexture(64, (c, s) => {
    c.fillStyle = '#d0d0d0';
    c.fillRect(0, 0, s, s);
    c.lineWidth = 6;
    c.strokeStyle = '#8c8c8c';
    c.strokeRect(3, 3, s - 6, s - 6);
    c.beginPath();
    c.moveTo(6, 6);
    c.lineTo(s - 6, s - 6);
    c.stroke();
  });

const hazardTexture = () =>
  canvasTexture(64, (c, s) => {
    c.fillStyle = '#e8b52c';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#1b1b1b';
    for (let i = -s; i < s; i += 16) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 8, 0);
      c.lineTo(i + 8 + s, s);
      c.lineTo(i + s, s);
      c.fill();
    }
  });

/** Material set for the style. Every mesh in the scene takes its material from here. */
export class Materials {
  readonly floor: Record<'plate' | 'grate' | 'deck', THREE.MeshStandardMaterial>;
  readonly base: THREE.MeshStandardMaterial;
  readonly wall: THREE.MeshStandardMaterial;
  readonly wallTop: THREE.MeshStandardMaterial;
  readonly pipe: THREE.MeshStandardMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly darkMetal: THREE.MeshStandardMaterial;
  readonly rust: THREE.MeshStandardMaterial;
  readonly wood: THREE.MeshStandardMaterial;
  readonly crate: THREE.MeshStandardMaterial;
  readonly fabric: THREE.MeshStandardMaterial;
  readonly white: THREE.MeshStandardMaterial;
  readonly hazard: THREE.MeshStandardMaterial;
  readonly water: THREE.MeshStandardMaterial;
  readonly skin: THREE.MeshStandardMaterial;
  readonly dark: THREE.MeshStandardMaterial;
  private readonly cache = new Map<string, THREE.MeshStandardMaterial>();

  constructor(private readonly style: Style) {
    const c = style.colors;
    this.floor = {
      plate: this.make(c.floorPlate, { map: plateTexture() }),
      grate: this.make(c.floorGrate, { map: grateTexture(), metalness: Math.max(style.metalness, 0.4) }),
      deck: this.make(c.floorDeck, { map: deckTexture() }),
    };
    this.base = this.make(c.base, { roughness: 1, metalness: 0 });
    this.wall = this.make(c.wall);
    this.wallTop = this.make(c.wallTop);
    this.pipe = this.make(c.pipe, { metalness: Math.max(style.metalness, 0.5), roughness: 0.4 });
    this.metal = this.make(c.metal, { metalness: Math.max(style.metalness, 0.5), roughness: 0.45 });
    this.darkMetal = this.make(c.darkMetal);
    this.rust = this.make(c.rust, { roughness: 0.9 });
    this.wood = this.make(c.wood, { roughness: 0.9, metalness: 0 });
    this.crate = this.make(c.wood, { map: crateTexture(), roughness: 0.9, metalness: 0 });
    this.fabric = this.make(c.fabric, { roughness: 1, metalness: 0 });
    this.white = this.make(0xe8e4dc, { roughness: 0.8, metalness: 0 });
    this.hazard = this.make(0xffffff, { map: hazardTexture(), roughness: 0.8, metalness: 0 });
    // Water only catches direct lights (the flashlights): no environment reflections.
    this.water = new THREE.MeshStandardMaterial({
      color: c.water,
      transparent: true,
      opacity: 0.68,
      roughness: 0.28,
      metalness: 0,
      envMapIntensity: 0,
      emissive: c.water,
      emissiveIntensity: 0.06,
    });
    this.skin = this.make(0xe2b98f, { roughness: 0.9, metalness: 0 });
    this.dark = this.make(0x15181b, { roughness: 1, metalness: 0 });
  }

  make(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: this.style.roughness,
      metalness: this.style.metalness,
      ...extra,
    });
  }

  /** Cached solid colour (role suits, tank colours…). */
  color(color: number) {
    const key = `c${color}`;
    if (!this.cache.has(key)) this.cache.set(key, this.make(color));
    return this.cache.get(key)!;
  }

  /** Cached self-lit colour (lamps, screens, reactor core). */
  emissive(color: number, intensity = 1.5) {
    const key = `e${color}-${intensity}`;
    if (!this.cache.has(key)) {
      this.cache.set(
        key,
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5, metalness: 0 }),
      );
    }
    return this.cache.get(key)!;
  }
}
