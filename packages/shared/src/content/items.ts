import { BALANCE } from '../config/balance';

export type ItemId =
  | 'bandage'
  | 'medkit'
  | 'wrench'
  | 'crowbar'
  | 'laptop'
  | 'access_card'
  | 'oxygen_tank'
  | 'diving_suit'
  | 'cigarettes';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Consumed when used (otherwise it keeps working from the inventory). */
  consumable: boolean;
  /** One line: what it does. */
  description: string;
  /** Longer notes for the item sheet. */
  details: string[];
  /** How to use it in the game. */
  usage: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  bandage: {
    id: 'bandage',
    name: 'Vendas',
    consumable: true,
    description: `Cura ${BALANCE.heal.bandage} vida`,
    details: ['Sirve para ti o para un compañero de tu misma sala.', 'No sirve para reanimar a alguien inconsciente.'],
    usage: 'Acción «Curar» en el panel. Se gastan al usarlas.',
  },
  medkit: {
    id: 'medkit',
    name: 'Botiquín',
    consumable: true,
    description: `Cura ${BALANCE.heal.medkit} vidas o reanima`,
    details: ['Si llevas vendas, se usan antes que el botiquín para curar.', 'Es lo único que permite reanimar si no eres el sanitario.'],
    usage: 'Acciones «Curar» o «Reanimar» en el panel. Se gasta al usarlo.',
  },
  wrench: {
    id: 'wrench',
    name: 'Llave inglesa',
    consumable: false,
    description: `+${BALANCE.itemBonus.wrench} a reparar`,
    details: ['Ayuda con los sistemas (energía, soporte vital, bombas) y la cápsula.', 'Varias llaves no suman entre sí.'],
    usage: 'Funciona sola mientras la lleves. No gasta acción.',
  },
  crowbar: {
    id: 'crowbar',
    name: 'Palanca',
    consumable: false,
    description: `+${BALANCE.itemBonus.crowbar} a forzar puertas`,
    details: ['Solo sirve para puertas atascadas por objetos pesados.'],
    usage: 'Funciona sola mientras la lleves. No gasta acción.',
  },
  laptop: {
    id: 'laptop',
    name: 'Portátil',
    consumable: false,
    description: `+${BALANCE.itemBonus.laptop} a hackear`,
    details: ['Solo sirve para puertas electrónicas.', 'Con la energía restaurada, esas puertas se abren sin tirada.'],
    usage: 'Funciona solo mientras lo lleves. No gasta acción.',
  },
  access_card: {
    id: 'access_card',
    name: 'Tarjeta de acceso',
    consumable: false,
    description: 'Abre puertas con llave',
    details: ['Las puertas con llave tienen la franja amarilla.', 'No se gasta: abre todas las que encuentres.'],
    usage: 'Haz clic en una puerta con llave y elige «Abrir con tarjeta».',
  },
  oxygen_tank: {
    id: 'oxygen_tank',
    name: 'Bombona de oxígeno',
    consumable: true,
    description: `+${BALANCE.oxygen.oxygenTankRestore} de oxígeno común`,
    details: ['El oxígeno es de toda la tripulación: ábrela cuando más falte.'],
    usage: 'Acción «Bombona O₂» en el panel. Se gasta al usarla.',
  },
  diving_suit: {
    id: 'diving_suit',
    name: 'Traje de buzo',
    consumable: false,
    description: 'Sin daño por agua',
    details: ['Quien lo lleva no pierde vidas al terminar la ronda en una sala inundada.', 'Entrar en el agua sigue costando 2 acciones (al buzo, 1).'],
    usage: 'Funciona solo mientras lo lleves. No gasta acción.',
  },
  cigarettes: {
    id: 'cigarettes',
    name: 'Cigarrillos',
    consumable: true,
    description: `+1 a tu próxima tirada, −${BALANCE.oxygen.cigarettesCost} de oxígeno`,
    details: ['Calman los nervios antes de una tirada difícil.', 'Gastan oxígeno de toda la tripulación.'],
    usage: 'Acción «Fumar» en el panel. Se gastan al usarlos.',
  },
};

/** Composition of the item deck that gets shuffled and spread over the rooms. */
export const ITEM_DECK: [ItemId, number][] = [
  ['bandage', 4],
  ['medkit', 2],
  ['wrench', 2],
  ['crowbar', 2],
  ['laptop', 2],
  ['access_card', 2],
  ['oxygen_tank', 2],
  ['diving_suit', 1],
  ['cigarettes', 2],
];

export const ITEM_ORDER = ITEM_DECK.map(([id]) => id);
