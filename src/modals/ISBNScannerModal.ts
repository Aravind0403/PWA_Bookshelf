import { getCurrentUser } from '../storage';
import { addBook, getBooks } from '../storage';
import { fetchBookByISBN, validateISBN, getErrorMessage } from '../api';
import { ReadingStatus } from '../types';
import Quagga from '@ericblade/quagga2';

export class ISBNScannerModal {
  private overlay: HTMLElement | null = null;
  private isLoading = false;
  private isScanning = false;

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
      <div class="modal-content isbn-scanner-modal">
        <button class="modal-close" id="closeBtn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div class="scanner-header">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2m0 6v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2m0-6V7a2 2 0 0 1 2-2h2"/>
          </svg>
          <h2>Scan or Enter ISBN</h2>
          <p>Use camera to scan barcode or enter manually</p>
        </div>

        <div class="scanner-tabs">
          <button class="tab-btn active" id="manualTab">Manual Entry</button>
          <button class="tab-btn" id="cameraTab">Camera Scan</button>
        </div>

        <div class="tab-content" id="manualContent">
          <div class="form-group">
            <input type="text" class="input" id="isbnInput" placeholder="Enter ISBN (10 or 13 digits)" maxlength="17">
          </div>

          <button class="btn btn-primary btn-full" id="searchBtn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            Search Book
          </button>
        </div>

        <div class="tab-content hidden" id="cameraContent">
          <div id="reader" style="width: 100%; max-width: 500px; margin: 0 auto;"></div>
          <button class="btn btn-secondary btn-full" id="stopScanBtn" style="margin-top: var(--spacing-lg);">Stop Scanning</button>
        </div>

        <div class="error-message hidden" id="errorMessage"></div>

        <div class="loading-overlay hidden" id="loadingOverlay">
          <div class="loading-card">
            <div class="spinner"></div>
            <p>Fetching book info...</p>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(onClose?: () => void) {
    if (!this.overlay) return;

    const closeBtn = this.overlay.querySelector('#closeBtn');
    closeBtn?.addEventListener('click', () => {
      this.close();
      onClose?.();
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
        onClose?.();
      }
    });

    const isbnInput = this.overlay.querySelector('#isbnInput') as HTMLInputElement;
    const searchBtn = this.overlay.querySelector('#searchBtn') as HTMLButtonElement;

    // Auto-detect hardware scanner (rapid input)
    let scannerBuffer = '';
    let scannerTimeout: NodeJS.Timeout;

    isbnInput?.addEventListener('input', () => {
      clearTimeout(scannerTimeout);
      scannerBuffer = isbnInput.value;
      
      // If input happens very fast (scanner), auto-search after 100ms
      scannerTimeout = setTimeout(() => {
        if (scannerBuffer.length >= 10 && !this.isLoading) {
          this.searchBook(onClose);
        }
        scannerBuffer = '';
      }, 100);
    });

    isbnInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isLoading) {
        this.searchBook(onClose);
      }
    });

    searchBtn?.addEventListener('click', () => {
      if (!this.isLoading) {
        this.searchBook(onClose);
      }
    });

    // Tab switching
    const manualTab = this.overlay.querySelector('#manualTab');
    const cameraTab = this.overlay.querySelector('#cameraTab');
    const manualContent = this.overlay.querySelector('#manualContent');
    const cameraContent = this.overlay.querySelector('#cameraContent');
    const stopScanBtn = this.overlay.querySelector('#stopScanBtn');

    manualTab?.addEventListener('click', async () => {
      await this.stopCameraScanning();
      manualTab.classList.add('active');
      cameraTab?.classList.remove('active');
      manualContent?.classList.remove('hidden');
      cameraContent?.classList.add('hidden');
    });

    cameraTab?.addEventListener('click', () => {
      cameraTab.classList.add('active');
      manualTab?.classList.remove('active');
      cameraContent?.classList.remove('hidden');
      manualContent?.classList.add('hidden');
      this.startCameraScanning();
    });

    stopScanBtn?.addEventListener('click', async () => {
      await this.stopCameraScanning();
    });
  }

  private async startCameraScanning() {
    if (this.isScanning) return;

    const readerDiv = this.overlay?.querySelector('#reader');
    if (!readerDiv) return;

    this.isScanning = true;

    Quagga.init({
      inputStream: {
        type: "LiveStream",
        target: readerDiv as HTMLElement,
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment"
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: 4,
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader"]
      },
      locate: true
    }, (err) => {
      if (err) {
        const errorMessage = this.overlay?.querySelector('#errorMessage') as HTMLElement;
        this.showError(errorMessage, 'Camera access denied or not available.');
        this.isScanning = false;
        return;
      }
      Quagga.start();
    });

    // Only accept high-confidence scans
    Quagga.onDetected((result) => {
      const code = result.codeResult.code;
      const errors = result.codeResult.decodedCodes
        .filter((x: any) => x.error !== undefined)
        .map((x: any) => x.error);
      const avgError = errors.reduce((a: number, b: number) => a + b, 0) / errors.length;

      // Only accept if error rate is low (high confidence)
      if (code && avgError < 0.1) {
        this.stopCameraScanning();
        this.processScannedISBN(code);
      }
    });
  }

  private async stopCameraScanning() {
    if (this.isScanning) {
      Quagga.stop();
      this.isScanning = false;
    }
  }

  private processScannedISBN(isbn: string) {
    // Clean ISBN
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    // Switch to manual tab and fill input
    const manualTab = this.overlay?.querySelector('#manualTab') as HTMLElement;
    const cameraTab = this.overlay?.querySelector('#cameraTab') as HTMLElement;
    const manualContent = this.overlay?.querySelector('#manualContent') as HTMLElement;
    const cameraContent = this.overlay?.querySelector('#cameraContent') as HTMLElement;
    const isbnInput = this.overlay?.querySelector('#isbnInput') as HTMLInputElement;

    manualTab?.classList.add('active');
    cameraTab?.classList.remove('active');
    manualContent?.classList.remove('hidden');
    cameraContent?.classList.add('hidden');

    if (isbnInput) {
      isbnInput.value = cleanISBN;
    }

    // Auto-search
    this.searchBook();
  }

  private async searchBook(onClose?: () => void) {
    if (!this.overlay || this.isLoading) return;

    const isbnInput = this.overlay.querySelector('#isbnInput') as HTMLInputElement;
    const errorMessage = this.overlay.querySelector('#errorMessage') as HTMLElement;
    const loadingOverlay = this.overlay.querySelector('#loadingOverlay') as HTMLElement;
    const searchBtn = this.overlay.querySelector('#searchBtn') as HTMLButtonElement;

    const isbn = isbnInput.value.trim();

    if (!isbn) {
      this.showError(errorMessage, 'Please enter an ISBN number.');
      return;
    }

    if (!validateISBN(isbn)) {
      this.showError(errorMessage, 'Invalid ISBN format. Please enter a valid 10 or 13 digit ISBN.');
      return;
    }

    this.isLoading = true;
    loadingOverlay?.classList.remove('hidden');
    searchBtn.disabled = true;
    errorMessage?.classList.add('hidden');

    try {
      const bookData = await fetchBookByISBN(isbn);
      
      if (!bookData) {
        this.showError(errorMessage, 'Book not found. Try manual entry?');
        this.isLoading = false;
        loadingOverlay?.classList.add('hidden');
        searchBtn.disabled = false;
        return;
      }

      // Check if book already exists
      const currentUser = getCurrentUser();
      if (!currentUser) {
        this.isLoading = false;
        loadingOverlay?.classList.add('hidden');
        searchBtn.disabled = false;
        return;
      }

      const existingBooks = await getBooks(currentUser.id);
      const duplicate = existingBooks.find(b => 
        b.title.toLowerCase() === bookData.title.toLowerCase() &&
        b.author.toLowerCase() === bookData.author.toLowerCase()
      );

      if (duplicate) {
        this.showError(errorMessage, 'This book is already in your shelf!');
        this.isLoading = false;
        loadingOverlay?.classList.add('hidden');
        searchBtn.disabled = false;
        return;
      }

      // Add book
      await addBook(currentUser.id, {
        title: bookData.title,
        author: bookData.author,
        coverImage: bookData.coverImage,
        status: ReadingStatus.TO_READ,
        isbn: isbn.replace(/[-\s]/g, ''),
      });

      this.close();
      onClose?.();
    } catch (error) {
      const message = getErrorMessage(error);
      this.showError(errorMessage, message);
      this.isLoading = false;
      loadingOverlay?.classList.add('hidden');
      searchBtn.disabled = false;
    }
  }

  private showError(element: HTMLElement, message: string) {
    element.textContent = message;
    element.classList.remove('hidden');
  }

  private close() {
    this.stopCameraScanning();
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      this.isLoading = false;
    }
  }
}