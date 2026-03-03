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

/** Error thrown by compressImage when the browser can't decode the format. */
export class UnsupportedImageFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedImageFormatError';
  }
}

/**
 * Resizes the image to max 300×450 px and encodes as JPEG at 70% quality.
 * A 4 MB iPhone photo typically compresses down to 15–40 KB — well within
 * Firestore's 1 MB document limit.
 * Throws UnsupportedImageFormatError for HEIC/HEIF files (not decodable by
 * the browser Canvas API on non-Safari browsers).
 */
export function compressImage(file: File): Promise<string> {
  // HEIC/HEIF is Apple's default iPhone format. Browsers other than Safari
  // can't decode it via the Image/Canvas API. Detect early and surface a
  // clear, actionable message rather than a generic failure.
  const isHEIC = /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (isHEIC) {
    return Promise.reject(
      new UnsupportedImageFormatError(
        'HEIC photos can\'t be used directly. In the Photos app tap Share → Save as JPEG, then try again.'
      )
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const MAX_W = 300;
      const MAX_H = 450;
      let { width, height } = img;

      const ratio = Math.min(MAX_W / width, MAX_H / height, 1);
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error('Canvas not supported')); return; }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
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
