import { Book, ReadingStatus } from '../types';
import { updateBook } from '../storage';

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
      <div class="modal-content book-detail-modal">
        <div class="book-detail-header">
          <h2>Book Details</h2>
          <button class="modal-close" id="closeBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="book-detail-cover">
          ${book.coverImage ? 
            `<img src="${book.coverImage}" alt="${book.title}">` :
            `<div class="book-cover-placeholder-large">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
                <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
              </svg>
            </div>`
          }
        </div>

        <div class="book-detail-info">
          <h1 class="book-detail-title">${book.title}</h1>
          <p class="book-detail-author">by ${book.author}</p>
        </div>

        <div class="reading-status-section">
          <h3>Reading Status</h3>
          <div class="status-buttons">
            ${Object.values(ReadingStatus).map(status => `
              <button class="status-btn ${book.status === status ? 'selected' : ''}" 
                data-status="${status}"
                style="${book.status === status ? this.getStatusStyle(status) : ''}">
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

  private getStatusStyle(status: ReadingStatus): string {
    const colors: Record<ReadingStatus, string> = {
      [ReadingStatus.TO_READ]: 'var(--color-to-read)',
      [ReadingStatus.READING]: 'var(--color-reading)',
      [ReadingStatus.COMPLETED]: 'var(--color-completed)',
    };
    // Add opacity to background, keep text fully opaque
    return `background: linear-gradient(135deg, ${colors[status]}cc, ${colors[status]}99); color: white; font-weight: 600;`;
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

    const statusBtns = this.overlay.querySelectorAll('.status-btn');
    statusBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = (btn as HTMLElement).dataset.status as ReadingStatus;
        await this.updateStatus(newStatus, onUpdate);
      });
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

      // Show celebration if completed
      if (newStatus === ReadingStatus.COMPLETED && this.currentBook.status !== ReadingStatus.COMPLETED) {
        this.showCelebration();
      }

      // Update UI
      if (this.overlay) {
        this.overlay.innerHTML = this.getHTML(updatedBook);
        this.attachEventListeners(onUpdate);
      }

      onUpdate?.();
    } catch (error) {
      alert('Error updating book status. Please try again.');
    }
  }

  private showCelebration() {
    const celebration = document.createElement('div');
    celebration.className = 'celebration-overlay';
    celebration.innerHTML = `
      <div class="celebration-card">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="celebration-star">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <h2>Congratulations!</h2>
        <p>You finished another book!</p>
        <p class="celebration-subtitle">Keep up the great reading!</p>
        <button class="btn btn-primary" id="continueBtn">Continue</button>
      </div>
    `;

    document.body.appendChild(celebration);

    const continueBtn = celebration.querySelector('#continueBtn');
    continueBtn?.addEventListener('click', () => {
      document.body.removeChild(celebration);
    });

    celebration.addEventListener('click', (e) => {
      if (e.target === celebration) {
        document.body.removeChild(celebration);
      }
    });
  }

  private close() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      this.currentBook = null;
    }
  }
}

