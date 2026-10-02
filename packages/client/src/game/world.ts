// 3D view of the ship, built from the engine's GameState and kept in sync
// through small update methods driven by GameEvents.

import * as THREE from 'three';
import { ROOM_D, ROOM_W } from '@afloat/shared/config/balance';
import { ROOM_NAMES } from '@afloat/shared/content/rooms';
import type { Door, GameState, Room } from '@afloat/shared/engine/types';
import type { Materials } from './materials';
import { buildProp, type BuiltProp, type PropDef } from './props';
import { FLOOR_OF, propsForRoom } from './roomProps';
import { DOOR_COLOR, type Style } from './styles';
import { ease, type Tweens } from './tweens';

const WALL_T = 0.14;
const H_BACK = 1.45;
const H_FRONT = 0.22;
const H_INNER = 0.85;
const DOOR_H = 1.3;
const STEPS = 3;
const ROOM_LIGHT_POOL = 6;
const FIRE_LIGHT_POOL = 2;
/** How far a lower-deck room sits below the main deck. */
export const SUNKEN_DEPTH = 0.6;
const WATER_LEVEL = 0.38;

export type Cell = [number, number];

export interface RoomView {
  room: Room;
  rect: { x: number; z: number; w: number; d: number };
  level: number;
  group: THREE.Group;
  tiles: THREE.Mesh[];
  props: { built: BuiltProp; def: PropDef; baseY: number }[];
  /** 0→1 while a revealed room's lights fade in. */
  lightLevel: number;
  water?: THREE.Mesh;
  fire: THREE.Group;
  revealed: boolean;
}

interface WallView {
  rooms: string[];
  normal: Cell | null;
  group: THREE.Group;
  body: THREE.Mesh;
  cap: THREE.Mesh;
  pipe?: THREE.Mesh;
  bottom: number;
  height: number;
  scaleK: number;
}

export interface DoorView {
  door: Door;
  group: THREE.Group;
  hinge: THREE.Group;
  lamp: THREE.Mesh;
  bands: THREE.Mesh[];
  crate?: THREE.Mesh;
  crateCell?: Cell;
  blockedEdge?: string;
  open: boolean;
}

export const cellKey = (x: number, z: number) => `${x},${z}`;

export function edgeKey(a: Cell, b: Cell) {
  const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
  return `${p[0]},${p[1]}|${q[0]},${q[1]}`;
}

export class World {
  readonly root = new THREE.Group();
  readonly rooms = new Map<string, RoomView>();
  readonly doors = new Map<string, DoorView>();
  /** Cells nobody can stand on (furniture, crates). */
  readonly blocked = new Set<string>();
  private readonly blockedEdges = new Set<string>();
  private readonly doorByEdge = new Map<string, DoorView>();
  private readonly stairs = new Map<string, Cell>();
  private readonly walls: WallView[] = [];
  private readonly cellRoom = new Map<string, string>();
  private readonly animated: BuiltProp[] = [];
  private readonly beacons: { built: BuiltProp; lights: THREE.Light[] }[] = [];
  /**
   * Every light in the ship, moved to the root so it is always "in the scene".
   * Showing or hiding a light changes the light count, which makes three.js
   * recompile every shader (a visible hitch); instead, hidden rooms keep their
   * lights at intensity 0.
   */
  private readonly lights: { light: THREE.Light; roomId: string; kind: 'prop' | 'beacon' }[] = [];
  /**
   * Shared ceiling and fire lights, handed to the revealed rooms nearest the
   * focus (the active player). A fixed pool keeps the light count constant and
   * small: every light costs on every pixel, which hurts on integrated GPUs.
   */
  private readonly roomPool: THREE.PointLight[] = [];
  private readonly firePool: THREE.PointLight[] = [];
  private focus = new THREE.Vector2();
  private power = false;

