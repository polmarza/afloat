export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTY_NAMES: Record<Difficulty, string> = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };

export const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  easy: 'Submarino pequeño: poco que explorar.',
  normal: 'Submarino mediano.',
  hard: 'Submarino enorme: más que recorrer con las mismas acciones.',
};
