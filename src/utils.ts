const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHTML(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => escapeMap[ch]);
}

// Toast notification system
let toastContainer: HTMLElement | null = null;

function getToastContainer(): HTMLElement {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  // Auto-dismiss after 3s
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

// Modal accessibility helpers
export function trapFocus(overlay: HTMLElement) {
  const focusable = overlay.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  first?.focus();

  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
  };

  overlay.addEventListener('keydown', handler);
  return () => overlay.removeEventListener('keydown', handler);
}
