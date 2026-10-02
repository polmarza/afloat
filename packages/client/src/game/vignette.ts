// Small self-running 3D scenes for the landing page: a few real rooms of a
// generated ship, drawn with the game's World and crew figures and animated by
// a script (rooms drop in, crew walk, doors open...). Display only: the engine
// never sees these scenes.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ROOM_D, ROOM_W } from '@afloat/shared/config/balance';
import type { ItemId } from '@afloat/shared/content/items';
import type { RoleId } from '@afloat/shared/content/roles';
import { createGame, type GameState } from '@afloat/shared/engine';
import { CrewFigure } from './crew';
import { buildItemModel } from './itemModels';
import type { Materials } from './materials';
import { STYLE } from './styles';
import { ease, Tweens } from './tweens';
import { cellKey, World, type Cell } from './world';

const AZIMUTH = Math.PI / 4;
const ELEVATION = 0.86;
/** The camera sways a little around its corner, never enough to change which walls are lowered. */
const SWAY = 0.12;
const STEP_MS = 260;
const LOOP_PAUSE_MS = 2600;

// ------------------------------------------------------------------ catalog

/** Ships the scenes take their rooms from. Any seeds work: they only need to cover every room type. */
const CATALOG_SEEDS = ['PERISCOPIO', 'ABISMO', 'CORAL', 'SONAR', 'LASTRE', 'FOSA', 'TORPEDO', 'ESCOTILLA'];
let catalog: GameState[] | null = null;

function ships() {
  catalog ??= CATALOG_SEEDS.flatMap((seed) =>
    (['hard', 'normal'] as const).map(
      (difficulty) =>
        createGame({
          seed,
          difficulty,
          players: [
            { name: 'A', role: 'engineer' },
            { name: 'B', role: 'medic' },
          ],
        }).state,
    ),
  );
  return catalog;
}

/** Some rooms of one generated ship. */
export interface Pick {
  ship: GameState;
  rooms: string[];
}

/** First ship of the catalog where `match` finds the rooms it wants. */
export function findRooms(match: (ship: GameState) => string[] | null): Pick {
  for (const ship of ships()) {
    const rooms = match(ship);
    if (rooms) return { ship, rooms };
  }
  throw new Error('No ship in the catalog has the rooms this scene needs.');
}

// ------------------------------------------------------------------- stage

export interface StageSetup {
  pick: Pick;
  crew?: { role: RoleId; room: string }[];
  /** Rooms with water from the start. */
  flooded?: string[];
  power?: boolean;
}

const CANCELLED = Symbol('cancelled');

/** What a scene script can do. Every call stops the script if another scene took over. */
export class Stage {
  constructor(
    private readonly v: Vignette,
    private readonly gen: number,
  ) {}

  private async guard<T>(p: Promise<T>): Promise<T> {
    if (this.gen !== this.v.generation) throw CANCELLED;
    const result = await p;
    if (this.gen !== this.v.generation) throw CANCELLED;
    return result;
  }

  build(setup: StageSetup) {
    if (this.gen !== this.v.generation) throw CANCELLED;
    this.v.build(setup);
  }

  overlay(html: string) {
    this.v.overlay.innerHTML = html;
  }

  wait(ms: number) {
    return this.guard(this.v.tweens.wait(ms));
  }

  /** Drops a room in, tile by tile, from a door (or from its centre). */
  reveal(roomId: string, viaDoor?: string) {
    const world = this.v.world!;
    return this.guard(world.reveal(roomId, viaDoor ? world.doorCell(viaDoor, roomId) : null, true));
  }

  /** The crew standing in revealed rooms fall into place, one after another. */
  dropCrew() {
    return this.guard(this.v.dropCrew());
  }

  walkTo(i: number, cell: Cell) {
    return this.guard(this.v.walkPath(i, this.v.findPath(i, cell) ?? []));
  }

  /** Walks crew member `i` next to a door, facing it. */
  approachDoor(i: number, doorId: string) {
    return this.guard(this.v.approachDoor(i, doorId));
  }

  openDoor(doorId: string, fromRoom: string) {
    const door = this.v.state!.doors[doorId];
    return this.guard(this.v.world!.syncDoor({ ...door, open: true }, fromRoom));
  }

