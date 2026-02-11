import { getCurrentUser } from '../storage';
import { getBooks, deleteBook } from '../storage';
import { Book, ReadingStatus } from '../types';
import { BookDetailModal } from '../modals/BookDetailModal';
import { ManualAddModal } from '../modals/ManualAddModal';
import { ISBNScannerModal } from '../modals/ISBNScannerModal';
import { app } from '../app';
import { escapeHTML, showToast } from '../utils';
import { icon } from '../icons';

export class BookshelfView {
  private books: Book[] = [];
  private filteredBooks: Book[] = [];
  private detailModal: BookDetailModal | null = null;

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
          <button class="nav-btn" id="backBtn">
            ${icon('arrowLeft', { size: 20, strokeWidth: 2 })}
            Dashboard
          </button>
          <h2 class="bookshelf-title">My Book Shelf</h2>
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

    grid.innerHTML = this.filteredBooks.map(book => this.getBookCardHTML(book)).join('');
    
    // Attach event listeners to book cards
    grid.querySelectorAll('.book-card').forEach(card => {
      const bookId = card.getAttribute('data-book-id');
      if (bookId) {
        card.addEventListener('click', () => {
          const book = this.books.find(b => b.id === bookId);
          if (book) {
            this.openBookDetail(book);
          }
        });

        // Long press / right click for delete
        let longPressTimer: ReturnType<typeof setTimeout>;
        card.addEventListener('mousedown', () => {
          longPressTimer = setTimeout(() => {
            this.showDeleteConfirm(bookId);
          }, 500);
        });
        card.addEventListener('mouseup', () => {
          clearTimeout(longPressTimer);
        });
        card.addEventListener('mouseleave', () => {
          clearTimeout(longPressTimer);
        });
        card.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.showDeleteConfirm(bookId);
        });
      }
    });
  }

  private getBookCardHTML(book: Book): string {
    const statusColors: Record<ReadingStatus, string> = {
      [ReadingStatus.TO_READ]: 'var(--color-to-read)',
      [ReadingStatus.READING]: 'var(--color-reading)',
      [ReadingStatus.COMPLETED]: 'var(--color-completed)',
    };

    const statusColor = statusColors[book.status];

    return `
      <div class="book-card" data-book-id="${book.id}">
        <div class="book-cover-container">
          ${book.coverImage ?
            `<img src="${book.coverImage}" alt="${escapeHTML(book.title)}" class="book-cover"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div class="book-cover-placeholder" style="display:none;">
              ${icon('book', { size: 60, strokeWidth: 2 })}
            </div>` :
            `<div class="book-cover-placeholder">
              ${icon('book', { size: 60, strokeWidth: 2 })}
            </div>`
          }
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
