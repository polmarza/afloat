import * as THREE from 'three';
import type { RoleId as Role } from '@afloat/shared/content/roles';
import type { Condition } from '@afloat/shared/engine/types';
import type { Materials } from './materials';
import { ROLE_COLOR, type Style } from './styles';

/** Low-poly crew figure built from boxes, with a flashlight and simple procedural animation. */
export class CrewFigure {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly legs: THREE.Object3D[] = [];
  private readonly arms: THREE.Object3D[] = [];
  private readonly ring: THREE.Mesh;
  private walkPhase = 0;
  private readonly spot: THREE.SpotLight;
  private readonly spotTarget: THREE.Object3D;
  private readonly torch: THREE.Mesh;
  private condition: Condition = 'ok';
  /** Flashlight switched on (off at the start; players toggle it for free with L). */
  torchOn = false;
  /**
   * The active player's beam is drawn by a single shared shadow-casting light
   * (see App); while this is set, the figure's own light stays off.
   */
  private hero = false;
  walking = false;
  selected = false;
  /** Lying on the floor (unconscious or dead). */
  private down = false;
  private gone = false;

  constructor(role: Role, m: Materials, style: Style) {
    const suit = m.color(ROLE_COLOR[role]);
    const boots = m.dark;
    this.root.add(this.body);

    const limb = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number) => {
      // Pivot at the top so the limb swings from the hip/shoulder.
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.y = -h / 2;
      pivot.add(mesh);
      this.body.add(pivot);
      return pivot;
    };

    this.legs.push(limb(0.13, 0.42, 0.15, suit, -0.09, 0.44), limb(0.13, 0.42, 0.15, suit, 0.09, 0.44));
    for (const leg of this.legs) {
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.2), boots);
      boot.position.set(0, -0.4, 0.03);
      leg.add(boot);
    }

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.22), suit);
    torso.position.y = 0.64;
    this.body.add(torso);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.05, 0.23), m.darkMetal);
    belt.position.y = 0.46;
    this.body.add(belt);

    this.arms.push(limb(0.1, 0.38, 0.12, suit, -0.24, 0.82), limb(0.1, 0.38, 0.12, suit, 0.24, 0.82));
    for (const arm of this.arms) {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.1), m.skin);
      hand.position.y = -0.4;
      arm.add(hand);
    }

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), m.skin);
    head.position.y = 1.0;
    this.body.add(head);
    // Face: two eyes, a nose and a mouth on the front of the head.
    const face = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      this.body.add(mesh);
    };
    for (const x of [-0.06, 0.06]) face(0.042, 0.048, 0.012, m.dark, x, 1.035, 0.131);
    face(0.032, 0.06, 0.035, m.color(0xc9976c), 0, 0.985, 0.14);
    face(0.085, 0.018, 0.012, m.color(0x6e3a30), 0, 0.925, 0.131);

    this.addRoleDetails(role, m, head);

    // Flashlight in the right hand, beam pointing forward and down.
    const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 6), m.darkMetal);
    torch.rotation.x = Math.PI / 2;
    torch.position.set(0, -0.4, 0.08);
    this.arms[1].add(torch);
    this.torch = torch;
    const spot = new THREE.SpotLight(0xfff2d8, style.crewLight.intensity, style.crewLight.distance, style.crewLight.angle, 0.55, 2);
    spot.position.set(0.24, 0.6, 0.15);
    // No shadows here: only the active player's beam casts them (one shared light).
    spot.userData.full = style.crewLight.intensity;
    const target = new THREE.Object3D();
    target.position.set(0.1, 0, 3);
    this.body.add(spot, target);
    spot.target = target;
    this.spot = spot;
    this.spotTarget = target;

    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 24), m.emissive(0xf0a030, 1.6));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    this.root.add(this.ring);

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o !== this.ring) o.castShadow = true;
    });
  }

  private addRoleDetails(role: Role, m: Materials, head: THREE.Mesh) {
    const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
      mesh.position.set(x, y, z);
      this.body.add(mesh);
    };
    switch (role) {
      case 'engineer': {
        // Hard hat.
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.1, 8), m.color(0xf2c230)), 0, head.position.y + 0.17, 0);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.34), m.color(0xf2c230)), 0, head.position.y + 0.13, 0.02);
        break;
      }
      case 'medic': {
        // Red cross on the chest and a white cap.
        add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.01), m.color(0xd22b2b)), 0, 0.7, 0.112);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.01), m.color(0xd22b2b)), 0, 0.7, 0.112);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.07, 0.27), m.white), 0, head.position.y + 0.165, 0);
        break;
      }
      case 'soldier':
        add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.3), m.color(0x3f5a2a)), 0.02, head.position.y + 0.16, 0);
        break;
      case 'hacker':
        add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.06), m.dark), 0, head.position.y + 0.14, 0);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.1), m.dark), 0.15, head.position.y, 0);
        break;
      case 'diver': {
        const helmet = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xa8e0ff, transparent: true, opacity: 0.35, roughness: 0.1 }),
        );
        add(helmet, 0, head.position.y, 0);
        break;
      }
    }
  }

  /** Unconscious crew lie down with the torch on the floor; the dead lose their light. */
  setCondition(condition: Condition) {
    this.condition = condition;
    this.down = condition !== 'ok';
    this.body.rotation.x = this.down ? -Math.PI / 2 : 0;
    this.body.position.z = this.down ? -0.45 : 0;
    this.applyLight();
  }

  /** Switches the flashlight on or off (and lowers the arm when off). */
  setTorch(on: boolean) {
    this.torchOn = on;
    this.applyLight();
  }

  /** Hides the flashlight entirely (portraits). */
  hideTorch() {
    this.setTorch(false);
    this.torch.visible = false;
  }

  /** Lights are dimmed, never hidden: changing the light count recompiles every shader. */
  private applyLight() {
    this.spot.intensity = this.hero ? 0 : this.beamIntensity();
  }

  /** How bright this figure's flashlight should be right now. */
  beamIntensity() {
    const lit = this.torchOn && this.condition !== 'dead' && !this.gone;
    return lit ? (this.spot.userData.full as number) * (this.condition === 'ok' ? 1 : 0.25) : 0;
  }

  /** Hands the beam to (or takes it back from) the shared shadow-casting light. */
  setHero(on: boolean) {
    this.hero = on;
    this.applyLight();
  }

  /** World position and aim of the flashlight, for the shared shadow-casting light. */
  beamPose(position: THREE.Vector3, target: THREE.Vector3) {
    this.spot.getWorldPosition(position);
    this.spotTarget.getWorldPosition(target);
  }

  /** Left the ship: lights off (the figure shrinks away instead of being hidden). */
  vanish() {
    this.gone = true;
    this.applyLight();
  }

  update(dt: number, t: number) {
    const target = this.walking ? 1 : 0;
    this.walkPhase += dt * (this.walking ? 11 : 0);
    const swing = Math.sin(this.walkPhase) * 0.6 * target;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.8;
    // With the torch on, that arm stays raised, pointing ahead.
    this.arms[1].rotation.x = this.torchOn ? -0.9 + swing * 0.15 : swing * 0.8;
    if (this.down) this.body.position.y = 0.12;
    else this.body.position.y = this.walking ? Math.abs(Math.sin(this.walkPhase)) * 0.04 : Math.sin(t * 2) * 0.006;
    this.ring.visible = this.selected;
    if (this.selected) this.ring.scale.setScalar(1 + 0.06 * Math.sin(t * 5));
  }
}