  constructor(
    state: GameState,
    private readonly m: Materials,
    private readonly style: Style,
    private readonly tweens: Tweens,
  ) {
    this.power = state.systems.power.repaired;
    for (const r of Object.values(state.rooms)) {
      const { x, z, w, d } = rectOf(r);
      for (let cx = x; cx < x + w; cx++) for (let cz = z; cz < z + d; cz++) this.cellRoom.set(cellKey(cx, cz), r.id);
    }
    for (const d of Object.values(state.doors)) {
      for (const [cell, other] of [
        [d.a, d.b],
        [d.b, d.a],
      ] as [Cell, Cell][]) {
        const room = state.rooms[this.roomAt(...cell)!];
        if (room.lowerDeck) this.stairs.set(cellKey(...cell), other);
      }
    }
    for (const r of Object.values(state.rooms)) this.buildRoom(r, state);
    this.buildWalls(state);
    for (const d of Object.values(state.doors)) this.buildDoor(d, state);
    for (let i = 0; i < ROOM_LIGHT_POOL; i++) this.roomPool.push(this.pooledLight(this.style.roomLight.color, ROOM_W * 1.3));
    for (let i = 0; i < FIRE_LIGHT_POOL; i++) this.firePool.push(this.pooledLight(0xff6a20, 6));
    this.hoistLights();
    for (const r of Object.values(state.rooms)) if (r.discovered) this.reveal(r.id, null, false);
  }

  // ------------------------------------------------------------------ queries

  roomAt(x: number, z: number) {
    return this.cellRoom.get(cellKey(x, z)) ?? null;
  }

  cellY(x: number, z: number) {
    if (this.stairs.has(cellKey(x, z))) return -SUNKEN_DEPTH / 2;
    const id = this.roomAt(x, z);
    return id ? this.rooms.get(id)!.level : 0;
  }

  canStep(a: Cell, b: Cell) {
    const ra = this.roomAt(...a);
    const rb = this.roomAt(...b);
    if (!rb || !this.isRevealed(rb) || this.blocked.has(cellKey(...b))) return false;
    if (this.blockedEdges.has(edgeKey(a, b))) return false;
    if (ra === rb) return true;
    return !!this.doorByEdge.get(edgeKey(a, b))?.open;
  }

  isRevealed(roomId: string | null) {
    return !!roomId && !!this.rooms.get(roomId)?.revealed;
  }

  /** Door cell on the side of `roomId`. */
  doorCell(doorId: string, roomId: string): Cell {
    const d = this.doors.get(doorId)!.door;
    return this.roomAt(...d.a) === roomId ? d.a : d.b;
  }

