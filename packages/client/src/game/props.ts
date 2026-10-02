import * as THREE from 'three';
import type { Materials } from './materials';
import type { Style } from './styles';

export type PropKind =
  | 'bunk'
  | 'locker'
  | 'console'
  | 'sonar'
  | 'periscope'
  | 'reactor'
  | 'generator'
  | 'tank'
  | 'barrel'
  | 'crate'
  | 'toolbench'
  | 'table'
  | 'chair'
  | 'beacon'
  | 'pod'
  | 'torpedo'
  | 'planter'
  | 'labbench'
  | 'centrifuge'
  | 'counter'
  | 'fridge'
  | 'longtable';

export interface PropDef {
  kind: PropKind;
  /** Top-left cell of the footprint (world cells). */
  x: number;
  z: number;
  /** Footprint in cells (default 1×1). */
  w?: number;
  d?: number;
  /** Quarter turns: 0 faces south (+z), 1 west, 2 north, 3 east. */
  rot?: 0 | 1 | 2 | 3;
  /** Colour variant for tanks and barrels. */
  tint?: 'red' | 'yellow' | 'blue' | 'rust';
  /** Mounted on a wall: never blocks movement. */
  wall?: boolean;
}

export interface BuiltProp {
  group: THREE.Group;
  /** Called every frame with the time in seconds. */
  animate?: (t: number) => void;
}

const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
};

const cyl = (r: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 12) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
};

