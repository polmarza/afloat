// The playable characters: one per role, with a short backstory for their sheet.

import { BALANCE } from '../config/balance';
import type { RoleId } from './roles';

export interface CharacterDef {
  role: RoleId;
  /** Character's name (players type their own name separately). */
  name: string;
  /** Job on board. */
  title: string;
  story: string;
  abilities: string[];
  lives: number;
}

const r = BALANCE.roleBonus;

export const CHARACTERS: Record<RoleId, CharacterDef> = {
  engineer: {
    role: 'engineer',
    name: 'Marta Ibáñez',
    title: 'Jefa de máquinas',
    story:
      'Lleva doce años bajando a la sala de máquinas antes que nadie. Conoce cada válvula del casco por su sonido y jura que el reactor le habla. Esta noche no le ha gustado lo que ha oído.',
    abilities: [`+${r.engineerRepair} a reparar sistemas y la cápsula`, 'Con llave inglesa, +1 más'],
    lives: BALANCE.health.default,
  },
  medic: {
    role: 'medic',
    name: 'Tomás Rey',
    title: 'Sanitario de a bordo',
    story:
      'Cambió las urgencias de un hospital de costa por la calma del submarino. Tiene las manos más firmes de la tripulación y un botiquín que nunca deja en el camarote.',
    abilities: [`Cura ${r.medicHealAmount} vidas sin gastar objetos`, 'Reanima a los inconscientes sin botiquín'],
    lives: BALANCE.health.default,
  },
  soldier: {
    role: 'soldier',
    name: 'Iker Loinaz',
    title: 'Sargento de seguridad',
    story:
      'Veterano de operaciones de rescate. Habla poco, duerme menos y es el primero en echar el hombro contra una escotilla que no quiere abrirse.',
    abilities: [`+${r.soldierForce} a forzar puertas atascadas`, 'Con palanca, +2 más', `Aguanta ${BALANCE.health.soldier} vidas`],
    lives: BALANCE.health.soldier,
  },
  hacker: {
    role: 'hacker',
    name: 'Nuria Sol',
    title: 'Técnica de sistemas',
    story:
      'Mantiene vivas las redes del submarino con cinta aislante y paciencia. Si una puerta tiene un circuito, ella encuentra la forma de convencerlo.',
    abilities: [`+${r.hackerHack} a hackear puertas electrónicas`, 'Con portátil, +1 más', 'Escanear: sabe qué sala hay tras una puerta cerrada'],
    lives: BALANCE.health.default,
  },
  diver: {
    role: 'diver',
    name: 'Bruno Castell',
    title: 'Buzo de rescate',
    story:
      'Ha pasado más horas bajo el agua que en tierra firme. El frío no le asusta y respira despacio por costumbre: en un submarino sin aire, eso vale oro.',
    abilities: [
      `Entrar en salas inundadas le cuesta ${BALANCE.movement.diverFloodedCost} acción`,
      'No recibe daño por agua',
      'Consume la mitad de oxígeno',
    ],
    lives: BALANCE.health.default,
  },
};