  walkThrough(i: number, doorId: string, toRoom: string) {
    return this.guard(this.v.walkThrough(i, doorId, toRoom));
  }

  crouch(i: number) {
    return this.guard(this.v.crouch(i));
  }

  /** An item rises over crew member `i`, as when searching finds it. */
  popItem(i: number, item: ItemId) {
    return this.guard(this.v.popItem(i, item));
  }

  flood(roomId: string) {
    return this.guard(Promise.resolve(this.v.world!.setFlooded(roomId, true, true)));
  }

  setFire(roomId: string, on: boolean) {
    this.v.world!.setFire(roomId, on);
  }

  /** Crew member `i` collapses (no light, lying down). */
  fall(i: number) {
    this.v.crew[i].fig.setCondition('dead');
  }

  escape(i: number) {
    return this.guard(this.v.escape(i));
  }

  roomOf(i: number) {
    const c = this.v.crew[i];
    return this.v.world!.roomAt(c.x, c.z)!;
  }

  freeCells(roomId: string, near?: Cell) {
    return this.v.world!.freeCells(roomId, near);
  }

  doorBetween(a: string, b: string) {
    return Object.values(this.v.state!.doors).find((d) => (d.roomA === a && d.roomB === b) || (d.roomA === b && d.roomB === a))!.id;
  }
}

export type Script = (stage: Stage) => Promise<void>;

interface CrewView {
  fig: CrewFigure;
  x: number;
  z: number;
  /** Already on the floor (dropped in). */
  placed: boolean;
}

export class Vignette {
  readonly overlay: HTMLElement;
  readonly tweens = new Tweens();
  generation = 0;
  world: World | null = null;
  state: GameState | null = null;
  crew: CrewView[] = [];

  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(26, 1, 0.5, 300);
  private readonly clock = new THREE.Clock();
  private readonly environment: THREE.Texture;
  private readonly target = new THREE.Vector3();
  private readonly observers: { disconnect(): void }[] = [];
  private scene = new THREE.Scene();
  /** Radius of the rooms on show, to fit them on screen whatever the canvas size. */
  private radius = 10;

  constructor(
    private readonly container: HTMLElement,
    private readonly materials: Materials,
    /** Multiplies the distance that fits the rooms on screen (<1 = closer). */
    private readonly zoom = 1,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = STYLE.exposure;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(this.renderer.domElement);
    this.overlay = document.createElement('div');
    this.overlay.className = 'vignette-overlay';
    container.appendChild(this.overlay);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const resize = new ResizeObserver(() => this.resize());
    resize.observe(container);
    // Only draw while on screen.
    const seen = new IntersectionObserver(([entry]) => this.renderer.setAnimationLoop(entry.isIntersecting ? () => this.frame() : null));
    seen.observe(container);
    this.observers.push(resize, seen);
    this.resize();
  }

  /** Plays a scene script, replacing whatever was playing. With `loop`, it starts over after a pause. */
  async play(script: Script, loop = true) {
    const gen = ++this.generation;
    this.tweens.clear();
    this.overlay.innerHTML = '';
    for (;;) {
      try {
        await script(new Stage(this, gen));
      } catch (err) {
        if (err === CANCELLED) return;
        throw err;
      }
      if (!loop || gen !== this.generation) return;
      await this.tweens.wait(LOOP_PAUSE_MS);
      if (gen !== this.generation) return;
    }
  }

  dispose() {
    this.generation++;
    this.tweens.clear();
    for (const o of this.observers) o.disconnect();
    this.renderer.setAnimationLoop(null);
    this.clearScene();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.container.innerHTML = '';
  }

  // ------------------------------------------------------------ building

