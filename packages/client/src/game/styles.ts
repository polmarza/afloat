// Visual style of the game: "industrial oscuro" (chosen after comparing three
// prototypes). Every colour and light level lives here.

export interface Style {
  /** CSS background behind the transparent canvas. */
  background: string;
  colors: {
    floorPlate: number;
    floorGrate: number;
    floorDeck: number;
    base: number;
    wall: number;
    wallTop: number;
    pipe: number;
    metal: number;
    darkMetal: number;
    rust: number;
    wood: number;
    fabric: number;
    water: number;
    screen: number;
  };
  /** Material response: 0 = matte clay, 1 = shiny metal. */
  metalness: number;
  roughness: number;
  hemi: { sky: number; ground: number; intensity: number };
  /** Soft light hanging over every revealed room; `unlit` scales it in rooms without emergency lighting. */
  roomLight: { color: number; intensity: number; unlit: number };
  crewLight: { intensity: number; distance: number; angle: number };
  alarm: { intensity: number };
  exposure: number;
  /** Strength of the soft studio environment used for metal reflections. */
  environment: number;
}

export const STYLE: Style = {
  background: '#040506',
  colors: {
    floorPlate: 0x8c9196,
    floorGrate: 0x7a7e82,
    floorDeck: 0x868a8c,
    base: 0x2a2f33,
    wall: 0x6b7680,
    wallTop: 0xa3abb3,
    pipe: 0xa86e46,
    metal: 0xa8b2b8,
    darkMetal: 0x4f585f,
    rust: 0xa65a32,
    wood: 0x94704a,
    fabric: 0x6f8478,
    water: 0x2f7fa0,
    screen: 0x5dffb0,
  },
  metalness: 0.35,
  roughness: 0.55,
  hemi: { sky: 0x5c6e80, ground: 0x050608, intensity: 0.5 },
  roomLight: { color: 0xffb070, intensity: 16, unlit: 0.3 },
  crewLight: { intensity: 45, distance: 9, angle: 0.55 },
  alarm: { intensity: 80 },
  exposure: 1.2,
  environment: 0.18,
};

export const DOOR_COLOR = {
  normal: 0xb8c2c8,
  key: 0xe0b030,
  hack: 0x3ec6e0,
  one_way: 0xe04030,
  jammed: 0xb07a3c,
} as const;

export const ROLE_COLOR = {
  engineer: 0xe8a33a,
  medic: 0xe9e9e9,
  soldier: 0x6f9440,
  hacker: 0x4aa3e0,
  diver: 0x1fb5a5,
} as const;
