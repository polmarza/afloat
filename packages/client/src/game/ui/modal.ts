// A single modal layer (#sheet). Closes with ×, the backdrop, Escape, or any
// [data-close] button; Enter presses the [data-primary] button.

let current: { close: () => void } | null = null;

export function isModalOpen() {
  return current !== null;
}

export interface ModalResult {
  box: HTMLElement;
  /** The button that closed the modal (null for ×, backdrop or Escape). */
  button: HTMLElement | null;
}

export function openModal(html: string, className = ''): Promise<ModalResult> {
  current?.close();
  const root = document.getElementById('sheet')!;
  root.innerHTML = `<div class="modal ${className}"><button class="modal-close" data-close aria-label="Cerrar">×</button>${html}</div>`;
  root.style.display = 'flex';
  const box = root.firstElementChild as HTMLElement;

  return new Promise((resolve) => {
    const onKey = (e: KeyboardEvent) => {
      // Keys meant for the modal never reach the screen behind it.
      if (e.key === 'Escape' || e.key === 'Enter') e.stopPropagation();
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter') {
        e.preventDefault();
        box.querySelector<HTMLButtonElement>('[data-primary]')?.click();
      }
    };
    const close = (button: HTMLElement | null) => {
      root.style.display = 'none';
      root.innerHTML = '';
      window.removeEventListener('keydown', onKey, true);
      current = null;
      resolve({ box, button });
    };
    root.onclick = (e) => {
      const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-close]');
      if (e.target === root) close(null);
      else if (trigger) close(trigger.classList.contains('modal-close') ? null : trigger);
    };
    window.addEventListener('keydown', onKey, true);
    current = { close: () => close(null) };
  });
}
