// Client controller: owns the GameState, sends actions to the engine and turns
// the resulting GameEvents into 3D animations and HUD updates.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ROOM_D, ROOM_W } from '@afloat/shared/config/balance';
import { CHARACTERS } from '@afloat/shared/content/characters';
import { ITEMS } from '@afloat/shared/content/items';
import { ROLE_ORDER } from '@afloat/shared/content/roles';
import { FLOODED_GUIDE, ROOM_GUIDE, ROOM_NAMES, SYSTEM_NAMES } from '@afloat/shared/content/rooms';
import { createGame, scoreGame, type Action, type GameEvent, type GameState, type NewGame } from '@afloat/shared/engine';
import { CrewFigure } from './crew';
import { LocalSession, type Session } from './session';
import { Materials } from './materials';
import { STYLE } from './styles';
import { ease, Tweens } from './tweens';
import { renderItemImages, renderPortraits, type ItemImages, type Portraits } from './portraits';
import { Hud } from './ui/hud';
import { showLanding } from './ui/landing';
import { isModalOpen } from './ui/modal';
import { activePlayer, beyondName, DOOR_TYPE_NAME, doorOptions } from './ui/options';
import { showSetup } from './ui/setup';
import { newRecord, saveRecord } from './records';
import { choosePodOutcome, showGameMenu, showGuide, showIntro, showRecords, showRoundPopup, type RoundInfo } from './ui/sheet';
import { cellKey, World, type Cell } from './world';

interface CrewView {
  fig: CrewFigure;
  x: number;
  z: number;
}

const STEP_MS = 260;
/** Pause before each computer action, so humans can follow what it does. */
const BOT_PAUSE_MS = 650;
const ELEVATION = 0.86;
/** Ship shown behind the landing page, and how fast the camera circles it (radians/s). */
const SHOWCASE_SEED = 'PERISCOPIO';
const SHOWCASE_SPIN = 0.07;

export class App {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(26, 1, 0.5, 300);
  private readonly tweens = new Tweens();
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly materials = new Materials(STYLE);
  private readonly hud: Hud;
  private readonly environment: THREE.Texture;
  private readonly portraits: Portraits;
  private readonly itemImages: ItemImages;
  /** Flashlight on/off per player (a free, purely visual choice). */
  private readonly torches = new Map<string, boolean>();
  /** Tutorial mode: explain the goal and each room with something to do. */
  private tutorial = false;
  private readonly guided = new Set<string>();

  private scene = new THREE.Scene();
  private state!: GameState;
  private setup: NewGame | null = null;
  private world: World | null = null;
  private crew = new Map<string, CrewView>();
  private busy = false;
  /** A computer-controlled crew member is playing its turn. */
  private botRunning = false;
  /** Where the authoritative state lives (local for now; online later). */
  private session!: Session;
  /** Round phase while events are being played back. */
  private phaseNow: GameState['phase'] = 'crew';
  /** Where to walk after an engine MOVE, when the player clicked a specific tile. */
  private moveGoal: Cell | null = null;
  /** The landing page is open: the ship behind it is only for show. */
  private showcase = false;
  /** Whether the landing hero (and so the ship) is on screen; off-screen we skip rendering. */
  private showcaseVisible = true;
  /** Which walls are lowered depends on the camera's quadrant; update them only when it changes. */
  private wallQuadrant = '';

  private azimuth = Math.PI / 4;
  private azimuthGoal = Math.PI / 4;
  private zoom = 1;
  private readonly target = new THREE.Vector3();
  /** The one shadow-casting flashlight: it follows whoever has the turn. */
  private readonly heroBeam = new THREE.SpotLight(0xfff2d8, 0, STYLE.crewLight.distance, STYLE.crewLight.angle, 0.55, 2);
  private readonly beamPos = new THREE.Vector3();
  private distance = 20;

