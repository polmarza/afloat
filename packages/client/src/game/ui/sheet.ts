// Content of the modals: character sheet, item sheet, item found, round/turn summary.

import { CHARACTERS } from '@afloat/shared/content/characters';
import { EVENT_DESCRIPTIONS, EVENT_NAMES, type EventCardId } from '@afloat/shared/content/events';
import { DIFFICULTY_NAMES } from '@afloat/shared/content/difficulty';
import { ITEMS, type ItemId } from '@afloat/shared/content/items';
import { ROLES, type RoleId } from '@afloat/shared/content/roles';
import { BALANCE } from '@afloat/shared/config/balance';
import type { Player } from '@afloat/shared/engine';
import type { ItemImages, Portraits } from '../portraits';
import { loadRecords, type GameRecord } from '../records';
import { escapeHtml } from './escape';
import { openModal } from './modal';

export function hearts(on: number, max: number) {
  return '<i class="heart on"></i>'.repeat(on) + '<i class="heart"></i>'.repeat(Math.max(0, max - on));
}

export function showSheet(role: RoleId, portraits: Portraits) {
  const c = CHARACTERS[role];
  return openModal(
    `<div class="sheet-photo"><img src="${portraits[role].full}" alt="${c.name}" /></div>
    <div class="sheet-body">
      <div class="sheet-kicker">${ROLES[role].name.toUpperCase()}</div>
      <h2>${c.name}</h2>
      <div class="muted">${c.title}</div>
      <p class="sheet-story">${c.story}</p>
      <h3>Habilidades</h3>
      <ul>${c.abilities.map((a) => `<li>${a}</li>`).join('')}</ul>
      <div class="sheet-lives">${hearts(c.lives, c.lives)} <span class="muted">${c.lives} vidas</span></div>
    </div>`,
    `sheet role-${role}`,
  );
}

export function showItemSheet(item: ItemId, images: ItemImages) {
  const it = ITEMS[item];
  return openModal(
    `<div class="sheet-photo item-photo"><img src="${images[item]}" alt="${it.name}" /></div>
    <div class="sheet-body">
      <div class="sheet-kicker">${it.consumable ? 'OBJETO · SE GASTA AL USARLO' : 'OBJETO · PERMANENTE'}</div>
      <h2>${it.name}</h2>
      <p class="sheet-effect">${it.description}</p>
      <ul>${it.details.map((d) => `<li>${d}</li>`).join('')}</ul>
      <h3>Cómo se usa</h3>
      <p>${it.usage}</p>
    </div>`,
    'sheet item',
  );
}

export interface RoundInfo {
  round: number;
  oxygenUsed: number;
  /** Made by the greenhouse at the start of the round. */
  oxygenMade: number;
  oxygenLeft: number;
  hullLost: number;
  hullLeft: number;
  event: { card: EventCardId; where: string | null } | null;
}

/** Summary shown when a new round starts (after every player has had their turn). */
export async function showRoundPopup(round: RoundInfo) {
  await openModal(
    `<div class="turn-popup">
      <div class="sheet-kicker">RONDA ${round.round}</div>
      <div class="round-line"><span>Oxígeno</span><b>−${round.oxygenUsed}</b><span class="muted">quedan ${round.oxygenLeft}</span></div>
      ${round.oxygenMade ? `<div class="round-line"><span>Invernadero</span><b class="good">+${round.oxygenMade}</b><span class="muted">oxígeno de las plantas</span></div>` : ''}
      <div class="round-line"><span>Casco</span><b class="hull">−${round.hullLost}</b><span class="muted">integridad ${round.hullLeft}/${BALANCE.hull.initial}</span></div>
      ${
        round.event
          ? `<div class="round-event ${round.event.card === 'calm' ? '' : 'alert'}">
              <b>${EVENT_NAMES[round.event.card]}${round.event.where ? ` · ${round.event.where}` : ''}</b>
              <span>${EVENT_DESCRIPTIONS[round.event.card]}</span>
            </div>`
          : '<div class="round-event"><span>Primera ronda: el submarino aún resiste.</span></div>'
      }
      <div class="row end"><button class="primary" data-close data-primary>Continuar</button></div>
    </div>`,
    'small',
  );
}

