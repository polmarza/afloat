import { BALANCE } from '../config/balance';

export type RoomType =
  | 'quarters'
  | 'bridge'
  | 'engine'
  | 'life_support'
  | 'pumps'
  | 'escape_pod'
  | 'cantina'
  | 'greenhouse'
  | 'lab'
  | 'infirmary'
  | 'storage'
  | 'torpedo'
  | 'corridor';

export const ROOM_NAMES: Record<RoomType, string> = {
  quarters: 'Camarotes',
  bridge: 'Sala de control',
  engine: 'Sala de máquinas',
  life_support: 'Soporte vital',
  pumps: 'Sala de bombas',
  escape_pod: 'Cápsula de escape',
  cantina: 'Cantina',
  greenhouse: 'Invernadero',
  lab: 'Laboratorio',
  infirmary: 'Enfermería',
  storage: 'Almacén',
  torpedo: 'Sala de torpedos',
  corridor: 'Pasillo',
};

/** Exactly one of each in every ship. */
export const MANDATORY_ROOMS: RoomType[] = ['quarters', 'bridge', 'engine', 'life_support', 'pumps', 'escape_pod'];

/** Rooms with something to do inside: at most one of each per ship. */
export const UNIQUE_ROOMS: RoomType[] = ['greenhouse', 'lab'];

/** The one room that takes two modules side by side (12×5). At most one per ship. */
export const WIDE_ROOM: RoomType = 'cantina';

/** Used to fill the remaining modules (they can repeat). */
export const FILLER_ROOMS: RoomType[] = ['infirmary', 'storage', 'torpedo', 'corridor'];

export type SystemId = 'power' | 'life_support' | 'pumps';

/** Room that houses each ship system. */
export const SYSTEM_ROOM: Record<SystemId, RoomType> = {
  power: 'engine',
  life_support: 'life_support',
  pumps: 'pumps',
};

export const SYSTEM_NAMES: Record<SystemId, string> = {
  power: 'Energía',
  life_support: 'Soporte vital',
  pumps: 'Bombas y lastre',
};

/** Tutorial notes shown the first time someone enters a room with something to do. */
export const ROOM_GUIDE: Partial<Record<RoomType, { title: string; text: string; tip: string }>> = {
  engine: {
    title: 'Aquí está la energía',
    text: 'Repárala con 2 tiradas con éxito. Al volver la luz se apaga la alarma, se descubren las salas vecinas a las ya exploradas y las puertas electrónicas se abren sin tirada.',
    tip: 'El ingeniero tiene +2 a reparar; una llave inglesa da +1.',
  },
  life_support: {
    title: 'Aquí está el soporte vital',
    text: 'Repáralo con 2 tiradas con éxito para cortar la fuga de oxígeno del casco: a partir de entonces solo gastáis lo que respiráis.',
    tip: 'Es la mejor inversión si la partida va para largo.',
  },
  pumps: {
    title: 'Aquí están las bombas y el lastre',
    text: 'Repáralas con 2 tiradas con éxito. Permiten achicar el agua de una sala y, junto con la energía, emerger con todo el submarino desde la sala de control.',
    tip: 'Emerger salva a todos los que sigan vivos, también a los inconscientes.',
  },
  escape_pod: {
    title: 'La cápsula de escape',
    text: 'Repárala con 2 tiradas con éxito y lánzala. Solo cabe una persona, que tiene que estar consciente y en esta sala, y solo se puede lanzar una vez.',
    tip: 'Si alguien se salva, ya habéis ganado: los demás pueden seguir intentando emerger.',
  },
  greenhouse: {
    title: 'El invernadero',
    text: `Con la energía reparada, las plantas producen +${BALANCE.rooms.greenhouseOxygen} de oxígeno al empezar cada ronda. Basta con haberlo descubierto: no hace falta quedarse aquí.`,
    tip: 'Otro motivo para reparar la energía cuanto antes.',
  },
  lab: {
    title: 'El laboratorio',
    text: `Fabricar cuesta ${BALANCE.rooms.craft.cost} acciones y una tirada (${BALANCE.difficulty.craft}+). Si sale bien, elegís un botiquín o una bombona de oxígeno. Solo quedan materiales para ${BALANCE.rooms.craft.maxPerGame} fabricaciones en toda la partida.`,
    tip: 'Las tiradas fallidas no gastan materiales.',
  },
  cantina: {
    title: 'La cantina',
    text: `Comer y descansar cuesta 1 acción y recupera ${BALANCE.rooms.restHeal} vida. Cada tripulante puede hacerlo una vez en toda la partida.`,
    tip: 'Guárdalo para cuando te falte vida de verdad.',
  },
  bridge: {
    title: 'La sala de control',
    text: 'Con la energía y las bombas reparadas, desde aquí se puede emerger y salir todos a flote.',
    tip: 'Busca primero la sala de máquinas y la de bombas.',
  },
};

/** One line for the rooms without a guide (they only have scenery and hidden items). */
export const ROOM_BLURBS: Partial<Record<RoomType, string>> = {
  quarters: 'Donde os despierta la alarma. La única sala con luz al empezar, y siempre esconde algún objeto.',
  infirmary: 'Camillas y botiquines de pared.',
  storage: 'Cajas y estanterías.',
  torpedo: 'Tubos de lanzamiento y torpedos en sus raíles.',
  corridor: 'Conecta salas.',
};

export const FLOODED_GUIDE = {
  title: 'Sala inundada',
  text: 'Entrar cuesta 2 acciones y quien termine la ronda dentro pierde 1 vida. El buzo entra con 1 acción y no se hace daño; el traje de buzo también protege.',
  tip: 'Con las bombas reparadas se puede achicar el agua.',
};
