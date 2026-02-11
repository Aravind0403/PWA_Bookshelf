import { Book, ReadingStatus } from '../types';
import { updateBook, deleteBook } from '../storage';
import { escapeHTML, showToast, trapFocus } from '../utils';
import confetti from 'canvas-confetti';

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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div class="book-detail-header">
          <h2>Book Details</h2>
        </div>

        <div class="book-detail-cover">
          ${book.coverImage ?
            `<img src="${book.coverImage}" alt="${escapeHTML(book.title)}">` :
            `<div class="book-cover-placeholder-large">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
                <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
              </svg>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  ${this.getStatusIcon(status)}
                </svg>
                <span>${status}</span>
                ${book.status === status ? `
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ` : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-secondary btn-full delete-btn" id="deleteBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Remove Book
        </button>
      </div>
    `;
  }

  private getStatusIcon(status: ReadingStatus): string {
    switch (status) {
      case ReadingStatus.TO_READ:
        return '<path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/><path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>';
      case ReadingStatus.READING:
        return '<path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/><path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/><line x1="12" y1="6" x2="12" y2="18"/>';
      case ReadingStatus.COMPLETED:
        return '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
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