  build({ pick, crew = [], flooded = [], power = false }: StageSetup) {
    this.clearScene();
    const keep = new Set(pick.rooms);
    const rooms = Object.fromEntries(
      pick.rooms.map((id) => [id, { ...pick.ship.rooms[id], discovered: false, lit: true, flooded: flooded.includes(id), fireRoundsLeft: 0 }]),
    );
    const doors = Object.fromEntries(
      Object.values(pick.ship.doors)
        .filter((d) => keep.has(d.roomA) && keep.has(d.roomB))
        .map((d) => [d.id, { ...d, type: 'normal' as const, open: false }]),
    );
    const systems = { ...pick.ship.systems, power: { ...pick.ship.systems.power, repaired: power } };
    this.state = { ...pick.ship, rooms, doors, systems };

    this.scene = new THREE.Scene();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = STYLE.environment;
    this.scene.add(new THREE.HemisphereLight(STYLE.hemi.sky, STYLE.hemi.ground, STYLE.hemi.intensity));
    this.world = new World(this.state, this.materials, STYLE, this.tweens);
    this.scene.add(this.world.root);
    this.world.updateWallsForCamera(AZIMUTH);

    const taken = new Set<string>();
    this.crew = crew.map(({ role, room }) => {
      const fig = new CrewFigure(role, this.materials, STYLE);
      const cell = this.world!.freeCells(room).find((c) => !taken.has(cellKey(...c)))!;
      taken.add(cellKey(...cell));
      fig.root.position.set(cell[0] + 0.5, this.world!.cellY(...cell), cell[1] + 0.5);
      fig.root.rotation.y = AZIMUTH + (Math.random() - 0.5) * 1.6;
      // Out of sight until dropped in. Scaled away rather than hidden, so the light count never changes.
      fig.root.scale.setScalar(0.001);
      this.scene.add(fig.root);
      return { fig, x: cell[0], z: cell[1], placed: false };
    });

    const box = new THREE.Box3();
    for (const r of Object.values(rooms)) {
      box.expandByPoint(new THREE.Vector3(r.col * ROOM_W, 0, r.row * ROOM_D));
      box.expandByPoint(new THREE.Vector3((r.col + r.span) * ROOM_W, 0, (r.row + 1) * ROOM_D));
    }
    box.getCenter(this.target);
    this.radius = box.getSize(new THREE.Vector3()).length() / 2 + 0.6;
    this.world.setFocus(this.target.x, this.target.z);
    this.world.precompile(this.renderer, this.scene, this.camera);
  }

  private clearScene() {
    this.overlay.innerHTML = '';
    // Materials are shared with the game; only the geometry belongs to this scene.
    this.scene.traverse((obj) => (obj as THREE.Mesh).geometry?.dispose());
    this.world = null;
    this.crew = [];
  }

  // ---------------------------------------------------------- animation

  async dropCrew() {
    const drops = this.crew.map((c, i) => {
      if (c.placed || !this.world!.isRevealed(this.world!.roomAt(c.x, c.z))) return Promise.resolve();
      c.placed = true;
      const ground = c.fig.root.position.y;
      return this.tweens
        .add(
          480,
          (k) => {
            c.fig.root.scale.setScalar(1);
            c.fig.root.position.y = ground + 3.5 * (1 - k);
          },
          { ease: ease.outBack, delay: i * 160 },
        )
        .then(() => c.fig.setTorch(true));
    });
    await Promise.all(drops);
  }

  async walkPath(i: number, path: Cell[]) {
    const c = this.crew[i];
    c.fig.walking = true;
    for (const cell of path) await this.step(c, cell);
    c.fig.walking = false;
  }

  private step(c: CrewView, [x, z]: Cell, ms = STEP_MS) {
    const from = c.fig.root.position.clone();
    const to = new THREE.Vector3(x + 0.5, this.world!.cellY(x, z), z + 0.5);
    this.turn(c, Math.atan2(x - c.x, z - c.z));
    c.x = x;
    c.z = z;
    return this.tweens.add(ms, (k) => c.fig.root.position.lerpVectors(from, to, k), { ease: ease.linear });
  }

  private turn(c: CrewView, yaw: number) {
    const from = c.fig.root.rotation.y;
    const delta = Math.atan2(Math.sin(yaw - from), Math.cos(yaw - from));
    this.tweens.add(150, (k) => (c.fig.root.rotation.y = from + delta * k));
  }

  private occupied([x, z]: Cell, except: number) {
    return this.crew.some((c, i) => i !== except && c.placed && c.x === x && c.z === z);
  }

