import { getCurrentUser } from '../storage';
import { addBook } from '../storage';
import { ReadingStatus } from '../types';
import { trapFocus } from '../utils';

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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
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
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
                <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
              </svg>
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

  private previewImage(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = this.overlay?.querySelector('#imagePreview');
      if (preview && e.target?.result) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Book cover" class="image-preview">`;
      }
    };
    reader.readAsDataURL(file);
  }

  private async saveBook(onClose?: () => void) {
    if (!this.overlay) return;

    const titleInput = this.overlay.querySelector('#titleInput') as HTMLInputElement;
    const authorInput = this.overlay.querySelector('#authorInput') as HTMLInputElement;
    const imagePreview = this.overlay.querySelector('#imagePreview img') as HTMLImageElement;
    const errorMessage = this.overlay.querySelector('#errorMessage') as HTMLElement;

    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    const coverImage = imagePreview?.src || '';

    if (!title || !author) {
      if (errorMessage) {
        errorMessage.textContent = 'Please fill in all required fields.';
        errorMessage.classList.remove('hidden');
      }
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      await addBook(currentUser.id, {
        title,
        author,
        coverImage,
        status: ReadingStatus.TO_READ,
      });

      this.close();
      onClose?.();
    } catch (error) {
      if (errorMessage) {
        errorMessage.textContent = 'Error adding book. Please try again.';
        errorMessage.classList.remove('hidden');
      }
    }
  }

  private close() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}