  constructor(private readonly container: HTMLElement) {
    container.style.background = STYLE.background;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = STYLE.exposure;
    container.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.portraits = renderPortraits(this.materials);
    this.itemImages = renderItemImages(this.materials);
    this.hud = new Hud(
      {
        onAction: (a) => this.dispatch(a),
        onLaunch: () => this.launchPod(),
        onTorch: (id) => this.toggleTorch(id),
        isBusy: () => this.busy || this.botRunning,
        onMenu: () => void this.openMenu(),
      },
      this.portraits,
      this.itemImages,
    );
    this.hud.hide();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKey(e));
    container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    container.addEventListener('pointermove', (e) => this.onPointerMove(e));
    container.addEventListener('pointerleave', () => this.hud.tooltip(null));
    container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
    this.openLanding();
  }

  // --------------------------------------------------------------- landing

  private openLanding() {
    try {
      this.buildShowcase();
    } catch (err) {
      // The landing still works over a plain dark background.
      console.error(err);
      this.closeShowcase();
    }
    showLanding(document.getElementById('landing')!, this.portraits, this.itemImages, {
      onPlay: () => {
        this.closeShowcase();
        this.openSetup();
      },
      onHeroVisible: (visible) => (this.showcaseVisible = visible),
    });
  }

  /** A generated ship with every room on view, as if fully explored. Display only: no rules run on it. */
  private buildShowcase() {
    const { state } = createGame({
      seed: SHOWCASE_SEED,
      players: ROLE_ORDER.slice(0, 3).map((role) => ({ name: CHARACTERS[role].name, role, bot: true })),
    });
    const rooms = Object.fromEntries(Object.entries(state.rooms).map(([id, r]) => [id, { ...r, discovered: true }]));
    this.state = { ...state, rooms };
    this.showcase = true;
    this.showcaseVisible = true;
    this.torches.clear();
    for (const p of this.state.players) this.torches.set(p.id, true);
    this.buildScene();
  }

  private closeShowcase() {
    this.showcase = false;
    this.tweens.clear();
    // Materials are shared with the game; only the geometry is this scene's own.
    this.scene.traverse((obj) => (obj as THREE.Mesh).geometry?.dispose());
    this.world = null;
    this.crew.clear();
    this.scene = new THREE.Scene();
    this.wallQuadrant = '';
    // The game camera starts from its usual corner.
    this.azimuth = this.azimuthGoal = Math.PI / 4;
  }

  // ------------------------------------------------------------------ game

  private openSetup() {
    showSetup(
      document.getElementById('setup')!,
      this.portraits,
      this.setup,
      this.tutorial,
      (game, tutorial) => {
        this.tutorial = tutorial;
        void this.start(game);
      },
      () => this.openLanding(),
    );
  }

  private async start(game: NewGame) {
    this.setup = game;
    this.session = new LocalSession(game);
    const events = this.session.startEvents;
    this.state = this.session.state;
    this.torches.clear();
    this.guided.clear();
    // The computer's crew light their way from the start.
    for (const p of this.state.players) if (p.bot) this.torches.set(p.id, true);
    this.buildScene();
    this.hud.render(this.state, false);
    this.busy = true;
    if (this.tutorial) await showIntro();
    await this.showRoundSummary(events);
    this.busy = false;
    void this.runBots();
  }

  /** While the turn belongs to a computer-controlled crew member, let it play. */
  private async runBots() {
    if (this.botRunning) return;
    this.botRunning = true;
    this.hud.render(this.state, true);
    try {
      while (this.world && this.state.status === 'playing' && activePlayer(this.state).bot) {
        await this.tweens.wait(BOT_PAUSE_MS);
        if (!this.world || this.state.status !== 'playing' || !activePlayer(this.state).bot) break;
        // Hold on while something else is playing or a window is open.
        if (this.busy || isModalOpen()) continue;
        await this.dispatch(this.session.botAction!(), true);
      }
    } finally {
      this.botRunning = false;
    }
    if (this.world && this.state.status === 'playing') this.hud.render(this.state, false);
  }

  /** When a new round starts (everyone has played), a popup sums up what the ship did. */
  private async showRoundSummary(events: GameEvent[]) {
    if (this.state.status !== 'playing') return;
    let round: RoundInfo | null = null;
    let inCrisis = false;
    for (const e of events) {
      if (e.type === 'PhaseChanged') {
        inCrisis = e.phase === 'crisis';
        if (inCrisis) round = { round: e.round, oxygenUsed: 0, oxygenMade: 0, oxygenLeft: 0, hullLost: 0, hullLeft: 0, event: null };
      } else if (!round || !inCrisis) {
        continue;
      } else if (e.type === 'OxygenChanged' && !round.event && round.oxygenUsed === 0) {
        round.oxygenUsed = Math.round((e.from - e.to) * 10) / 10;
      } else if (e.type === 'OxygenChanged' && !round.event && e.to > e.from) {
        round.oxygenMade += e.to - e.from;
      } else if (e.type === 'HullChanged') {
        round.hullLost += e.from - e.to;
      } else if (e.type === 'EventDrawn') {
        round.event = { card: e.card, where: e.targetRoomId ? ROOM_NAMES[this.state.rooms[e.targetRoomId].type] : null };
      }
    }
    if (!round) return;
    round.oxygenLeft = this.state.oxygen;
    round.hullLeft = this.state.hull;
    await showRoundPopup(round);
  }

  /** Tutorial: the first time anyone enters a room with something to do, explain it. */
  private async showGuides(events: GameEvent[]) {
    if (!this.tutorial) return;
    for (const e of events) {
      if (e.type !== 'PlayerMoved' || this.guided.has(e.to)) continue;
      const room = this.state.rooms[e.to];
      const guide = ROOM_GUIDE[room.type] ?? (room.flooded ? FLOODED_GUIDE : null);
      if (!guide) continue;
      this.guided.add(e.to);
      await showGuide(ROOM_NAMES[room.type].toUpperCase(), guide);
    }
  }

  private async openMenu() {
    if (this.busy || !this.world) return;
    if ((await showGameMenu()) !== 'abandon') return;
    this.tweens.clear();
    this.world = null;
    this.crew.clear();
    this.scene = new THREE.Scene();
    this.hud.hide();
    this.openSetup();
  }

  private toggleTorch(playerId: string) {
    const on = !(this.torches.get(playerId) ?? false);
    this.torches.set(playerId, on);
    this.crew.get(playerId)?.fig.setTorch(on);
  }

  private buildScene() {
    this.tweens.clear();
    this.scene = new THREE.Scene();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = STYLE.environment;
    this.scene.add(new THREE.HemisphereLight(STYLE.hemi.sky, STYLE.hemi.ground, STYLE.hemi.intensity));
    this.heroBeam.castShadow = true;
    this.heroBeam.shadow.mapSize.set(1024, 1024);
    this.heroBeam.shadow.bias = -0.002;
    this.scene.add(this.heroBeam, this.heroBeam.target);

    this.world = new World(this.state, this.materials, STYLE, this.tweens);
    this.scene.add(this.world.root);
    this.world.setPower(this.state.systems.power.repaired);
    this.world.updateWallsForCamera(this.azimuthGoal);

    this.crew.clear();
    const taken = new Set<string>();
    for (const p of this.state.players) {
      const fig = new CrewFigure(p.role, this.materials, STYLE);
      fig.setTorch(this.torches.get(p.id) ?? false);
      const cell = this.world.freeCells(p.roomId).find((c) => !taken.has(cellKey(...c)))!;
      taken.add(cellKey(...cell));
      fig.root.position.set(cell[0] + 0.5, this.world.cellY(...cell), cell[1] + 0.5);
      fig.root.rotation.y = Math.random() * Math.PI * 2;
      fig.root.traverse((o) => (o.userData = { ...o.userData, kind: 'crew', id: p.id }));
      this.scene.add(fig.root);
      this.crew.set(p.id, { fig, x: cell[0], z: cell[1] });
    }
    this.highlightActive();
    this.target.copy(this.exploredCentre());
    this.distance = this.fitDistance() * this.zoom;
    this.world.precompile(this.renderer, this.scene, this.camera);
  }

  /** Sends an action to the engine and plays its consequences. */
  private async dispatch(action: Action, byBot = false) {
    if (this.busy || !this.world || this.state.status !== 'playing') return;
    // Humans can't act during the computer's turn.
    if (!byBot && activePlayer(this.state).bot) return;
    this.hud.hideMenu();
    const { state, events } = await this.session.submit(action);
    const rejected = events.find((e) => e.type === 'ActionRejected');
    if (rejected && rejected.type === 'ActionRejected') {
      this.hud.toast(rejected.reason, { kind: 'error' });
      return;
    }
    const before = this.state;
    this.state = state;
    this.phaseNow = 'crew';
    this.busy = true;
    this.hud.render(state, true);
    try {
      for (const e of events) await this.play(e, before);
    } finally {
      this.busy = false;
      this.moveGoal = null;
    }
    this.highlightActive();
    this.hud.render(this.state, false);
    this.busy = true;
    await this.showGuides(events);
    const escapedByPod = events.some((e) => e.type === 'PlayerEscaped' && e.how === 'pod');
    this.busy = false;
    if (escapedByPod && this.state.status === 'playing') {
      const choice = await choosePodOutcome(
        this.state.players.filter((p) => p.escaped),
        this.state.players.filter((p) => !p.escaped && p.condition !== 'dead'),
      );
      if (choice === 'end') {
        await this.dispatch({ type: 'END_GAME', playerId: activePlayer(this.state).id }, true);
        return;
      }
    }
    this.busy = true;
    await this.showRoundSummary(events);
    this.busy = false;
    if (state.status !== 'playing') {
      await this.tweens.wait(900);
      const score = scoreGame(state);
      const record = newRecord(this.session.setup, this.session.actions, state, score.total);
      const { rank, records } = saveRecord(record);
      this.hud.showEnd(
        state,
        score,
        rank,
        () => void showRecords(records, record.id),
        () => this.start(this.setup!),
        () => {
          this.hud.hide();
          this.openSetup();
        },
      );
      return;
    }
    if (!byBot) void this.runBots();
  }

  private async launchPod() {
    if (this.busy) return;
    const passengers = await this.hud.choosePassengers(this.state);
    if (passengers) await this.dispatch({ type: 'LAUNCH_POD', playerId: activePlayer(this.state).id, passengers });
  }

  /** Animates one engine event. `before` is the state prior to the action. */
  private async play(e: GameEvent, before: GameState) {
    const world = this.world!;
    const s = this.state;
    switch (e.type) {
      case 'PlayerMoved':
        await this.walkThroughDoor(e.playerId, e.doorId, e.to);
        break;
      case 'DiceRolled': {
        const d = e.dice;
        const bonus = d.bonuses.map((b) => ` + ${b.value} ${b.label}`).join('');
        this.hud.toast(`${d.label}: ${d.success ? 'éxito' : 'fallo'}`, {
          text: `Dado ${d.roll}${bonus} = ${d.total} (necesitas ${d.difficulty})${d.roll === 1 ? ' · un 1 siempre falla' : ''}`,
          kind: d.success ? 'ok' : 'fail',
        });
        await this.tweens.wait(500);
        break;
      }
      case 'DoorOpened': {
        const p = s.players.find((pl) => pl.id === e.byPlayerId);
        if (p) await this.approachDoor(p.id, e.doorId);
        await world.syncDoor(s.doors[e.doorId], p?.roomId ?? null);
        break;
      }
      case 'DoorFailed':
        await this.approachDoor(activePlayer(before).id, e.doorId);
        await this.rattle(e.doorId);
        break;
      case 'DoorClosed':
      case 'DoorJammed':
        await world.syncDoor(s.doors[e.doorId], null);
        break;
      case 'RoomRevealed': {
        const from = e.fromDoorId ? world.doorCell(e.fromDoorId, e.roomId) : null;
        world.setRoomState(s.rooms[e.roomId]);
        this.hud.toast(`Nueva sala: ${ROOM_NAMES[s.rooms[e.roomId].type]}`, { text: s.rooms[e.roomId].flooded ? 'Está inundada.' : undefined });
        await world.reveal(e.roomId, from, true);
        break;
      }
      case 'RoomScanned':
        this.hud.toast('Escaneo', { text: `Al otro lado hay: ${ROOM_NAMES[s.rooms[e.roomId].type]}${s.rooms[e.roomId].flooded ? ' (inundada)' : ''}` });
        break;
      case 'ItemFound':
        await this.crouch(e.playerId);
        if (e.item) {
          this.hud.toast(`Encuentras: ${ITEMS[e.item].name}`, { text: ITEMS[e.item].description, image: this.itemImages[e.item], kind: 'ok' });
        } else this.hud.toast('No encuentras nada útil', { text: 'En esta sala ya no queda nada.' });
        break;
      case 'ItemCrafted':
        await this.crouch(e.playerId);
        this.hud.toast(`Fabricas: ${ITEMS[e.item].name}`, { text: ITEMS[e.item].description, image: this.itemImages[e.item], kind: 'ok' });
        break;
      case 'ItemGiven':
        this.hud.toast(`${ITEMS[e.item].name} → ${s.players.find((p) => p.id === e.toId)!.name}`, { image: this.itemImages[e.item] });
        break;
      case 'RepairProgressed':
        await this.crouch(activePlayer(before).id);
        if (e.progress < e.required) {
          this.hud.toast(`Reparando ${e.target === 'escape_pod' ? 'la cápsula' : SYSTEM_NAMES[e.target].toLowerCase()}`, { text: `Progreso ${e.progress}/${e.required}.` });
        }
        break;
      case 'HullChanged':
        if (this.phaseNow === 'crew' && e.to > e.from) {
          this.hud.toast(`Casco apuntalado +${e.to - e.from}`, { text: `Integridad ${e.to}.`, kind: 'ok' });
        }
        break;
      case 'PlayerHealed':
        if (e.amount > 0) this.hud.toast(`${s.players.find((p) => p.id === e.playerId)!.name} recupera ${e.amount} ${e.amount === 1 ? 'vida' : 'vidas'}`, { kind: 'ok' });
        break;
      case 'RoomDrained':
        await world.setFlooded(e.roomId, false, world.isRevealed(e.roomId));
        this.hud.toast('Agua achicada', { text: ROOM_NAMES[s.rooms[e.roomId].type], kind: 'ok' });
        break;
      case 'SystemRepaired':
        this.hud.toast(e.target === 'escape_pod' ? '¡Cápsula de escape lista!' : `¡${SYSTEM_NAMES[e.target]} reparado!`, {
          kind: 'ok',
          text: e.target === 'escape_pod' ? 'Ya se puede lanzar.' : undefined,
        });
        if (e.target === 'power') world.setPower(true);
        for (const r of Object.values(s.rooms)) if (world.isRevealed(r.id)) world.setRoomState(r);
        break;
      case 'PlayerDamaged':
        this.hud.toast(`${s.players.find((p) => p.id === e.playerId)!.name}: −${e.amount} ${e.amount === 1 ? 'vida' : 'vidas'}`, { text: `Por ${e.cause}.`, kind: 'alert' });
        break;
      case 'PlayerUnconscious':
      case 'PlayerRevived':
      case 'PlayerDied':
        this.crew.get(e.playerId)!.fig.setCondition(s.players.find((p) => p.id === e.playerId)!.condition);
        {
          const name = s.players.find((p) => p.id === e.playerId)!.name;
          if (e.type === 'PlayerDied') this.hud.toast(`${name} ha muerto`, { kind: 'alert', text: 'Su jugador pasa a espectador.' });
          if (e.type === 'PlayerUnconscious') this.hud.toast(`${name} cae inconsciente`, { kind: 'alert', text: 'Reanimadle antes de 2 rondas.' });
          if (e.type === 'PlayerRevived') this.hud.toast(`${name} vuelve en sí`, { kind: 'ok', text: 'Con 1 vida.' });
        }
        break;
      case 'PlayerEscaped':
        await this.escape(e.playerId);
        break;
      case 'EventDrawn':
        // The round summary popup explains the event once the round starts.
        await this.tweens.wait(400);
        break;
      case 'RoomFlooded':
        await world.setFlooded(e.roomId, true, world.isRevealed(e.roomId));
        break;
      case 'RoomOnFire':
      case 'FireOut':
        world.setFire(e.roomId, e.type === 'RoomOnFire');
        break;
      case 'PhaseChanged':
        this.phaseNow = e.phase;
        if (e.phase === 'crisis') await this.tweens.wait(300);
        break;
      case 'TurnChanged':
        // Close in on whoever takes the turn; the wheel zooms back out.
        this.zoom = Math.min(this.zoom, 0.7);
        this.highlightActive();
        break;
      case 'ItemUsed':
        if (e.item === 'oxygen_tank') this.hud.toast('Bombona abierta', { text: 'Oxígeno común recuperado.', image: this.itemImages.oxygen_tank, kind: 'ok' });
        if (e.item === 'cigarettes') this.hud.toast('Un cigarrillo para los nervios', { text: '+1 a tu próxima tirada.', image: this.itemImages.cigarettes });
        break;
      case 'GameWon':
      case 'GameLost':
      case 'OxygenChanged':
      case 'ActionRejected':
        break;
    }
  }

  // --------------------------------------------------------- crew animation

  private highlightActive() {
    const active = this.state.status === 'playing' ? activePlayer(this.state).id : null;
    for (const [id, c] of this.crew) {
      c.fig.selected = id === active;
      c.fig.setHero(id === active);
    }
  }

  /** Walks from the current spot to the door, through it, and into the next room. */
  private async walkThroughDoor(playerId: string, doorId: string, toRoom: string) {
    const world = this.world!;
    const c = this.crew.get(playerId)!;
    const fromRoom = world.roomAt(c.x, c.z)!;
    const near = world.doorCell(doorId, fromRoom);
    const far = world.doorCell(doorId, toRoom);
    c.fig.walking = true;
    await this.walkPath(playerId, this.findPath(playerId, near) ?? []);
    await this.step(c, far, STEP_MS * 1.3);
    const goal = this.moveGoal && world.roomAt(...this.moveGoal) === toRoom ? this.moveGoal : null;
    const dest = goal ?? world.freeCells(toRoom, far).find((cell) => !this.occupied(cell, playerId) && cellKey(...cell) !== cellKey(...far));
    if (dest) await this.walkPath(playerId, this.findPath(playerId, dest) ?? []);
    c.fig.walking = false;
  }

  /** Walks up to a door (or as close as possible) before working on it. */
  private async approachDoor(playerId: string, doorId: string) {
    const world = this.world!;
    const c = this.crew.get(playerId)!;
    const room = world.roomAt(c.x, c.z)!;
    const door = world.doorCell(doorId, room);
    for (const cell of [door, ...world.freeCells(room, door).slice(0, 6)]) {
      if (this.occupied(cell, playerId) || world.blocked.has(cellKey(...cell))) continue;
      const path = this.findPath(playerId, cell);
      if (!path) continue;
      await this.walkPath(playerId, path);
      // Face the cell on the far side of the door.
      const d = world.doors.get(doorId)!.door;
      const far = cellKey(...d.a) === cellKey(...door) ? d.b : d.a;
      this.turn(c, Math.atan2(far[0] - c.x, far[1] - c.z));
      return;
    }
  }

  private async walkPath(playerId: string, path: Cell[]) {
    const c = this.crew.get(playerId)!;
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

  private occupied([x, z]: Cell, except: string) {
    for (const [id, c] of this.crew) {
      if (id === except || c.x !== x || c.z !== z) continue;
      if (!this.state.players.find((p) => p.id === id)?.escaped) return true;
    }
    return false;
  }

  /** Breadth-first search over walkable floor, avoiding other crew. */
  private findPath(playerId: string, [tx, tz]: Cell): Cell[] | null {
    const c = this.crew.get(playerId)!;
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
        if (prev.has(k) || !world.canStep(cur, next) || this.occupied(next, playerId)) continue;
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

  private async crouch(playerId: string) {
    const fig = this.crew.get(playerId)?.fig;
    if (!fig) return;
    await this.tweens.add(220, (k) => fig.root.scale.set(1, 1 - 0.18 * k, 1));
    await this.tweens.add(220, (k) => fig.root.scale.set(1, 0.82 + 0.18 * k, 1));
  }

  private escape(playerId: string) {
    const fig = this.crew.get(playerId)!.fig;
    fig.vanish();
    const y0 = fig.root.position.y;
    // Shrink away rather than hide, so the scene's light count never changes.
    return this.tweens.add(900, (k) => {
      fig.root.position.y = y0 + k * 3;
      fig.root.scale.setScalar(Math.max(0.001, 1 - k));
    });
  }

  private rattle(doorId: string) {
    const hinge = this.world!.doors.get(doorId)!.hinge;
    return this.tweens.add(300, (k) => (hinge.rotation.y = Math.sin(k * Math.PI * 6) * 0.05 * (1 - k)), { ease: ease.linear });
  }

  // ------------------------------------------------------------------ camera

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    // Full retina resolution is too heavy for integrated GPUs with this lighting.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this.tweens.tick(performance.now());
    if (this.showcase) {
      if (!this.showcaseVisible) return;
      this.azimuth += dt * SHOWCASE_SPIN;
      this.syncWalls();
    }
    if (this.world) {
      // The camera follows whoever has the turn (no one on the landing page).
      const playing = !this.showcase && this.state.status === 'playing';
      const focus = playing ? this.crew.get(activePlayer(this.state).id)?.fig.root.position : null;
      this.target.lerp(focus ? new THREE.Vector3(focus.x, 0, focus.z) : this.exploredCentre(), Math.min(1, dt * 2.5));
      const wanted = Math.max(10, this.fitDistance() * this.zoom);
      this.distance += (wanted - this.distance) * Math.min(1, dt * 2.5);
      const r = this.distance;
      this.camera.position.set(
        this.target.x + Math.sin(this.azimuth) * Math.cos(ELEVATION) * r,
        this.target.y + Math.sin(ELEVATION) * r,
        this.target.z + Math.cos(this.azimuth) * Math.cos(ELEVATION) * r,
      );
      this.camera.lookAt(this.target);
      for (const c of this.crew.values()) c.fig.update(dt, t);
      const hero = playing ? this.crew.get(activePlayer(this.state).id)?.fig : null;
      if (hero) {
        hero.root.updateMatrixWorld(true);
        hero.beamPose(this.beamPos, this.heroBeam.target.position);
        this.heroBeam.position.copy(this.beamPos);
        this.heroBeam.intensity = hero.beamIntensity();
        this.world.setFocus(hero.root.position.x, hero.root.position.z);
      } else {
        this.heroBeam.intensity = 0;
        this.world.setFocus(this.target.x, this.target.z);
      }
      this.world.update(t);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private exploredBox() {
    const box = new THREE.Box3();
    for (const r of Object.values(this.state.rooms)) {
      if (!r.discovered) continue;
      box.expandByPoint(new THREE.Vector3(r.col * ROOM_W, 0, r.row * ROOM_D));
      box.expandByPoint(new THREE.Vector3((r.col + r.span) * ROOM_W, 0, (r.row + 1) * ROOM_D));
    }
    return box;
  }

  private exploredCentre() {
    return this.exploredBox().getCenter(new THREE.Vector3());
  }

  private fitDistance() {
    const radius = this.exploredBox().getSize(new THREE.Vector3()).length() / 2 + 1.5;
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    // Leave room for the side panels.
    return Math.max(14, (radius * 1.25) / Math.tan(Math.min(vfov, hfov) / 2));
  }


  /** Lowers the walls between the camera and the ship when the camera changes quadrant. */
  private syncWalls() {
    const x = Math.sin(this.azimuth);
    const z = Math.cos(this.azimuth);
    const quadrant = `${Math.sign(Math.round(x * 50))}${Math.sign(Math.round(z * 50))}`;
    if (quadrant === this.wallQuadrant) return;
    this.wallQuadrant = quadrant;
    this.world?.updateWallsForCamera(this.azimuth);
  }

  private rotateCamera(dir: number) {
    const from = this.azimuth;
    this.azimuthGoal += (dir * Math.PI) / 2;
    const to = this.azimuthGoal;
    this.world?.updateWallsForCamera(to);
    this.tweens.add(450, (k) => (this.azimuth = from + (to - from) * k), { ease: ease.inOutSine });
  }

  // ------------------------------------------------------------------- input

  private onKey(e: KeyboardEvent) {
    if (this.showcase || (e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'q' || e.key === 'Q') this.rotateCamera(-1);
    if (e.key === 'e' || e.key === 'E') this.rotateCamera(1);
  }

  private onWheel(e: WheelEvent) {
    if (this.showcase) return;
    e.preventDefault();
    this.zoom = THREE.MathUtils.clamp(this.zoom * (1 + Math.sign(e.deltaY) * 0.08), 0.4, 1.8);
  }

  private pick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true).filter((h) => isVisible(h.object) && h.object.userData.kind);
    return hits[0]?.object.userData as { kind: string; id?: string; x?: number; z?: number; room?: string } | undefined;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.world || this.showcase) return;
    const hit = this.pick(e);
    const s = this.state;
    if (hit?.kind === 'tile') {
      const r = s.rooms[hit.room!];
      const fire = r.fireRoundsLeft > 0 ? ' · en llamas' : '';
      this.hud.tooltip(`${ROOM_NAMES[r.type]}${r.flooded ? ' · inundada' : ''}${fire}`, e.clientX, e.clientY);
    } else if (hit?.kind === 'door') {
      const d = s.doors[hit.id!];
      const p = activePlayer(s);
      const side = d.roomA === p.roomId || d.roomB === p.roomId ? p.roomId : s.rooms[d.roomA].discovered ? d.roomA : d.roomB;
      this.hud.tooltip(`${d.open ? 'Puerta abierta' : DOOR_TYPE_NAME[d.type]}<br><span class="muted">Hacia: ${beyondName(s, d, side)}</span>`, e.clientX, e.clientY);
    } else if (hit?.kind === 'crew') {
      const p = s.players.find((pl) => pl.id === hit.id)!;
      this.hud.tooltip(p.name, e.clientX, e.clientY);
    } else this.hud.tooltip(null);
  }

  private onPointerDown(e: PointerEvent) {
    if (!this.world || this.showcase || this.busy || this.botRunning || this.state.status !== 'playing' || e.button !== 0) return;
    const hit = this.pick(e);
    this.hud.hideMenu();
    if (!hit) return;
    const p = activePlayer(this.state);

    if (hit.kind === 'door') {
      const d = this.state.doors[hit.id!];
      this.hud.showMenu(e.clientX, e.clientY, d.open ? 'Puerta abierta' : DOOR_TYPE_NAME[d.type], doorOptions(this.state, hit.id!));
      return;
    }
    if (hit.kind !== 'tile') return;
    const cell: Cell = [hit.x!, hit.z!];
    if (this.world.blocked.has(cellKey(...cell))) return;
    if (hit.room === p.roomId) {
      // Moving around inside the room is free.
      this.busy = true;
      void this.walkPath(p.id, this.findPath(p.id, cell) ?? []).finally(() => (this.busy = false));
      return;
    }
    const door = Object.values(this.state.doors).find(
      (d) => d.open && ((d.roomA === p.roomId && d.roomB === hit.room) || (d.roomB === p.roomId && d.roomA === hit.room)),
    );
    if (!door) {
      this.hud.toast('No puedes ir ahí todavía', { text: 'Primero abre una puerta que lleve hasta esa sala.', kind: 'error' });
      return;
    }
    this.moveGoal = cell;
    void this.dispatch({ type: 'MOVE', playerId: p.id, toRoomId: hit.room! });
  }
}

function isVisible(o: THREE.Object3D) {
  for (let cur: THREE.Object3D | null = o; cur; cur = cur.parent) if (!cur.visible) return false;
  return true;
}
