// The animated scenes of the landing page: the hero, one per "how to play"
// step and one per room type. Texts and numbers come from the game content
// and BALANCE; the scenes only show what the rules already say.

import { BALANCE } from '@afloat/shared/config/balance';
import { EVENT_DESCRIPTIONS, EVENT_NAMES } from '@afloat/shared/content/events';
import { ITEMS } from '@afloat/shared/content/items';
import type { RoleId } from '@afloat/shared/content/roles';
import { FLOODED_GUIDE, ROOM_BLURBS, ROOM_GUIDE, ROOM_NAMES, type RoomType } from '@afloat/shared/content/rooms';
import type { GameState } from '@afloat/shared/engine';
import { findRooms, type Pick, type Script, type Stage } from '../vignette';

export interface Slide {
  kicker?: string;
  title: string;
  text: string;
  tip?: string;
  scene: Script;
}

// ------------------------------------------------------------ room picking

const ofType = (s: GameState, type: RoomType) => Object.values(s.rooms).filter((r) => r.type === type);
const neighbours = (s: GameState, id: string) =>
  Object.values(s.doors)
    .filter((d) => d.roomA === id || d.roomB === id)
    .map((d) => (d.roomA === id ? d.roomB : d.roomA));

/** A room of `type` and a one-module neighbour on the same deck. */
function withNeighbour(type: RoomType): Pick {
  return findRooms((s) => {
    for (const r of ofType(s, type)) {
      const n = neighbours(s, r.id).find((id) => s.rooms[id].lowerDeck === r.lowerDeck && s.rooms[id].span === 1);
      if (n) return [r.id, n];
    }
    return null;
  });
}

const single = (type: RoomType) =>
  findRooms((s) => {
    const r = ofType(s, type)[0];
    return r ? [r.id] : null;
  });
const lowerDeckRoom = () => findRooms((s) => {
  const r = Object.values(s.rooms).find((x) => x.lowerDeck && x.span === 1 && x.type !== 'escape_pod');
  return r ? [r.id] : null;
});

const crewIn = (room: string, roles: RoleId[]) => roles.map((role) => ({ role, room }));

// ---------------------------------------------------------------- overlays

const pips = (left: number, label: string) => `<div class="v-hud">
    <span class="v-label">ACCIONES</span>
    <span class="v-pips">${[0, 1, 2].map((i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span>
    <b>${label}</b>
  </div>`;

const meter = (label: string, value: number, max: number, note: string, kind: 'oxygen' | 'hull') => `<div class="v-hud">
    <span class="v-label">${label}</span>
    <span class="v-bar ${kind}"><i style="width:${Math.max(0, (value / max) * 100)}%"></i></span>
    <b>${value}</b><span class="muted">${note}</span>
  </div>`;

const card = (kicker: string, title: string, text = '') =>
  `<div class="v-card"><div class="sheet-kicker">${kicker}</div><b>${title}</b>${text ? `<p>${text}</p>` : ''}</div>`;

const PHASES = ['Crisis', 'Tripulación', 'Consecuencias'];
const phases = (active: number) =>
  `<div class="v-hud v-phases">${PHASES.map((p, i) => `<span class="${i === active ? 'on' : ''}">${i + 1}. ${p}</span>`).join('')}</div>`;

// ------------------------------------------------------------------- hero

export const heroScene: Script = async (s) => {
  const pick = single('quarters');
  s.build({ pick, crew: crewIn(pick.rooms[0], ['engineer', 'medic', 'soldier']) });
  await s.reveal(pick.rooms[0]);
  await s.dropCrew();
};

// ----------------------------------------------------------- how to play

const o = BALANCE.oxygen;
const breathing = (crew: number) => o.baseConsumption + crew * o.perCrewMember;

const darkScene: Script = async (s) => {
  const pick = withNeighbour('quarters');
  const [q, n] = pick.rooms;
  s.build({ pick, crew: crewIn(q, ['engineer', 'medic', 'soldier']) });
  await s.reveal(q);
  await s.dropCrew();
  await s.wait(900);
  const door = s.doorBetween(q, n);
  await s.approachDoor(0, door);
  await s.openDoor(door, q);
  s.overlay(card('NUEVA SALA', ROOM_NAMES[pick.ship.rooms[n].type]));
  await s.reveal(n, door);
  await s.wait(1600);
};