function screenTexture(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 20;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#081410';
  c.fillRect(0, 0, 32, 20);
  c.fillStyle = color;
  for (let y = 3; y < 18; y += 4) c.fillRect(3, y, 6 + ((y * 7) % 20), 2);
  c.fillRect(24, 4, 5, 12);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildProp(def: PropDef, m: Materials, style: Style): BuiltProp {
  const w = def.w ?? 1;
  const d = def.d ?? 1;
  const g = new THREE.Group();
  g.position.set(def.x + w / 2, 0, def.z + d / 2);
  g.rotation.y = -(def.rot ?? 0) * (Math.PI / 2);
  let animate: BuiltProp['animate'];

  switch (def.kind) {
    case 'bunk': {
      // Two stacked berths against the wall.
      for (const [px, pz] of [
        [-w / 2 + 0.08, -0.38],
        [w / 2 - 0.08, -0.38],
        [-w / 2 + 0.08, 0.38],
        [w / 2 - 0.08, 0.38],
      ])
        g.add(box(0.07, 1.35, 0.07, m.darkMetal, px, 0, pz));
      for (const y of [0.3, 0.92]) {
        g.add(box(w - 0.1, 0.06, 0.8, m.darkMetal, 0, y));
        g.add(box(w - 0.2, 0.12, 0.72, m.fabric, 0, y + 0.06));
        g.add(box(0.32, 0.08, 0.5, m.white, -w / 2 + 0.3, y + 0.18));
      }
      break;
    }
    case 'locker': {
      g.add(box(0.7, 1.45, 0.55, m.metal, 0, 0, -0.12));
      g.add(box(0.02, 1.3, 0.02, m.darkMetal, 0, 0.08, 0.16));
      for (const y of [1.15, 1.22, 1.29]) g.add(box(0.5, 0.025, 0.02, m.darkMetal, 0, y, 0.16));
      break;
    }
    case 'console': {
      g.add(box(0.85, 0.75, 0.5, m.darkMetal, 0, 0, -0.18));
      const top = box(0.85, 0.08, 0.42, m.metal, 0, 0, 0);
      top.position.set(0, 0.86, -0.08);
      top.rotation.x = 0.55;
      g.add(top);
      const screenTex = screenTexture('#7dffc0');
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.3),
        new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.2 }),
      );
      // Lie on the sloped top (tilted 0.55 rad towards the viewer), just above it.
      screen.position.set(0, 0.945, -0.05);
      screen.rotation.x = -(Math.PI / 2 - 0.55);
      g.add(screen);
      for (let i = 0; i < 4; i++) g.add(box(0.06, 0.04, 0.06, m.emissive([0xff5040, 0xffd040, 0x50ff90, 0x40c0ff][i], 2), -0.3 + i * 0.2, 0.74, 0.05));
      const mat = screen.material as THREE.MeshStandardMaterial;
      animate = (t) => (mat.emissiveIntensity = 1.0 + 0.25 * Math.sin(t * 7 + def.x));
      break;
    }
    case 'sonar': {
      g.add(cyl(0.35, 0.75, m.darkMetal, 0, 0, 0, 10));
      g.add(cyl(0.44, 0.08, m.metal, 0, 0.75, 0, 16));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.38, 24),
        new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.3 }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.84;
      g.add(disc);
      let last = -1;
      animate = (t) => {
        if (t - last < 1 / 30) return;
        last = t;
        const a = (t * 1.6) % (Math.PI * 2);
        ctx.fillStyle = 'rgba(4,20,14,0.22)';
        ctx.fillRect(0, 0, 96, 96);
        ctx.strokeStyle = 'rgba(93,255,176,0.35)';
        ctx.lineWidth = 1;
        for (const r of [16, 30, 44]) {
          ctx.beginPath();
          ctx.arc(48, 48, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = '#7dffc0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(48, 48);
        ctx.lineTo(48 + Math.cos(a) * 46, 48 + Math.sin(a) * 46);
        ctx.stroke();
        // A blip that lights up when the sweep passes it.
        const blip = 0.9;
        if (Math.abs(((a - blip + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > Math.PI - 0.25) {
          ctx.fillStyle = '#d8ffe8';
          ctx.fillRect(48 + Math.cos(blip) * 30 - 3, 48 + Math.sin(blip) * 30 - 3, 6, 6);
        }
        tex.needsUpdate = true;
      };
      break;
    }
    case 'periscope': {
      g.add(cyl(0.3, 0.08, m.darkMetal, 0, 0, 0, 12));
      g.add(cyl(0.08, 2.6, m.metal, 0, 0, 0, 10));
      g.add(box(0.26, 0.3, 0.3, m.darkMetal, 0, 1.25, 0.06));
      g.add(box(0.16, 0.1, 0.1, m.dark, 0, 1.36, 0.24));
      for (const s of [-1, 1]) {
        const handle = cyl(0.03, 0.26, m.rust, 0, 0, 0, 6);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(s * 0.26, 1.32, 0.06);
        g.add(handle);
      }
      break;
    }
    case 'reactor': {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.78, 24), m.hazard);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      g.add(ring);
      g.add(cyl(0.5, 0.25, m.darkMetal, 0, 0, 0, 16));
      g.add(cyl(0.5, 0.2, m.darkMetal, 0, 1.55, 0, 16));
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 1.3, 16, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x9ad8e8, transparent: true, opacity: 0.25, roughness: 0.1, side: THREE.DoubleSide }),
      );
      glass.position.y = 0.9;
      g.add(glass);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0xff6a30, emissive: 0xff4a20, emissiveIntensity: 2.5 });
      const core = cyl(0.18, 1.3, coreMat, 0, 0.25, 0, 10);
      g.add(core);
      for (let i = 0; i < 4; i++) {
        const strut = box(0.06, 1.3, 0.06, m.metal, Math.cos((i * Math.PI) / 2) * 0.44, 0.25, Math.sin((i * Math.PI) / 2) * 0.44);
        g.add(strut);
      }
      const light = new THREE.PointLight(0xff6a30, 8, 5, 2);
      light.position.y = 1;
      g.add(light);
      animate = (t) => {
        const k = 0.75 + 0.25 * Math.sin(t * 2.2) + 0.05 * Math.sin(t * 17);
        coreMat.emissiveIntensity = 2.5 * k;
        light.intensity = 8 * k;
        core.rotation.y = t;
      };
      break;
    }
    case 'generator': {
      g.add(box(w - 0.2, 0.85, 0.75, m.darkMetal, 0, 0, -0.05));
      g.add(box(w - 0.3, 0.1, 0.65, m.metal, 0, 0.85, -0.05));
      for (const s of [-1, 1]) {
        const fan = cyl(0.26, 0.08, m.metal, 0, 0, 0, 12);
        fan.rotation.x = Math.PI / 2;
        fan.position.set(s * 0.45, 0.45, 0.36);
        g.add(fan);
      }
      const leds = [0, 1, 2].map((i) => {
        const led = box(0.05, 0.05, 0.02, m.emissive(0xffb040, 2), -0.1 + i * 0.1, 0.65, 0.33);
        g.add(led);
        return led;
      });
      animate = (t) => leds.forEach((l, i) => (l.visible = Math.sin(t * 3 + i * 2 + def.x) > -0.2));
      break;
    }
    case 'tank': {
      const mat = m.color({ red: 0xc0392b, yellow: 0xd9a52b, blue: 0x2f6fb0, rust: 0x8a4a2a }[def.tint ?? 'red']);
      g.add(cyl(0.2, 0.85, mat, 0, 0, 0, 10));
      g.add(cyl(0.08, 0.12, m.metal, 0, 0.85, 0, 8));
      break;
    }
    case 'barrel': {
      g.add(cyl(0.3, 0.8, m.rust, 0, 0, 0, 12));
      for (const y of [0.18, 0.58]) g.add(cyl(0.31, 0.05, m.darkMetal, 0, y, 0, 12));
      break;
    }
    case 'crate':
      g.add(box(0.78, 0.7, 0.78, m.crate));
      break;
    case 'toolbench': {
      g.add(box(0.85, 0.08, 0.6, m.wood, 0, 0.7, -0.1));
      for (const [px, pz] of [
        [-0.38, -0.35],
        [0.38, -0.35],
        [-0.38, 0.15],
        [0.38, 0.15],
      ])
        g.add(box(0.06, 0.7, 0.06, m.darkMetal, px, 0, pz));
      g.add(box(0.3, 0.12, 0.18, m.color(0xc0392b), -0.18, 0.78, -0.15));
      g.add(box(0.22, 0.04, 0.05, m.metal, 0.2, 0.78, -0.05));
      break;
    }
    case 'table': {
      g.add(box(0.8, 0.06, 0.6, m.metal, 0, 0.7));
      g.add(cyl(0.06, 0.7, m.darkMetal, 0, 0, 0, 8));
      g.add(box(0.12, 0.1, 0.12, m.white, 0.2, 0.76, 0.1));
      break;
    }
    case 'chair': {
      g.add(cyl(0.05, 0.42, m.darkMetal, 0, 0, 0, 8));
      g.add(box(0.42, 0.07, 0.42, m.fabric, 0, 0.42));
      g.add(box(0.42, 0.45, 0.06, m.fabric, 0, 0.49, -0.2));
      break;
    }
    case 'pod': {
      // Escape capsule lying in its launch cradle, hatch facing the room.
      g.add(box(w - 0.1, 0.18, d - 0.3, m.darkMetal));
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, Math.max(0.2, w - 1.3), 6, 12), m.color(0xd9a52b));
      hull.rotation.z = Math.PI / 2;
      hull.position.y = 0.72;
      hull.castShadow = true;
      g.add(hull);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.12, 12), m.darkMetal);
      stripe.rotation.z = Math.PI / 2;
      stripe.position.y = 0.72;
      g.add(stripe);
      const hatch = new THREE.Mesh(new THREE.CircleGeometry(0.24, 14), m.metal);
      hatch.position.set(0.35, 0.78, 0.5);
      g.add(hatch);
      const window = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), m.emissive(0x8fd8ff, 1.2));
      window.position.set(0.35, 0.8, 0.505);
      g.add(window);
      const lamp = box(0.1, 0.1, 0.1, m.emissive(0xff4030, 2), -0.5, 1.2, 0);
      g.add(lamp);
      animate = (t) => (lamp.visible = Math.sin(t * 4) > 0);
      break;
    }
    case 'torpedo': {
      // A rack of torpedoes along the wall.
      for (const [y, z] of [
        [0.25, -0.1],
        [0.7, -0.1],
      ]) {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, w - 0.4, 10), m.color(0x5a6a50));
        body.rotation.z = Math.PI / 2;
        body.position.set(0, y + 0.17, z);
        g.add(body);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 10), m.color(0x5a6a50));
        nose.rotation.z = -Math.PI / 2;
        nose.position.set(w / 2 - 0.05, y + 0.17, z);
        g.add(nose);
      }
      for (const x of [-w / 2 + 0.3, w / 2 - 0.5]) g.add(box(0.08, 1.05, 0.5, m.darkMetal, x, 0, -0.1));
      break;
    }
    case 'planter': {
      // Raised hydroponic bed with a row of plants under a magenta grow lamp.
      g.add(box(w - 0.12, 0.45, 0.8, m.darkMetal));
      g.add(box(w - 0.24, 0.06, 0.68, m.color(0x3a2a1c), 0, 0.45));
      const leaf = m.color(0x4f8f3a);
      const leafDark = m.color(0x2f6a2a);
      const n = Math.round(w * 3);
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 0.25 + (i * (w - 0.5)) / Math.max(1, n - 1);
        const z = i % 2 ? 0.14 : -0.14;
        const h = 0.28 + ((i * 37) % 5) * 0.05;
        const plant = new THREE.Mesh(new THREE.ConeGeometry(0.13, h, 5), i % 3 ? leaf : leafDark);
        plant.position.set(x, 0.51 + h / 2, z);
        plant.rotation.y = i;
        g.add(plant);
      }
      for (const s of [-1, 1]) g.add(box(0.04, 1.25, 0.04, m.darkMetal, s * (w / 2 - 0.12), 0.45, -0.36));
      g.add(box(w - 0.2, 0.05, 0.12, m.darkMetal, 0, 1.68, -0.36));
      const lamp = box(w - 0.3, 0.035, 0.1, m.emissive(0xff5ad8, 2.4), 0, 1.645, -0.3);
      g.add(lamp);
      break;
    }
    case 'labbench': {
      g.add(box(w - 0.1, 0.78, 0.62, m.white, 0, 0, -0.12));
      g.add(box(w - 0.06, 0.05, 0.68, m.darkMetal, 0, 0.78, -0.12));
      // Glassware with glowing samples.
      const colors = [0x5dffb0, 0x40c0ff, 0xffd040, 0x5dffb0];
      for (let i = 0; i < Math.round(w * 2); i++) {
        const x = -w / 2 + 0.25 + i * 0.42;
        if (x > w / 2 - 0.15) break;
        const flask = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), m.emissive(colors[i % colors.length], 1.3));
        flask.position.set(x, 0.93, -0.18 + (i % 2) * 0.16);
        g.add(flask);
        g.add(cyl(0.022, 0.1, m.metal, x, 1.02, -0.18 + (i % 2) * 0.16, 6));
      }
      // A microscope at one end.
      g.add(box(0.16, 0.05, 0.2, m.darkMetal, w / 2 - 0.28, 0.83, -0.2));
      const tube = cyl(0.035, 0.3, m.darkMetal, w / 2 - 0.28, 0.86, -0.25, 8);
      tube.rotation.x = 0.35;
      g.add(tube);
      break;
    }
    case 'centrifuge': {
      g.add(cyl(0.36, 0.7, m.white, 0, 0, 0, 16));
      g.add(cyl(0.3, 0.04, m.darkMetal, 0, 0.7, 0, 16));
      const rotor = new THREE.Group();
      rotor.position.y = 0.76;
      for (let i = 0; i < 4; i++) {
        const arm = box(0.42, 0.04, 0.06, m.metal);
        arm.rotation.y = (i * Math.PI) / 4;
        rotor.add(arm);
      }
      g.add(rotor);
      const led = box(0.08, 0.05, 0.02, m.emissive(0x5dffb0, 2), 0, 0.5, 0.36);
      g.add(led);
      animate = (t) => {
        rotor.rotation.y = t * 9;
        led.visible = Math.sin(t * 5) > -0.4;
      };
      break;
    }
    case 'counter': {
      // Galley counter: cupboards, a hot plate and a couple of pots.
      g.add(box(w - 0.06, 0.82, 0.66, m.metal, 0, 0, -0.1));
      g.add(box(w - 0.02, 0.05, 0.72, m.darkMetal, 0, 0.82, -0.1));
      for (let i = 0; i < w; i++) g.add(box(0.8, 0.6, 0.02, m.darkMetal, -w / 2 + 0.5 + i, 0.1, 0.24));
      for (const x of [-w / 2 + 0.45, -w / 2 + 0.95]) {
        g.add(cyl(0.15, 0.015, m.emissive(0xff5020, 1.4), x, 0.87, -0.12, 14));
      }
      g.add(cyl(0.14, 0.22, m.metal, -w / 2 + 0.45, 0.885, -0.12, 12));
      g.add(cyl(0.12, 0.12, m.darkMetal, -w / 2 + 0.95, 0.885, -0.12, 12));
      for (let i = 0; i < 3; i++) g.add(box(0.2, 0.06, 0.2, m.white, w / 2 - 0.35 - i * 0.28, 0.87, -0.15));
      break;
    }
    case 'fridge': {
      g.add(box(0.78, 1.55, 0.6, m.white, 0, 0, -0.1));
      g.add(box(0.02, 0.04, 0.02, m.darkMetal, 0, 0.98, 0.21));
      g.add(box(0.04, 0.5, 0.04, m.darkMetal, 0.3, 0.9, 0.22));
      g.add(box(0.78, 0.02, 0.01, m.darkMetal, 0, 0.98, 0.205));
      break;
    }
    case 'longtable': {
      // Mess table with fixed benches on both long sides (footprint w × 2).
      const along = w - 0.2;
      g.add(box(along, 0.06, 0.7, m.metal, 0, 0.72));
      for (const x of [-along / 2 + 0.2, along / 2 - 0.2]) g.add(box(0.08, 0.72, 0.5, m.darkMetal, x, 0));
      for (const z of [-0.68, 0.68]) {
        g.add(box(along, 0.06, 0.32, m.fabric, 0, 0.42, z));
        for (const x of [-along / 2 + 0.2, along / 2 - 0.2]) g.add(box(0.06, 0.42, 0.06, m.darkMetal, x, 0, z));
      }
      for (let i = 0; i < Math.round(w); i++) {
        g.add(box(0.26, 0.03, 0.2, m.white, -along / 2 + 0.45 + i * (along - 0.9) / Math.max(1, Math.round(w) - 1), 0.78, i % 2 ? 0.14 : -0.14));
      }
      break;
    }
    case 'beacon': {
      // Wall-mounted: sits on the north edge of its cell.
      g.position.set(def.x + 0.5, 1.15, def.z + 0.12);
      g.add(box(0.26, 0.12, 0.14, m.darkMetal, 0, -0.06, 0));
      const domeMat = new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 2, transparent: true, opacity: 0.9 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      dome.position.y = 0.06;
      g.add(dome);

      // A real rotating beam sweeping the room.
      const pivot = new THREE.Object3D();
      pivot.position.y = 0.12;
      g.add(pivot);
      const beam = new THREE.SpotLight(0xff2a18, style.alarm.intensity, 9, 0.45, 0.5, 2);
      pivot.add(beam);
      const target = new THREE.Object3D();
      target.position.set(3, -1.6, 0);
      pivot.add(target);
      beam.target = target;
      animate = (t) => {
        pivot.rotation.y = t * 2.6;
        domeMat.emissiveIntensity = 1.4 + Math.max(0, Math.sin(t * 2.6 + Math.PI / 2)) * 2;
      };
      break;
    }
  }

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group: g, animate };
}

/** Cells blocked by a prop (wall-mounted props block nothing). */
export function propFootprint(def: PropDef): [number, number][] {
  if (def.wall) return [];
  const cells: [number, number][] = [];
  for (let x = def.x; x < def.x + (def.w ?? 1); x++) for (let z = def.z; z < def.z + (def.d ?? 1); z++) cells.push([x, z]);
  return cells;
}