  /** Free floor cells of a room, nearest to `near` first. */
  freeCells(roomId: string, near?: Cell): Cell[] {
    const { rect } = this.rooms.get(roomId)!;
    const cells: Cell[] = [];
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      for (let z = rect.z; z < rect.z + rect.d; z++) {
        if (!this.blocked.has(cellKey(x, z)) && !this.stairs.has(cellKey(x, z))) cells.push([x, z]);
      }
    }
    const [cx, cz] = near ?? [rect.x + rect.w / 2, rect.z + rect.d / 2];
    return cells.sort((p, q) => Math.hypot(p[0] - cx, p[1] - cz) - Math.hypot(q[0] - cx, q[1] - cz));
  }

  // ---------------------------------------------------------------- building

  private pooledLight(color: number, distance: number) {
    const light = new THREE.PointLight(color, 0, distance, 2);
    this.root.add(light);
    return light;
  }

  /** Point the shared lights at the rooms around this spot. */
  setFocus(x: number, z: number) {
    this.focus.set(x, z);
  }

  private hoistLights() {
    for (const [roomId, view] of this.rooms) {
      const found: THREE.Light[] = [];
      view.group.traverse((o) => (o as THREE.Light).isLight && found.push(o as THREE.Light));
      for (const light of found) {
        const kind = this.beacons.some((b) => b.lights.includes(light)) ? 'beacon' : 'prop';
        this.root.attach(light);
        this.lights.push({ light, roomId, kind });
      }
    }
  }

  /** Compiles every material up front (all rooms briefly visible) so revealing a room never stalls. */
  precompile(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const hidden: THREE.Object3D[] = [];
    this.root.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    renderer.compile(scene, camera);
    for (const o of hidden) o.visible = false;
  }

  private buildRoom(r: Room, state: GameState) {
    const rect = rectOf(r);
    const level = r.lowerDeck ? -SUNKEN_DEPTH : 0;
    const group = new THREE.Group();
    group.visible = false;
    this.root.add(group);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(rect.w + 0.28, 0.5, rect.d + 0.28), this.m.base);
    slab.position.set(rect.x + rect.w / 2, level - 0.37, rect.z + rect.d / 2);
    slab.receiveShadow = true;
    group.add(slab);

    const floor = this.m.floor[FLOOR_OF[r.type]];
    const tileGeo = new THREE.BoxGeometry(0.97, 0.12, 0.97);
    const tiles: THREE.Mesh[] = [];
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      for (let z = rect.z; z < rect.z + rect.d; z++) {
        const towards = this.stairs.get(cellKey(x, z));
        if (towards) {
          tiles.push(...this.buildStairs(group, r, x, z, towards));
          continue;
        }
        const tile = new THREE.Mesh(tileGeo, floor);
        tile.position.set(x + 0.5, level - 0.06, z + 0.5);
        tile.receiveShadow = true;
        tile.userData = { kind: 'tile', x, z, room: r.id, baseY: tile.position.y };
        group.add(tile);
        tiles.push(tile);
      }
    }

    let water: THREE.Mesh | undefined;
    if (r.lowerDeck) {
      water = new THREE.Mesh(new THREE.PlaneGeometry(rect.w, rect.d, rect.w * 4, rect.d * 4), this.m.water);
      water.rotation.x = -Math.PI / 2;
      water.position.set(rect.x + rect.w / 2, r.flooded ? level + WATER_LEVEL : level - 0.3, rect.z + rect.d / 2);
      water.visible = r.flooded;
      water.receiveShadow = true;
      group.add(water);
    }

    const fire = this.buildFire(rect, level);
    group.add(fire);

    const view: RoomView = { room: r, rect, level, group, tiles, props: [], lightLevel: 0, water, fire, revealed: false };
    this.rooms.set(r.id, view);

    const doorCells = Object.values(state.doors).flatMap((d) => [d.a, d.b]).filter(([x, z]) => this.roomAt(x, z) === r.id);
    for (const def of propsForRoom(r, doorCells)) {
      const built = buildProp(def, this.m, this.style);
      built.group.position.y += level;
      group.add(built.group);
      view.props.push({ built, def, baseY: built.group.position.y });
      if (built.animate) this.animated.push(built);
      if (def.kind === 'beacon') {
        const lights: THREE.Light[] = [];
        built.group.traverse((o) => (o as THREE.Light).isLight && lights.push(o as THREE.Light));
        this.beacons.push({ built, lights });
      }
      if (!def.wall) for (let x = def.x; x < def.x + (def.w ?? 1); x++) for (let z = def.z; z < def.z + (def.d ?? 1); z++) this.blocked.add(cellKey(x, z));
    }
  }

  private buildFire(rect: RoomView['rect'], level: number) {
    const fire = new THREE.Group();
    fire.visible = false;
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xff8a30, emissive: 0xff5a10, emissiveIntensity: 3, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 7; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18 + (i % 3) * 0.05, 0.6 + (i % 2) * 0.3, 6), flameMat);
      flame.position.set(rect.x + 1 + ((i * 1.7) % (rect.w - 2)), level + 0.3, rect.z + 1 + ((i * 1.3) % (rect.d - 2)));
      flame.userData.phase = i;
      fire.add(flame);
    }
    return fire;
  }

  private buildStairs(group: THREE.Group, r: Room, x: number, z: number, towards: Cell) {
    const [ux, uz] = [towards[0] - x, towards[1] - z];
    const steps: THREE.Mesh[] = [];
    for (let i = 0; i < STEPS; i++) {
      const top = (-SUNKEN_DEPTH * (i + 1)) / (STEPS + 1);
      const height = top + SUNKEN_DEPTH + 0.12;
      const along = 0.5 - (i + 0.5) / STEPS;
      const geo = ux !== 0 ? new THREE.BoxGeometry(1 / STEPS, height, 0.97) : new THREE.BoxGeometry(0.97, height, 1 / STEPS);
      const step = new THREE.Mesh(geo, this.m.floor.plate);
      step.position.set(x + 0.5 + ux * along, top - height / 2, z + 0.5 + uz * along);
      step.castShadow = step.receiveShadow = true;
      step.userData = { kind: 'tile', x, z, room: r.id, baseY: step.position.y };
      group.add(step);
      steps.push(step);
    }
    return steps;
  }

  private buildWalls(state: GameState) {
    const doorEdges = new Set(Object.values(state.doors).map((d) => edgeKey(d.a, d.b)));
    const seen = new Map<string, WallView>();
    const dirs: Cell[] = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const r of Object.values(state.rooms)) {
      const rect = rectOf(r);
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        for (let z = rect.z; z < rect.z + rect.d; z++) {
          for (const [dx, dz] of dirs) {
            const other = this.roomAt(x + dx, z + dz);
            if (other === r.id) continue;
            const key = edgeKey([x, z], [x + dx, z + dz]);
            if (doorEdges.has(key)) continue;
            const existing = seen.get(key);
            if (existing) {
              existing.rooms.push(r.id);
              continue;
            }
            const levelOf = (id: string | null) => (id && state.rooms[id].lowerDeck ? -SUNKEN_DEPTH : 0);
            const wall = this.buildWall(x, z, dx, dz, r.id, other === null, Math.min(levelOf(r.id), levelOf(other)));
            seen.set(key, wall);
            this.walls.push(wall);
          }
        }
      }
    }
  }

  private buildWall(x: number, z: number, dx: number, dz: number, room: string, outer: boolean, bottom: number): WallView {
    const group = new THREE.Group();
    group.position.set(x + 0.5 + dx * 0.5, 0, z + 0.5 + dz * 0.5);
    if (dx !== 0) group.rotation.y = Math.PI / 2;
    group.visible = false;
    this.root.add(group);

    const bodyGeo = new THREE.BoxGeometry(1 + WALL_T, 1, WALL_T);
    bodyGeo.translate(0, 0.5, 0);
    const body = new THREE.Mesh(bodyGeo, this.m.wall);
    body.castShadow = body.receiveShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1 + WALL_T, 0.05, WALL_T + 0.03), this.m.wallTop);
    cap.castShadow = true;
    group.add(body, cap);

    let pipe: THREE.Mesh | undefined;
    if (outer) {
      pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 8), this.m.pipe);
      pipe.rotation.z = Math.PI / 2;
      // Inside the room: against the outward normal, in the group's local frame.
      pipe.position.set(0, 1.12, -(dx !== 0 ? dx : dz) * 0.13);
      pipe.castShadow = true;
      group.add(pipe);
    }

    const wall: WallView = { rooms: [room], normal: outer ? [dx, dz] : null, group, body, cap, pipe, bottom, height: H_INNER, scaleK: 0 };
    this.applyWallHeight(wall);
    return wall;
  }

  private buildDoor(door: Door, state: GameState) {
    const [dx, dz] = [door.b[0] - door.a[0], door.b[1] - door.a[1]];
    const group = new THREE.Group();
    group.position.set(door.a[0] + 0.5 + dx * 0.5, 0, door.a[1] + 0.5 + dz * 0.5);
    if (dx !== 0) group.rotation.y = Math.PI / 2;
    group.visible = false;
    this.root.add(group);

    const m = this.m;
    const bottom = Math.min(state.rooms[door.roomA].lowerDeck ? -SUNKEN_DEPTH : 0, state.rooms[door.roomB].lowerDeck ? -SUNKEN_DEPTH : 0);
    const frame = (w: number, h: number, d: number, x: number, y: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.darkMetal);
      mesh.position.set(x, y + h / 2, 0);
      mesh.castShadow = true;
      group.add(mesh);
    };
    frame(0.14, DOOR_H - bottom, WALL_T + 0.1, -0.5, bottom);
    frame(0.14, DOOR_H - bottom, WALL_T + 0.1, 0.5, bottom);
    frame(1.14, 0.14, WALL_T + 0.1, 0, DOOR_H);
    if (bottom < 0) frame(1.0, -bottom, WALL_T, 0, bottom);

    // Watertight hatch: a panel with a hand wheel on each face, hinged on one side.
    const hinge = new THREE.Group();
    hinge.position.set(-0.43, 0, 0);
    group.add(hinge);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.22, 0.07), m.metal);
    panel.position.set(0.43, 0.65, 0);
    panel.castShadow = true;
    hinge.add(panel);
    const bands: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 6, 14), m.rust);
      wheel.position.set(0.43, 0.62, side * 0.05);
      hinge.add(wheel);
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.02), m.rust);
      spoke.position.copy(wheel.position);
      hinge.add(spoke);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.07, 0.01), m.darkMetal);
      band.position.set(0.43, 1.05, side * 0.04);
      hinge.add(band);
      bands.push(band);
    }
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.07), m.darkMetal);
    lamp.position.set(0, DOOR_H + 0.18, 0);
    group.add(lamp);

    if (door.type === 'key' || door.type === 'hack') {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), m.emissive(DOOR_COLOR[door.type], 1.6));
      for (const side of [-1, 1]) {
        const p = pad.clone();
        p.position.set(0.5, 0.95, side * (WALL_T / 2 + 0.07));
        group.add(p);
      }
    }
    if (door.type === 'one_way' && door.openableFrom) {
      // Hazard chevrons on the face that cannot open it.
      const blockedSide = door.openableFrom === door.roomA ? 1 : -1; // +1 = towards B in local z
      const n = dx !== 0 ? dx : dz;
      const hazard = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.25), m.hazard);
      const z = blockedSide * n * 0.04;
      hazard.position.set(0.43, 0.3, z);
      if (z < 0) hazard.rotation.y = Math.PI;
      hinge.add(hazard);
    }

    group.traverse((o) => (o.userData = { ...o.userData, kind: 'door', id: door.id }));
    const view: DoorView = { door: { ...door }, group, hinge, lamp, bands, open: false };
    this.doors.set(door.id, view);
    this.doorByEdge.set(edgeKey(door.a, door.b), view);
    this.syncDoor(door, null, false);
  }

  // ------------------------------------------------------------- behaviour

  updateWallsForCamera(azimuth: number) {
    const cx = Math.sin(azimuth);
    const cz = Math.cos(azimuth);
    for (const w of this.walls) {
      const target = w.normal ? (w.normal[0] * cx + w.normal[1] * cz > 0.01 ? H_FRONT : H_BACK) : H_INNER;
      if (target === w.height) continue;
      const from = w.height;
      this.tweens.add(350, (k) => {
        w.height = from + (target - from) * k;
        this.applyWallHeight(w);
      });
    }
  }

  private applyWallHeight(w: WallView) {
    w.body.position.y = w.bottom;
    w.body.scale.y = Math.max(0.001, (w.height - w.bottom) * w.scaleK);
    w.cap.position.y = w.bottom + w.body.scale.y;
    if (w.pipe) w.pipe.visible = w.height > H_BACK - 0.05 && w.scaleK > 0.9;
  }

  /** Shows a room, assembling it tile by tile from `from` (GO-style). Resolves when done. */
  reveal(roomId: string, from: Cell | null, animate: boolean) {
    const view = this.rooms.get(roomId)!;
    if (view.revealed) return Promise.resolve();
    view.revealed = true;
    view.group.visible = true;
    view.lightLevel = 1;
    const { rect } = view;
    const [fx, fz] = from ?? [rect.x + rect.w / 2, rect.z + rect.d / 2];
    const dist = (x: number, z: number) => Math.hypot(x - fx, z - fz);
    const waits: Promise<void>[] = [];

    let maxDelay = 0;
    if (animate) {
      for (const tile of view.tiles) {
        const delay = dist(tile.userData.x, tile.userData.z) * 55;
        maxDelay = Math.max(maxDelay, delay);
        const baseY = tile.userData.baseY as number;
        tile.position.y = baseY - 5;
        waits.push(this.tweens.add(420, (k) => (tile.position.y = baseY - 5 * (1 - k)), { ease: ease.outBack, delay }));
      }
      for (const p of view.props) {
        const g = p.built.group;
        const delay = maxDelay * 0.6 + dist(g.position.x, g.position.z) * 40 + 120;
        g.position.y = p.baseY + 4;
        g.visible = false;
        waits.push(
          this.tweens.add(
            450,
            (k) => {
              g.visible = true;
              g.position.y = p.baseY + 4 * (1 - k);
            },
            { ease: ease.outBack, delay },
          ),
        );
      }
      view.lightLevel = 0;
      this.tweens.add(700, (k) => (view.lightLevel = k), { delay: maxDelay * 0.5 });
    }

    for (const w of this.walls) {
      if (!w.rooms.includes(roomId)) continue;
      w.group.visible = true;
      if (w.scaleK >= 1) continue;
      if (!animate) {
        w.scaleK = 1;
        this.applyWallHeight(w);
        continue;
      }
      const c = w.group.position;
      this.tweens.add(
        380,
        (k) => {
          w.scaleK = k;
          this.applyWallHeight(w);
        },
        { delay: dist(c.x - 0.5, c.z - 0.5) * 55 + 60, ease: ease.outCubic },
      );
    }

    for (const d of this.doors.values()) {
      if (d.door.roomA === roomId || d.door.roomB === roomId) d.group.visible = true;
    }
    return Promise.all(waits).then(() => undefined);
  }

  /**
   * Brings a door's look in line with the engine: type colours, crate for jammed
   * doors, open/closed hatch. `openerRoom` decides which way the hatch swings.
   */
  syncDoor(door: Door, openerRoom: string | null, animate = true): Promise<void> {
    const view = this.doors.get(door.id)!;
    view.door = { ...door };
    const color = DOOR_COLOR[door.type];
    for (const band of view.bands) band.material = this.m.emissive(color, door.type === 'normal' ? 0.15 : 0.9);
    view.lamp.material = this.m.emissive(door.open ? 0x50ff90 : color, 2.2);

    if (door.type === 'jammed' && !door.open && !view.crate) this.addCrate(view);

    if (door.open === view.open) return Promise.resolve();
    view.open = door.open;
    if (door.open) {
      const towardsB = openerRoom !== door.roomB;
      const n = door.a[0] !== door.b[0] ? door.b[0] - door.a[0] : door.b[1] - door.a[1];
      const angle = (towardsB ? -1 : 1) * n * (Math.PI / 2);
      const far = towardsB ? door.b : door.a;
      // The open panel lies across the edge between `far` and its neighbour on the hinge side.
      const hingeSide: Cell = door.a[0] === door.b[0] ? [far[0] - 1, far[1]] : [far[0], far[1] + 1];
      view.blockedEdge = edgeKey(far, hingeSide);
      this.blockedEdges.add(view.blockedEdge);
      const crateMove = this.pushCrate(view, animate);
      if (!animate) {
        view.hinge.rotation.y = angle;
        return Promise.resolve();
      }
      return Promise.all([crateMove, this.tweens.add(600, (k) => (view.hinge.rotation.y = angle * k), { ease: ease.outCubic })]).then(() => undefined);
    }
    if (view.blockedEdge) this.blockedEdges.delete(view.blockedEdge);
    const from = view.hinge.rotation.y;
    if (!animate) {
      view.hinge.rotation.y = 0;
      return Promise.resolve();
    }
    return this.tweens.add(500, (k) => (view.hinge.rotation.y = from * (1 - k)), { ease: ease.inOutSine });
  }

  private addCrate(view: DoorView) {
    const d = view.door;
    const roomId = this.roomAt(...d.a)!;
    const cell = d.a;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.8), this.m.crate);
    crate.position.set(cell[0] + 0.5, this.cellY(...cell) + 0.375, cell[1] + 0.5);
    crate.rotation.y = 0.12;
    crate.castShadow = crate.receiveShadow = true;
    this.rooms.get(roomId)!.group.add(crate);
    view.crate = crate;
    view.crateCell = [...cell];
    this.blocked.add(cellKey(...cell));
  }

  /** Slides the crate off a jammed door into a free neighbouring cell. */
  private pushCrate(view: DoorView, animate: boolean) {
    if (!view.crate || !view.crateCell) return Promise.resolve();
    const [x, z] = view.crateCell;
    const { a, b } = view.door;
    const room = this.roomAt(x, z);
    const inward: Cell = [x * 2 - (a[0] === x && a[1] === z ? b[0] : a[0]), z * 2 - (a[0] === x && a[1] === z ? b[1] : a[1])];
    const options: Cell[] = a[0] === b[0] ? [[x + 1, z], [x - 1, z], inward] : [[x, z + 1], [x, z - 1], inward];
    const target = options.find(([tx, tz]) => this.roomAt(tx, tz) === room && !this.blocked.has(cellKey(tx, tz)) && !this.stairs.has(cellKey(tx, tz)));
    this.blocked.delete(cellKey(x, z));
    if (!target) {
      // Nowhere to slide: the crate breaks apart.
      view.crate.visible = false;
      view.crateCell = undefined;
      return Promise.resolve();
    }
    this.blocked.add(cellKey(...target));
    view.crateCell = target;
    const crate = view.crate;
    const from = crate.position.clone();
    const to = new THREE.Vector3(target[0] + 0.5, from.y, target[1] + 0.5);
    if (!animate) {
      crate.position.copy(to);
      return Promise.resolve();
    }
    return this.tweens.add(400, (k) => crate.position.lerpVectors(from, to, k));
  }

  /** Water rises into (or drains out of) a lower-deck room. */
  setFlooded(roomId: string, flooded: boolean, animate = true) {
    const view = this.rooms.get(roomId)!;
    view.room = { ...view.room, flooded };
    const water = view.water;
    if (!water) return Promise.resolve();
    const top = view.level + WATER_LEVEL;
    const bottom = view.level - 0.3;
    water.visible = true;
    const [from, to] = flooded ? [bottom, top] : [top, bottom];
    if (!animate) {
      water.position.y = to;
      water.visible = flooded;
      return Promise.resolve();
    }
    return this.tweens.add(1400, (k) => (water.position.y = from + (to - from) * k), { ease: ease.inOutSine }).then(() => {
      water.visible = flooded;
    });
  }

  setFire(roomId: string, on: boolean) {
    const view = this.rooms.get(roomId)!;
    view.room = { ...view.room, fireRoundsLeft: on ? 1 : 0 };
    view.fire.visible = on;
  }

  /** Power is back: the alarm stops and explored rooms get white light. */
  setPower(on: boolean) {
    this.power = on;
    for (const b of this.beacons) if (on) b.built.animate = undefined;
  }

  setRoomState(room: Room) {
    const view = this.rooms.get(room.id)!;
    view.room = { ...room };
  }

  private roomLight(view: RoomView) {
    const r = view.room;
    if (r.flooded) return { color: this.style.roomLight.color, intensity: 0 };
    if (this.power) return { color: 0xdfe8ff, intensity: this.style.roomLight.intensity * 0.9 };
    return { color: this.style.roomLight.color, intensity: this.style.roomLight.intensity * (r.lit ? 1.4 : this.style.roomLight.unlit) };
  }



  update(t: number) {
    for (const p of this.animated) p.animate?.(t);
    for (const view of this.rooms.values()) {
      if (!view.revealed) continue;
      if (view.water?.visible) {
        const pos = view.water.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          pos.setZ(i, Math.sin(x * 2.1 + t * 1.6) * 0.025 + Math.cos(y * 2.7 + t * 1.2) * 0.02);
        }
        pos.needsUpdate = true;
        view.water.geometry.computeVertexNormals();
      }
      if (view.fire.visible) {
        for (const f of view.fire.children) {
          const k = Math.sin(t * 9 + (f.userData.phase ?? 0) * 1.7);
          f.scale.set(1 + 0.1 * k, 1 + 0.35 * k, 1 + 0.1 * k);
        }
      }
    }
    // Hidden rooms keep their prop lights at 0 (see `lights`).
    for (const { light, roomId, kind } of this.lights) {
      if (!this.rooms.get(roomId)!.revealed) light.intensity = 0;
      else if (kind === 'beacon') light.intensity = this.power ? 0 : this.style.alarm.intensity;
    }

    // Hand the pooled ceiling and fire lights to the nearest revealed rooms.
    const near = [...this.rooms.values()]
      .filter((v) => v.revealed)
      .map((v) => ({ v, d: Math.hypot(v.rect.x + v.rect.w / 2 - this.focus.x, v.rect.z + v.rect.d / 2 - this.focus.y) }))
      .sort((p, q) => p.d - q.d)
      .map((e) => e.v);
    this.roomPool.forEach((light, i) => {
      const v = near[i];
      if (!v) return void (light.intensity = 0);
      const { color, intensity } = this.roomLight(v);
      light.color.setHex(color);
      light.intensity = intensity * v.lightLevel;
      // The wide cantina needs a longer reach to light both ends.
      light.distance = ROOM_W * 1.3 + (v.rect.w - ROOM_W) * 0.5;
      light.position.set(v.rect.x + v.rect.w / 2, 2.6, v.rect.z + v.rect.d / 2);
    });
    const burning = near.filter((v) => v.fire.visible);
    this.firePool.forEach((light, i) => {
      const v = burning[i];
      if (!v) return void (light.intensity = 0);
      light.intensity = 22 + 8 * Math.sin(t * 13 + i);
      light.position.set(v.rect.x + v.rect.w / 2, v.level + 1, v.rect.z + v.rect.d / 2);
    });
  }

  roomName(roomId: string) {
    return ROOM_NAMES[this.rooms.get(roomId)!.room.type];
  }
}

function rectOf(r: Room) {
  return { x: r.col * ROOM_W, z: r.row * ROOM_D, w: ROOM_W * r.span, d: ROOM_D };
}