const actionsScene: Script = async (s) => {
  const pick = withNeighbour('quarters');
  const [q, n] = pick.rooms;
  s.build({ pick, crew: crewIn(q, ['hacker']) });
  s.overlay(pips(3, ''));
  await s.reveal(q);
  await s.dropCrew();
  await s.wait(700);
  const door = s.doorBetween(q, n);
  s.overlay(pips(3, 'Abrir puerta'));
  await s.approachDoor(0, door);
  await s.openDoor(door, q);
  s.overlay(pips(2, 'Abrir puerta'));
  await s.reveal(n, door);
  s.overlay(pips(2, 'Moverse'));
  await s.walkThrough(0, door, n);
  s.overlay(pips(1, 'Moverse'));
  await s.wait(500);
  s.overlay(pips(1, 'Buscar'));
  await s.crouch(0);
  s.overlay(pips(0, 'Buscar') + card('ENCUENTRAS', ITEMS.wrench.name, ITEMS.wrench.description));
  await s.popItem(0, 'wrench');
  s.overlay(pips(0, 'Fin del turno'));
  await s.wait(1200);
};

const oxygenScene: Script = async (s) => {
  const pick = single('quarters');
  s.build({ pick, crew: crewIn(pick.rooms[0], ['engineer', 'medic', 'soldier']) });
  let oxygen = o.initial;
  let alive = 3;
  const show = (extra = '') => s.overlay(meter('OXÍGENO', oxygen, o.initial, `−${breathing(alive)}/ronda`, 'oxygen') + extra);
  show();
  await s.reveal(pick.rooms[0]);
  await s.dropCrew();
  for (let round = 1; round <= 4; round++) {
    await s.wait(1100);
    oxygen -= breathing(alive);
    show();
    if (round === 2) {
      await s.wait(700);
      s.fall(2);
      alive--;
      show(card('UNO MENOS', 'El resto aguanta más', `Ahora gastáis ${breathing(alive)} por ronda en vez de ${breathing(alive + 1)}.`));
      await s.wait(1600);
    }
  }
  await s.wait(1200);
};

const hullScene: Script = async (s) => {
  const h = BALANCE.hull;
  const pick = lowerDeckRoom();
  const room = pick.rooms[0];
  s.build({ pick, crew: crewIn(room, ['diver', 'engineer']) });
  let hull = h.initial;
  const show = (extra = '') => s.overlay(meter('CASCO', hull, h.initial, `−${h.perRound}/ronda`, 'hull') + extra);
  show();
  await s.reveal(room);
  await s.dropCrew();
  await s.wait(1000);
  hull -= h.perRound;
  show(card('PRESIÓN', `Casco −${h.perRound}`));
  await s.wait(1500);
  hull -= h.perRound + h.eventDamage.flood;
  show(card('EVENTO', EVENT_NAMES.flood, `${EVENT_DESCRIPTIONS.flood} Casco −${h.perRound} por la presión y −${h.eventDamage.flood} por la fuga.`));
  await s.flood(room);
  await s.wait(2200);
};

const phasesScene: Script = async (s) => {
  const pick = withNeighbour('quarters');
  const [q, n] = pick.rooms;
  s.build({ pick, crew: [...crewIn(q, ['medic']), ...crewIn(n, ['soldier'])] });
  s.overlay(phases(-1));
  const door = s.doorBetween(q, n);
  await s.reveal(q);
  await s.openDoor(door, q);
  await s.reveal(n, door);
  await s.dropCrew();
  await s.wait(800);
  s.setFire(n, true);
  const lost = `Oxígeno −${breathing(2)} · Casco −${BALANCE.hull.perRound + BALANCE.hull.eventDamage.fire}`;
  s.overlay(phases(0) + card('EVENTO', EVENT_NAMES.fire, lost));
  await s.wait(2000);
  s.overlay(phases(1));
  await s.walkThrough(1, door, q);
  await s.walkTo(0, s.freeCells(q)[3]);
  await s.wait(600);
  s.overlay(phases(2) + card('CONSECUENCIAS', 'Nadie se ha quedado en el fuego', `Terminar la ronda en una sala en llamas o inundada cuesta ${BALANCE.fire.damage} vida.`));
  await s.wait(2400);
  s.setFire(n, false);
};

const exitsScene: Script = async (s) => {
  const pick = withNeighbour('escape_pod');
  const [pod, n] = pick.rooms;
  s.build({ pick, crew: crewIn(n, ['engineer', 'medic']) });
  await s.reveal(n);
  await s.dropCrew();
  const door = s.doorBetween(pod, n);
  await s.approachDoor(0, door);
  await s.openDoor(door, n);
  await s.reveal(pod, door);
  await s.walkThrough(0, door, pod);
  const needed = BALANCE.repairRequired.escape_pod;
  for (let i = 1; i <= needed; i++) {
    s.overlay(card('CÁPSULA DE ESCAPE', `Reparando ${i}/${needed}`));
    await s.crouch(0);
    await s.wait(400);
  }
  s.overlay(card('CÁPSULA LANZADA', '¡Uno de vosotros ya está a salvo!', 'El resto puede seguir e intentar emerger desde la sala de control.'));
  await s.escape(0);
  await s.wait(2000);
};

