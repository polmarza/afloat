export type RoleId = 'engineer' | 'medic' | 'soldier' | 'hacker' | 'diver';

export interface RoleDef {
  id: RoleId;
  name: string;
  ability: string;
}

export const ROLES: Record<RoleId, RoleDef> = {
  engineer: { id: 'engineer', name: 'Ingeniero', ability: '+2 a reparar' },
  medic: { id: 'medic', name: 'Sanitario', ability: 'Cura 2 vidas y reanima sin objetos' },
  soldier: { id: 'soldier', name: 'Militar', ability: '+2 a forzar puertas atascadas; 4 vidas' },
  hacker: { id: 'hacker', name: 'Informático', ability: '+2 a hackear; puede escanear salas' },
  diver: { id: 'diver', name: 'Buzo', ability: 'Se mueve por el agua sin penalización; respira la mitad' },
};

export const ROLE_ORDER: RoleId[] = ['engineer', 'medic', 'soldier', 'hacker', 'diver'];
