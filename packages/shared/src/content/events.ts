export type EventCardId = 'flood' | 'short_circuit' | 'fire' | 'collapse' | 'scrubber_failure' | 'calm';

export const EVENT_NAMES: Record<EventCardId, string> = {
  flood: 'Fuga de agua',
  short_circuit: 'Cortocircuito',
  fire: 'Incendio',
  collapse: 'Derrumbe',
  scrubber_failure: 'Fallo del depurador',
  calm: 'Calma',
};

/** What each event does, for the round summary. */
export const EVENT_DESCRIPTIONS: Record<EventCardId, string> = {
  flood: 'Una sala de la cubierta inferior se inunda.',
  short_circuit: 'Una puerta electrónica abierta vuelve a cerrarse.',
  fire: 'Una sala arde durante 2 rondas: no se puede entrar y quien se quede dentro pierde vida.',
  collapse: 'Una puerta abierta queda atascada; quien esté al lado puede resultar herido.',
  scrubber_failure: 'El depurador falla y se pierde oxígeno.',
  calm: 'No pasa nada. Aprovechad.',
};

export const EVENT_DECK: [EventCardId, number][] = [
  ['flood', 3],
  ['short_circuit', 2],
  ['fire', 2],
  ['collapse', 2],
  ['scrubber_failure', 2],
  ['calm', 3],
];
