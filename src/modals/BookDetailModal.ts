import { Book, ReadingStatus } from '../types';
import { updateBook, deleteBook } from '../storage';
import { escapeHTML, showToast, trapFocus } from '../utils';
import confetti from 'canvas-confetti';
import { icon } from '../icons';

export class BookDetailModal {
  private overlay: HTMLElement | null = null;
  private currentBook: Book | null = null;

  show(book: Book, onUpdate?: () => void) {
    this.currentBook = book;

    if (this.overlay) {
      document.body.removeChild(this.overlay);
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = this.getHTML(book);
    
    this.attachEventListeners(onUpdate);
    
    document.body.appendChild(this.overlay);
  }

  private getHTML(book: Book): string {
    return `
      <div class="modal-content book-detail-modal" role="dialog" aria-modal="true" aria-label="Book Details">
        <button class="modal-close" id="closeBtn">
          ${icon('close', { size: 24, strokeWidth: 2 })}
        </button>

        <div class="book-detail-header">
          <h2>Book Details</h2>
        </div>

        <div class="book-detail-cover">
          ${book.coverImage ?
            `<img src="${book.coverImage}" alt="${escapeHTML(book.title)}">` :
            `<div class="book-cover-placeholder-large">
              ${icon('book', { size: 80, strokeWidth: 2 })}
            </div>`
          }
        </div>

        <div class="book-detail-info">
          <h1 class="book-detail-title">${escapeHTML(book.title)}</h1>
          <p class="book-detail-author">by ${escapeHTML(book.author)}</p>
        </div>

        <div class="reading-status-section">
          <h3>Reading Status</h3>
          <div class="status-buttons">
            ${Object.values(ReadingStatus).map(status => `
              <button class="status-btn ${book.status === status ? 'selected' : ''}" 
                data-status="${status}">
                ${this.getStatusIcon(status)}
                <span>${status}</span>
                ${book.status === status ? `
                  ${icon('checkmark', { size: 20, strokeWidth: 2 })}
                ` : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-secondary btn-full delete-btn" id="deleteBtn">
          ${icon('trash', { size: 20, strokeWidth: 2 })}
          Remove Book
        </button>
      </div>
    `;
  }

  private getStatusIcon(status: ReadingStatus): string {
    switch (status) {
      case ReadingStatus.TO_READ:
        return icon('book', { size: 20, strokeWidth: 2 });
      case ReadingStatus.READING:
        return icon('bookReading', { size: 20, strokeWidth: 2 });
      case ReadingStatus.COMPLETED:
        return icon('checkmark', { size: 20, strokeWidth: 2 });
    }
  }

  private attachEventListeners(onUpdate?: () => void) {
    if (!this.overlay || !this.currentBook) return;

    const closeBtn = this.overlay.querySelector('#closeBtn');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Escape key & focus trap
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { this.close(); }
    };
    document.addEventListener('keydown', escapeHandler);
    const removeTrap = trapFocus(this.overlay);
    const origClose = this.close.bind(this);
    this.close = () => { document.removeEventListener('keydown', escapeHandler); removeTrap(); origClose(); };

    const statusBtns = this.overlay.querySelectorAll('.status-btn');
    statusBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = (btn as HTMLElement).dataset.status as ReadingStatus;
        await this.updateStatus(newStatus, onUpdate);
      });
    });

    const deleteBtn = this.overlay.querySelector('#deleteBtn');
    deleteBtn?.addEventListener('click', async () => {
      await this.handleDelete(onUpdate);
    });
  }

  private async updateStatus(newStatus: ReadingStatus, onUpdate?: () => void) {
    if (!this.currentBook) return;

    const updatedBook: Book = {
      ...this.currentBook,
      status: newStatus,
      dateCompleted: newStatus === ReadingStatus.COMPLETED ? new Date() : this.currentBook.dateCompleted,
    };

    try {
      await updateBook(updatedBook);
      this.currentBook = updatedBook;

      // Trigger confetti for completion
      if (newStatus === ReadingStatus.COMPLETED) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      this.close();
      onUpdate?.();
    } catch (error) {
      showToast('Failed to update book. Please try again.', 'error');
    }
  }

  private async handleDelete(onUpdate?: () => void) {
    if (!this.currentBook) return;

    const confirmed = confirm(`Remove "${this.currentBook.title}" from your library?`);
    if (!confirmed) return;

    try {
      await deleteBook(this.currentBook.id);
      this.close();
      onUpdate?.();
    } catch (error) {
      showToast('Failed to delete book. Please try again.', 'error');
    }
  }

  private close() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}
