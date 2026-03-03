import { getCurrentUser } from '../storage';
import { addBook } from '../storage';
import { ReadingStatus } from '../types';
import { trapFocus, compressImage, UnsupportedImageFormatError } from '../utils';
import { icon } from '../icons';

export class ManualAddModal {
  private overlay: HTMLElement | null = null;

  show(onClose?: () => void) {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = this.getHTML();
    
    this.attachEventListeners(onClose);
    
    document.body.appendChild(this.overlay);
  }

  private getHTML(): string {
    return `
      <div class="modal-content manual-add-modal" role="dialog" aria-modal="true" aria-label="Add Book Manually">
        <button class="modal-close" id="cancelBtn">
          ${icon('close', { size: 24, strokeWidth: 2 })}
        </button>
        
        <div class="modal-header">
          <h2>Add Book Manually</h2>
        </div>

        <div class="form-section">
          <h3>Book Details</h3>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" class="input" id="titleInput" placeholder="Enter book title" required>
          </div>
          <div class="form-group">
            <label class="form-label">Author</label>
            <input type="text" class="input" id="authorInput" placeholder="Enter author name" required>
          </div>
        </div>

        <div class="form-section">
          <h3>Cover Image (Optional)</h3>
          <div class="image-preview-container" id="imagePreview">
            <div class="image-placeholder">
              ${icon('book', { size: 60, strokeWidth: 2 })}
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-full" id="chooseImageBtn">Choose Image</button>
          <input type="file" accept="image/*" id="imageInput" style="display: none;">
        </div>

        <button class="btn btn-primary btn-full" id="addBtn" disabled>Add Book</button>

        <div class="error-message hidden" id="errorMessage"></div>
      </div>
    `;
  }

  private attachEventListeners(onClose?: () => void) {
    if (!this.overlay) return;

    const cancelBtn = this.overlay.querySelector('#cancelBtn');
    cancelBtn?.addEventListener('click', () => {
      this.close();
      onClose?.();
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
        onClose?.();
      }
    });

    // Escape key & focus trap
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { this.close(); onClose?.(); }
    };
    document.addEventListener('keydown', escapeHandler);
    const removeTrap = trapFocus(this.overlay);
    const origClose = this.close.bind(this);
    this.close = () => { document.removeEventListener('keydown', escapeHandler); removeTrap(); origClose(); };

    const titleInput = this.overlay.querySelector('#titleInput') as HTMLInputElement;
    const authorInput = this.overlay.querySelector('#authorInput') as HTMLInputElement;
    const addBtn = this.overlay.querySelector('#addBtn') as HTMLButtonElement;

    const validateForm = () => {
      const isValid = titleInput.value.trim() !== '' && authorInput.value.trim() !== '';
      addBtn.disabled = !isValid;
    };

    titleInput?.addEventListener('input', validateForm);
    authorInput?.addEventListener('input', validateForm);

    const chooseImageBtn = this.overlay.querySelector('#chooseImageBtn');
    const imageInput = this.overlay.querySelector('#imageInput') as HTMLInputElement;
    
    chooseImageBtn?.addEventListener('click', () => {
      imageInput?.click();
    });

    imageInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.previewImage(file);
      }
    });

    addBtn?.addEventListener('click', async () => {
      await this.saveBook(onClose);
    });
  }

  private async previewImage(file: File) {
    const preview = this.overlay?.querySelector('#imagePreview');
    if (!preview) return;

    preview.innerHTML = `<p style="padding:10px;text-align:center;color:var(--color-gold);font-size:13px;">Compressing…</p>`;

    try {
      const compressed = await compressImage(file);
      preview.innerHTML = `<img src="${compressed}" alt="Book cover" class="image-preview">`;
    } catch (err) {
      const msg = err instanceof UnsupportedImageFormatError
        ? err.message
        : 'Could not load image.';
      preview.innerHTML = `<p style="padding:10px;text-align:center;color:#e07070;font-size:13px;">${msg}</p>`;
    }
  }

  private async saveBook(onClose?: () => void) {
    if (!this.overlay) return;

    const titleInput    = this.overlay.querySelector('#titleInput')    as HTMLInputElement;
    const authorInput   = this.overlay.querySelector('#authorInput')   as HTMLInputElement;
    const imagePreview  = this.overlay.querySelector('#imagePreview img') as HTMLImageElement | null;
    const errorMessage  = this.overlay.querySelector('#errorMessage')  as HTMLElement;

    const title  = titleInput.value.trim();
    const author = authorInput.value.trim();
    // Only store coverImage when the user actually chose one
    const coverImage = imagePreview?.src || undefined;

    if (!title || !author) {
      errorMessage.textContent = 'Please fill in all required fields.';
      errorMessage.classList.remove('hidden');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      await addBook(currentUser.id, {
        title,
        author,
        ...(coverImage ? { coverImage } : {}),
        status: ReadingStatus.TO_READ,
      });

      this.close();
      onClose?.();
    } catch (error) {
      errorMessage.textContent = 'Error adding book. Please try again.';
      errorMessage.classList.remove('hidden');
    }
  }

  private close() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}