  /** Breadth-first search over walkable floor, avoiding other crew. */
  findPath(i: number, [tx, tz]: Cell): Cell[] | null {
    const c = this.crew[i];
    const world = this.world!;
    const start = cellKey(c.x, c.z);
    const goal = cellKey(tx, tz);
    if (start === goal) return [];
    const prev = new Map<string, string | null>([[start, null]]);
    const queue: Cell[] = [[c.x, c.z]];
    while (queue.length) {
      const cur = queue.shift()!;
      const [x, z] = cur;
      for (const next of [
        [x + 1, z],
        [x - 1, z],
        [x, z + 1],
        [x, z - 1],
      ] as Cell[]) {
        const k = cellKey(...next);
        if (prev.has(k) || !world.canStep(cur, next) || this.occupied(next, i)) continue;
        prev.set(k, cellKey(x, z));
        if (k === goal) {
          const path: Cell[] = [];
          for (let p: string | null = k; p && p !== start; p = prev.get(p)!) path.unshift(p.split(',').map(Number) as Cell);
          return path;
        }
        queue.push(next);
      }
    }
    return null;
  }

  async approachDoor(i: number, doorId: string) {
    const world = this.world!;
    const c = this.crew[i];
    const room = world.roomAt(c.x, c.z)!;
    const door = world.doorCell(doorId, room);
    for (const cell of [door, ...world.freeCells(room, door).slice(0, 6)]) {
      if (this.occupied(cell, i) || world.blocked.has(cellKey(...cell))) continue;
      const path = this.findPath(i, cell);
      if (!path) continue;
      await this.walkPath(i, path);
      const d = world.doors.get(doorId)!.door;
      const far = cellKey(...d.a) === cellKey(...door) ? d.b : d.a;
      this.turn(c, Math.atan2(far[0] - c.x, far[1] - c.z));
      return;
    }
  }

  async walkThrough(i: number, doorId: string, toRoom: string) {
    const world = this.world!;
    const c = this.crew[i];
    const near = world.doorCell(doorId, world.roomAt(c.x, c.z)!);
    const far = world.doorCell(doorId, toRoom);
    c.fig.walking = true;
    await this.walkPath(i, this.findPath(i, near) ?? []);
    await this.step(c, far, STEP_MS * 1.3);
    const dest = world.freeCells(toRoom, far).find((cell) => !this.occupied(cell, i) && cellKey(...cell) !== cellKey(...far));
    if (dest) await this.walkPath(i, this.findPath(i, dest) ?? []);
    c.fig.walking = false;
  }

  async crouch(i: number) {
    const fig = this.crew[i].fig;
    await this.tweens.add(220, (k) => fig.root.scale.set(1, 1 - 0.18 * k, 1));
    await this.tweens.add(220, (k) => fig.root.scale.set(1, 0.82 + 0.18 * k, 1));
  }

  async popItem(i: number, item: ItemId) {
    const c = this.crew[i];
    const model = buildItemModel(item, this.materials);
    model.position.copy(c.fig.root.position);
    this.scene.add(model);
    await this.tweens.add(
      700,
      (k) => {
        model.position.y = c.fig.root.position.y + 1.2 + 0.9 * k;
        model.scale.setScalar(Math.max(0.001, k) * 1.4);
        model.rotation.y = k * Math.PI * 2;
      },
      { ease: ease.outBack },
    );
    await this.tweens.wait(900);
    await this.tweens.add(300, (k) => model.scale.setScalar(Math.max(0.001, 1.4 * (1 - k))));
  }

  async escape(i: number) {
    const fig = this.crew[i].fig;
    fig.vanish();
    const y0 = fig.root.position.y;
    await this.tweens.add(900, (k) => {
      fig.root.position.y = y0 + k * 3;
      fig.root.scale.setScalar(Math.max(0.001, 1 - k));
    });
  }

  // ------------------------------------------------------------- render

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this.tweens.tick(performance.now());
    const azimuth = AZIMUTH + Math.sin(t * 0.25) * SWAY;
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    // Narrow canvases (phones) need the whole margin.
    const zoom = this.camera.aspect < 1.3 ? Math.max(this.zoom, 0.98) : this.zoom;
    const r = (this.radius / Math.tan(Math.min(vfov, hfov) / 2)) * zoom;
    this.camera.position.set(
      this.target.x + Math.sin(azimuth) * Math.cos(ELEVATION) * r,
      this.target.y + Math.sin(ELEVATION) * r,
      this.target.z + Math.cos(azimuth) * Math.cos(ELEVATION) * r,
    );
    this.camera.lookAt(this.target);
    for (const c of this.crew) c.fig.update(dt, t);
    this.world?.update(t);
    this.renderer.render(this.scene, this.camera);
  }
}