/** The "how to play" slides, in order. */
export const STEPS: Slide[] = [
  {
    title: 'Despertáis a oscuras',
    text: 'Solo los camarotes tienen luz. Cada puerta que abrís descubre una sala nueva, y el submarino es distinto en cada partida.',
    scene: darkScene,
  },
  {
    title: `${BALANCE.actionsPerTurn} acciones por turno`,
    text: `Abrir puertas, moverse, buscar, reparar, curar, dar y usar objetos. Lo difícil se decide con 1d${BALANCE.dice.sides} más las bonificaciones de tu rol y tus objetos; un ${BALANCE.dice.autoFailOn} siempre falla.`,
    scene: actionsScene,
  },
  {
    title: 'El oxígeno es de todos',
    text: `Empezáis con ${o.initial}. Cada ronda se escapan ${o.baseConsumption} por el casco dañado y cada tripulante respira ${o.perCrewMember}. Si alguien cae, el resto aguanta más.`,
    scene: oxygenScene,
  },
  {
    title: 'El casco cede',
    text: `Su integridad empieza en ${BALANCE.hull.initial} y baja ${BALANCE.hull.perRound} cada ronda por la presión, más con cada crisis. Si llega a 0, se acabó.`,
    scene: hullScene,
  },
  {
    title: 'Crisis, tripulación y consecuencias',
    text: `Cada ronda tiene tres fases. En la crisis se gasta oxígeno, el casco cede y, desde la ronda ${BALANCE.firstEventRound}, sale una carta de evento. Después juega la tripulación y al final se pagan los daños.`,
    scene: phasesScene,
  },
  {
    title: 'Dos salidas',
    text: `Reparad la cápsula de escape (${BALANCE.escapePod.seats} plaza) o la energía y las bombas para emerger desde la sala de control con todos. Basta con que uno salga a flote para ganar.`,
    scene: exitsScene,
  },
];

// ------------------------------------------------------------------ rooms

const ROOM_GROUPS: { title: string; rooms: RoomType[] }[] = [
  { title: 'Sistemas que reparar', rooms: ['engine', 'life_support', 'pumps', 'escape_pod'] },
  { title: 'Salas especiales', rooms: ['bridge', 'greenhouse', 'lab', 'cantina'] },
  { title: 'El resto del submarino', rooms: ['quarters', 'infirmary', 'storage', 'torpedo', 'corridor'] },
];

/** Who stands in each room on its slide. */
const ROOM_CREW: Partial<Record<RoomType, RoleId>> = {
  engine: 'engineer',
  life_support: 'engineer',
  pumps: 'diver',
  escape_pod: 'soldier',
  bridge: 'hacker',
  greenhouse: 'medic',
  lab: 'medic',
  cantina: 'soldier',
  quarters: 'engineer',
};

const roomScene =
  (type: RoomType): Script =>
  async (s: Stage) => {
    const pick = single(type);
    const role = ROOM_CREW[type];
    s.build({ pick, crew: role ? crewIn(pick.rooms[0], [role]) : [], power: type === 'greenhouse' });
    await s.reveal(pick.rooms[0]);
    await s.dropCrew();
    await s.wait(1800);
  };

const floodedScene: Script = async (s) => {
  const pick = lowerDeckRoom();
  s.build({ pick, crew: crewIn(pick.rooms[0], ['diver']) });
  await s.reveal(pick.rooms[0]);
  await s.dropCrew();
  await s.wait(500);
  await s.flood(pick.rooms[0]);
  await s.wait(1800);
};

/** One slide per room type, grouped, plus the flooded lower deck. */
export const ROOM_SLIDES: Slide[] = [
  ...ROOM_GROUPS.flatMap((g) =>
    g.rooms.map((type) => ({
      kicker: g.title.toUpperCase(),
      title: ROOM_NAMES[type],
      text: ROOM_GUIDE[type]?.text ?? ROOM_BLURBS[type] ?? '',
      tip: ROOM_GUIDE[type]?.tip,
      scene: roomScene(type),
    })),
  ),
  {
    kicker: 'CUBIERTA INFERIOR',
    title: FLOODED_GUIDE.title,
    text: `Las salas de la cubierta inferior pueden inundarse. ${FLOODED_GUIDE.text}`,
    tip: FLOODED_GUIDE.tip,
    scene: floodedScene,
  },
];
