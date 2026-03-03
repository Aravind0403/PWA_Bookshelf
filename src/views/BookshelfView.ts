import { getCurrentUser } from '../storage';
import { getBooks, deleteBook, updateBook } from '../storage';
import { Book, ReadingStatus } from '../types';
import { BookDetailModal } from '../modals/BookDetailModal';
import { ManualAddModal } from '../modals/ManualAddModal';
import { ISBNScannerModal } from '../modals/ISBNScannerModal';
import { app } from '../app';
import { escapeHTML, showToast, compressImage, UnsupportedImageFormatError } from '../utils';
import { icon } from '../icons';

const PAGE_SIZE = 20;

export class BookshelfView {
  private books: Book[] = [];
  private filteredBooks: Book[] = [];
  private detailModal: BookDetailModal | null = null;
  private currentPage = 1;

  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.className = 'bookshelf-view';
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
      app.navigate('/');
      return container;
    }

    // Show loading state
    container.innerHTML = '<div class="text-center" style="padding: 60px;">Loading...</div>';

    this.books = await getBooks(currentUser.id);
    this.filteredBooks = this.books;

    container.innerHTML = this.getHTML();
    
    this.attachEventListeners(container);
    this.renderBooks(container);
    
    return container;
  }

  private getHTML(): string {
    return `
      <div class="bookshelf-container">
        <nav class="bookshelf-nav">
          <div class="nav-header">
            <button class="nav-btn" id="backBtn">
              ${icon('arrowLeft', { size: 20, strokeWidth: 2 })}
              Dashboard
            </button>
            <h2 class="bookshelf-title">My Book Shelf</h2>
            <button class="nav-btn nav-btn-icon" id="downloadCsvBtn"
                    title="Download book list as CSV" aria-label="Download book list as CSV">
              ${icon('download', { size: 18, strokeWidth: 2 })}
            </button>
          </div>
          <div class="search-container">
            <input type="text" class="input search-input" id="searchInput" placeholder="Search books...">
          </div>
        </nav>

        <div class="books-grid" id="booksGrid">
          ${this.books.length === 0 ? this.getEmptyState() : ''}
        </div>

        <div class="fab-container">
          <button class="fab fab-scan" id="scanBtn" title="Scan ISBN">
            ${icon('scan', { size: 24, strokeWidth: 2 })}
          </button>
          <button class="fab fab-add" id="addBtn" title="Add Book">
            ${icon('plus', { size: 24, strokeWidth: 2 })}
          </button>
        </div>
      </div>
    `;
  }

  private getEmptyState(): string {
    return `
      <div class="empty-state">
        ${icon('book', { size: 80, strokeWidth: 2 })}
        <h2>Your Library Awaits</h2>
        <p>Scan or add books to start building your collection</p>
      </div>
    `;
  }

  private renderBooks(container: HTMLElement) {
    const grid = container.querySelector('#booksGrid');
    if (!grid) return;

    if (this.filteredBooks.length === 0 && this.books.length > 0) {
      grid.innerHTML = '<div class="empty-state"><p>No books found matching your search.</p></div>';
      return;
    }

    if (this.filteredBooks.length === 0) {
      return;
    }

    const visibleCount = this.currentPage * PAGE_SIZE;
    const pageBooks = this.filteredBooks.slice(0, visibleCount);
    const remaining = this.filteredBooks.length - pageBooks.length;
    const hasMore = remaining > 0;

    grid.innerHTML = pageBooks.map(book => this.getBookCardHTML(book)).join('');
    this.attachCardListeners(grid as HTMLElement, container);

    if (hasMore) {
      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.className = 'load-more-btn';
      loadMoreBtn.textContent = `Load More · ${remaining} book${remaining !== 1 ? 's' : ''} remaining`;
      loadMoreBtn.addEventListener('click', () => {
        this.currentPage++;
        this.renderBooks(container);
      });
      grid.appendChild(loadMoreBtn);
    }
  }

  private attachCardListeners(grid: HTMLElement, container: HTMLElement) {
    grid.querySelectorAll('.book-card').forEach(card => {
      const bookId = card.getAttribute('data-book-id');
      if (!bookId) return;

      card.addEventListener('click', () => {
        const book = this.books.find(b => b.id === bookId);
        if (book) this.openBookDetail(book);
      });

      // Long press (touch) and right-click for delete
      let longPressTimer: ReturnType<typeof setTimeout>;
      const startLongPress = () => {
        longPressTimer = setTimeout(() => this.showDeleteConfirm(bookId), 600);
      };
      const cancelLongPress = () => clearTimeout(longPressTimer);

      card.addEventListener('mousedown', startLongPress);
      card.addEventListener('mouseup', cancelLongPress);
      card.addEventListener('mouseleave', cancelLongPress);
      card.addEventListener('touchstart', startLongPress, { passive: true });
      card.addEventListener('touchend', cancelLongPress);
      card.addEventListener('touchmove', cancelLongPress, { passive: true });
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showDeleteConfirm(bookId);
      });
    });

    // Camera upload buttons on letter covers
    grid.querySelectorAll<HTMLButtonElement>('.cover-upload-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // don't open the detail modal
        const id = btn.dataset.bookId;
        const fileInput = grid.querySelector<HTMLInputElement>(`.cover-file-input[data-book-id="${id}"]`);
        fileInput?.click();
      });
    });

    grid.querySelectorAll<HTMLInputElement>('.cover-file-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const id = input.dataset.bookId;
        const book = this.books.find(b => b.id === id);
        if (!book) return;

        try {
          const compressed = await compressImage(file);
          const updated: Book = { ...book, coverImage: compressed };
          await updateBook(updated);
          // Keep in-memory list in sync so refreshBooks renders correctly
          const idx = this.books.findIndex(b => b.id === id);
          if (idx !== -1) this.books[idx] = updated;
          await this.refreshBooks(container);
          showToast('Cover updated!', 'success');
        } catch (err) {
          const msg = err instanceof UnsupportedImageFormatError
            ? err.message
            : 'Could not upload image. Please try again.';
          showToast(msg, 'error');
        }
      });
    });
  }

  /**
   * Generates a coloured initial-letter cover for books without a cover image.
   * @param hidden - true when used as an onerror fallback behind a real <img>
   *                 (starts hidden, revealed only if the image fails to load)
   */
  private getGeneratedCoverHTML(book: Book, hidden = false): string {
    const palette = [
      '#4a6741', '#5b4a8c', '#8b4a2a', '#2a5c8c',
      '#7a4a6a', '#2a7a6a', '#8c6a2a', '#3a5a7c',
    ];
    const bg      = palette[book.title.toLowerCase().charCodeAt(0) % palette.length];
    const initial = book.title.charAt(0).toUpperCase();
    const display = hidden ? 'display:none;' : '';
    return `<div class="book-cover-placeholder book-cover-generated"
                 style="${display}background:${bg};"
                 aria-label="${escapeHTML(book.title)} — no cover available">
              <span class="book-initial">${initial}</span>
            </div>`;
  }

  private getBookCardHTML(book: Book): string {
    const statusColors: Record<ReadingStatus, string> = {
      [ReadingStatus.TO_READ]: 'var(--color-to-read)',
      [ReadingStatus.READING]: 'var(--color-reading)',
      [ReadingStatus.COMPLETED]: 'var(--color-completed)',
    };

    const statusColor = statusColors[book.status];

    // OpenLibrary's ISBN-based cover URL (covers.openlibrary.org/b/isbn/…) resolves
    // to HTTP 200 even when no cover exists (returns a tiny placeholder), so onerror
    // never fires. Real OpenLibrary covers use a numeric ID path (/b/id/12345-M.jpg).
    // Only treat the ISBN-path variant as "no cover" — ID-path URLs are genuine covers.
    const hasRealCover = !!(book.coverImage && !book.coverImage.includes('covers.openlibrary.org/b/isbn/'));

    return `
      <div class="book-card" data-book-id="${book.id}">
        <div class="book-cover-container">
          ${hasRealCover
            ? `<img src="${book.coverImage}" alt="${escapeHTML(book.title)}" class="book-cover"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               ${this.getGeneratedCoverHTML(book, true)}`
            : this.getGeneratedCoverHTML(book, false)
          }
          <button class="cover-upload-btn" data-book-id="${book.id}"
                  title="Change cover photo" aria-label="Change cover photo for ${escapeHTML(book.title)}">
            ${icon('camera', { size: 14, strokeWidth: 2 })}
          </button>
          <input type="file" accept="image/*" class="cover-file-input"
                 data-book-id="${book.id}" style="display:none;">
        </div>
        <div class="book-info">
          <h3 class="book-title">${escapeHTML(book.title)}</h3>
          <p class="book-author">${escapeHTML(book.author)}</p>
          <span class="book-status-pill" style="background-color: ${statusColor}">${book.status}</span>
        </div>
      </div>
    `;
  }

  private attachEventListeners(container: HTMLElement) {
    const backBtn = container.querySelector('#backBtn');
    backBtn?.addEventListener('click', () => {
      app.navigate('/dashboard');
    });

    const searchInput = container.querySelector('#searchInput') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      this.filteredBooks = this.books.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      );
      this.currentPage = 1; // reset to first page on new search
      this.renderBooks(container);
    });

    const scanBtn = container.querySelector('#scanBtn');
    scanBtn?.addEventListener('click', () => {
      const modal = new ISBNScannerModal();
      modal.show(() => {
        // Refresh books after adding
        this.refreshBooks(container);
      });
    });

    const addBtn = container.querySelector('#addBtn');
    addBtn?.addEventListener('click', () => {
      const modal = new ManualAddModal();
      modal.show(() => {
        // Refresh books after adding
        this.refreshBooks(container);
      });
    });

    const downloadBtn = container.querySelector('#downloadCsvBtn');
    downloadBtn?.addEventListener('click', () => this.downloadCSV());
  }

  private downloadCSV() {
    if (this.books.length === 0) {
      showToast('No books to export.', 'info');
      return;
    }

    // Build CSV — title only, properly escaped for Excel / Numbers / Sheets
    const header = 'Title';
    const rows = this.books
      .map(b => `"${b.title.replace(/"/g, '""')}"`)
      .join('\n');
    const csv = `${header}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'my-bookshelf.csv';
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Downloaded ${this.books.length} book title${this.books.length !== 1 ? 's' : ''}`, 'success');
  }

  destroy() {
    // No timers to clean up
  }

  private async refreshBooks(container: HTMLElement) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    this.books = await getBooks(currentUser.id);
    const searchInput = container.querySelector('#searchInput') as HTMLInputElement;
    const query = searchInput?.value.toLowerCase() || '';
    this.filteredBooks = this.books.filter(book =>
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    );
    this.currentPage = 1; // reset to first page after any add/delete/status change
    this.renderBooks(container);
  }

  private openBookDetail(book: Book) {
    if (!this.detailModal) {
      this.detailModal = new BookDetailModal();
    }
    this.detailModal.show(book, () => {
      // Refresh books after status change
      const container = document.querySelector('.bookshelf-view');
      if (container) {
        this.refreshBooks(container as HTMLElement);
      }
    });
  }

  private async showDeleteConfirm(bookId: string) {
    if (!confirm('Remove this book from your library?')) {
      return;
    }

    try {
      await deleteBook(bookId);
      const container = document.querySelector('.bookshelf-view');
      if (container) {
        await this.refreshBooks(container as HTMLElement);
      }
    } catch (error) {
      showToast('Error deleting book. Please try again.', 'error');
    }
  }
}
