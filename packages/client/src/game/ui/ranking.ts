// The online ranking on the landing page: total points and best game, with
// your own row highlighted (or your place below, when outside the top).

import { RANKING_SIZE, type RankingResponse, type RankingRow } from '@afloat/shared/net/protocol';
import { playerFingerprint } from '../online/identity';
import { escapeHtml } from './escape';

type Board = 'total' | 'best';

const BOARDS: { id: Board; name: string; points: string }[] = [
  { id: 'total', name: 'Total', points: 'Puntos sumados' },
  { id: 'best', name: 'Mejor partida', points: 'Mejor puntuación' },
];

/** Loads the ranking into `root` (the section's content) and wires its tabs. True if anyone is in it. */
export async function showRanking(root: HTMLElement): Promise<boolean> {
  let board: Board = 'total';
  let data: RankingResponse | null = null;
  const render = () => {
    if (!data) return;
    const rows = data[board];
    const mine = data.me?.[board];
    const meta = BOARDS.find((b) => b.id === board)!;
    root.innerHTML = `
      <div class="ranking-tabs" role="tablist">${BOARDS.map(
        (b) => `<button role="tab" aria-selected="${b.id === board}" class="${b.id === board ? 'on' : ''}" data-board="${b.id}">${b.name}</button>`,
      ).join('')}</div>
      ${
        rows.length
          ? `<table class="ranking-table">
              <thead><tr><th>#</th><th>Jugador</th><th>${meta.points}</th><th>Partidas</th></tr></thead>
              <tbody>${rows.map(row).join('')}${mine ? `<tr class="gap"><td colspan="4">…</td></tr>${row(mine)}` : ''}</tbody>
            </table>`
          : '<p class="muted">Todavía no hay partidas online terminadas. ¡Estrenad el ranking!</p>'
      }`;
  };
  root.onclick = (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-board]');
    if (!t) return;
    board = t.dataset.board as Board;
    render();
  };

  root.innerHTML = '<p class="muted">Cargando el ranking…</p>';
  try {
    const res = await fetch(`/api/ranking?me=${await playerFingerprint()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = (await res.json()) as RankingResponse;
    render();
    return data.total.length > 0;
  } catch {
    root.innerHTML = '<p class="muted">No se ha podido cargar el ranking ahora mismo.</p>';
    return false;
  }
}

function row(r: RankingRow) {
  return `<tr class="${r.me ? 'me' : ''}"><td>${r.rank}</td><td>${escapeHtml(r.name)}${r.me ? ' <span class="tag turn-tag">Tú</span>' : ''}</td><td>${r.points}</td><td>${r.games}</td></tr>`;
}

export const RANKING_INTRO = `Solo cuentan las partidas online terminadas en las que todos los tripulantes son personas. Cada jugador suma la puntuación de la partida, también quien se sacrifica. Top ${RANKING_SIZE}.`;