/** Table of best scores. `highlight` marks the game just played. */
export async function showRecords(records: GameRecord[], highlight?: string) {
  const date = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const crew = (r: GameRecord) => r.game.players.map((p) => `${escapeHtml(p.name)}${p.bot && !p.name.includes('(IA)') ? ' <span class="tag bot-tag">IA</span>' : ''}`).join(', ');
  const rows = records
    .map(
      (r, i) => `<tr class="${r.id === highlight ? 'mine' : ''}">
        <td>${i + 1}</td>
        <td><b>${r.score}</b></td>
        <td class="${r.status}">${r.status === 'won' ? `Victoria · ${r.saved} a salvo` : 'Derrota'}</td>
        <td>${DIFFICULTY_NAMES[r.difficulty ?? 'normal']}</td>
        <td>${r.rounds}</td>
        <td>${crew(r)}</td>
        <td class="muted">${escapeHtml(r.game.seed)}<br>${date(r.date)}</td>
      </tr>`,
    )
    .join('');
  await openModal(
    `<div class="records">
      <div class="sheet-kicker">RÉCORDS · EN ESTE ORDENADOR</div>
      <h2>Mejores partidas</h2>
      ${
        records.length
          ? `<table><thead><tr><th>#</th><th>Puntos</th><th>Resultado</th><th>Nivel</th><th>Rondas</th><th>Tripulación</th><th>Semilla</th></tr></thead><tbody>${rows}</tbody></table>`
          : '<p class="muted">Todavía no hay partidas terminadas.</p>'
      }
      <p class="muted">Puntos: +${BALANCE.score.perSaved} por tripulante a salvo, +${BALANCE.score.surfaceBonus} si emergéis con el submarino, +${BALANCE.score.perOxygen} por punto de oxígeno, +${BALANCE.score.perHull} por punto de casco, +${BALANCE.score.perSystem} por sistema reparado, −${-BALANCE.score.perDead} por muerto y −${-BALANCE.score.perRound} por ronda. Después se multiplica por la dificultad: ×${BALANCE.score.multiplier.easy} Fácil, ×${BALANCE.score.multiplier.normal} Normal, ×${BALANCE.score.multiplier.hard} Difícil.</p>
      <div class="row end"><button class="primary" data-close data-primary>Cerrar</button></div>
    </div>`,
    'wide',
  );
}

/** In-game menu. Resolves 'abandon' only after a confirmation. */
/** `online`: leaving means leaving the room (the game goes on for the others). */
export async function showGameMenu(online = false): Promise<'resume' | 'abandon'> {
  const { button } = await openModal(
    `<div class="guide">
      <div class="sheet-kicker">MENÚ</div>
      <h2>Partida en curso</h2>
      <div class="row"><button data-close data-choice="abandon">${online ? 'Salir de la sala' : 'Abandonar partida'}</button><button data-close data-choice="records">Récords</button><button class="primary" data-close data-primary>Seguir jugando</button></div>
    </div>`,
    'small',
  );
  if (button?.dataset.choice === 'records') {
    await showRecords(loadRecords());
    return 'resume';
  }
  if (button?.dataset.choice !== 'abandon') return 'resume';
  const confirm = await openModal(
    `<div class="guide">
      <div class="sheet-kicker">${online ? 'SALIR' : 'ABANDONAR'}</div>
      <h2>¿Seguro?</h2>
      <p>${online ? 'La partida sigue para los demás. Si vuelves a abrir el enlace de la sala, recuperas tu tripulante.' : 'La partida se perderá y volveréis a la pantalla inicial.'}</p>
      <div class="row"><button class="primary" data-close data-primary>No, seguir jugando</button><button data-close data-choice="abandon">${online ? 'Sí, salir' : 'Sí, abandonar'}</button></div>
    </div>`,
    'small',
  );
  return confirm.button?.dataset.choice === 'abandon' ? 'abandon' : 'resume';
}

/** Tutorial: what this room is for. */
export async function showGuide(kicker: string, guide: { title: string; text: string; tip: string }) {
  await openModal(
    `<div class="guide">
      <div class="sheet-kicker">${escapeHtml(kicker)}</div>
      <h2>${guide.title}</h2>
      <p>${guide.text}</p>
      <p class="tip">${guide.tip}</p>
      <div class="row end"><button class="primary" data-close data-primary>Entendido</button></div>
    </div>`,
    'small guide-modal',
  );
}

/** Tutorial: the goal and the basics, before the first round. */
export async function showIntro() {
  await openModal(
    `<div class="guide">
      <div class="sheet-kicker">TUTORIAL</div>
      <h2>Salid a flote</h2>
      <p>Despertáis en los camarotes de un submarino averiado. Ganáis si <b>al menos uno</b> sale a la superficie: en la <b>cápsula de escape</b> o haciendo <b>emerger</b> el submarino desde la sala de control (con energía y bombas reparadas).</p>
      <ul>
        <li><b>Oxígeno</b>: es de todos y baja cada ronda. Si llega a 0, perdéis.</li>
        <li><b>Casco</b>: se va dañando con la presión y los accidentes. Si llega a 0, cede. Se puede apuntalar.</li>
        <li>Cada jugador tiene <b>3 acciones</b> por turno. Abrir puertas, buscar, reparar o curar gasta una.</li>
        <li>Haz clic en una <b>puerta</b> para abrirla o cruzarla, y en el <b>suelo</b> para moverte.</li>
        <li>Las linternas empiezan apagadas: pulsa <b>L</b> para encender o apagar la tuya. No gasta acción.</li>
        <li>Las acciones <b>destacadas</b> son las propias de la sala en la que estás.</li>
      </ul>
      <div class="row end"><button class="primary" data-close data-primary>Empezar</button></div>
    </div>`,
    'guide-modal',
  );
}

/** After the pod launches with crew still on board: keep going or stop here. */
export async function choosePodOutcome(saved: Player[], aboard: Player[]): Promise<'continue' | 'end'> {
  const names = (list: Player[]) => list.map((p) => `<b>${escapeHtml(p.name)}</b>`).join(', ');
  const { button } = await openModal(
    `<div class="guide">
      <div class="sheet-kicker">CÁPSULA LANZADA</div>
      <h2>¡${saved.length === 1 ? 'Uno de vosotros ya está' : 'Ya hay tripulantes'} a salvo!</h2>
      <p>${names(saved)} ${saved.length === 1 ? 'sale' : 'salen'} a flote. La partida ya es una victoria.</p>
      <p>Siguen a bordo: ${names(aboard)}. Podéis seguir jugando para intentar emerger con ellos, o terminar aquí.</p>
      <div class="row"><button data-close data-choice="end">Terminar la partida</button><button class="primary" data-close data-primary data-choice="continue">Seguir jugando</button></div>
    </div>`,
    'small',
  );
  return button?.dataset.choice === 'end' ? 'end' : 'continue';
}
