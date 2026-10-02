// Who this browser is in online rooms: a secret key (to get your seat back
// after a reconnection) and the last name used. Kept in localStorage; if it is
// unavailable, a key for this visit only.

const KEY = 'afloat.playerKey';
const NAME = 'afloat.playerName';

let sessionKey: string | null = null;

export function playerKey() {
  try {
    let key = localStorage.getItem(KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(KEY, key);
    }
    return key;
  } catch {
    sessionKey ??= crypto.randomUUID();
    return sessionKey;
  }
}

export function savedName() {
  try {
    return localStorage.getItem(NAME) ?? '';
  } catch {
    return '';
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME, name);
  } catch {
    // Not remembered: the player types it next time.
  }
}
