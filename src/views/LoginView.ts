import { createUser, loginUser } from '../storage';


export class LoginView {
  private isSignUp = false;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'login-view';
    container.innerHTML = this.getHTML();

    this.attachEventListeners(container);
    this.createFloatingBooks(container);

    return container;
  }

  private getHTML(): string {
    return `
      <div class="login-container">
        <div class="login-hero">
          <div class="book-icon-container">
            <svg class="book-icon" width="70" height="70" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20" stroke="url(#goldGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z" stroke="url(#goldGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#E6CC80;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#CC9959;stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 class="login-title text-gradient">My Bookshelf</h1>
          <p class="login-subtitle" id="subtitle">Welcome Back, Reader</p>
          <div class="decorative-divider">
            <div class="divider-line"></div>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20" stroke="currentColor" stroke-width="2"/>
              <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <div class="divider-line"></div>
          </div>
        </div>

        <div class="login-form-container">
          <div class="mode-toggle">
            <button class="mode-btn ${!this.isSignUp ? 'active' : ''}" data-mode="signin">Sign In</button>
            <button class="mode-btn ${this.isSignUp ? 'active' : ''}" data-mode="signup">Sign Up</button>
          </div>

          <form class="login-form" id="loginForm">
            <div class="form-group">
              <label class="form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email Address
              </label>
              <input type="email" class="input" id="email" required placeholder="your.email@example.com">
            </div>

            <div class="form-group">
              <label class="form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Password
              </label>
              <input type="password" class="input" id="password" required placeholder="••••••••">
            </div>

            <div class="form-group ${this.isSignUp ? '' : 'hidden'}" id="confirmPasswordGroup">
              <label class="form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Confirm Password
              </label>
              <input type="password" class="input" id="confirmPassword" placeholder="••••••••">
            </div>

            <div class="error-message hidden" id="errorMessage"></div>

            <button type="submit" class="btn btn-primary btn-full" id="submitBtn">
              ${this.isSignUp ? 'Create Your Library' : 'Enter Library'}
            </button>

            ${!this.isSignUp ? `
              <a href="#" class="forgot-password" id="forgotPassword">Forgotten Your Key?</a>
            ` : ''}
          </form>
        </div>
      </div>
    `;
  }

  private attachEventListeners(container: HTMLElement) {
    // Mode toggle
    const modeButtons = container.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = (e.target as HTMLElement).dataset.mode;
        this.isSignUp = mode === 'signup';
        container.innerHTML = this.getHTML();
        this.attachEventListeners(container);
        this.createFloatingBooks(container);
      });
    });

    // Form submission
    const form = container.querySelector('#loginForm') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit(container);
    });
  }

  private async handleSubmit(container: HTMLElement) {
    const emailInput = container.querySelector('#email') as HTMLInputElement;
    const passwordInput = container.querySelector('#password') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('#confirmPassword') as HTMLInputElement;
    const errorMessage = container.querySelector('#errorMessage') as HTMLElement;
    const submitBtn = container.querySelector('#submitBtn') as HTMLButtonElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput?.value || '';

    // Validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      this.showError(errorMessage, 'Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      this.showError(errorMessage, 'Password must be at least 6 characters.');
      return;
    }

    if (this.isSignUp && password !== confirmPassword) {
      this.showError(errorMessage, 'Passwords do not match.');
      return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';

    try {
      if (this.isSignUp) {
        // Sign up
        await createUser(email, password);
        // Auth state listener in App will handle navigation
      } else {
        // Sign in
        await loginUser(email, password);
        // Auth state listener in App will handle navigation
      }
    } catch (error: unknown) {
      let message = 'An error occurred.';
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (firebaseError.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }

      this.showError(errorMessage, message);
      submitBtn.disabled = false;
      submitBtn.textContent = this.isSignUp ? 'Create Your Library' : 'Enter Library';
    }
  }

  private showError(element: HTMLElement, message: string) {
    element.textContent = message;
    element.classList.remove('hidden');
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = 'slideDown 0.3s ease';
    }, 10);
  }

  destroy() {
    // No timers or listeners to clean up
  }

  private createFloatingBooks(container: HTMLElement) {
    const bookIcons = ['📖', '📚', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📑', '📄', '📰'];

    for (let i = 0; i < 12; i++) {
      const book = document.createElement('div');
      book.className = 'floating-book';
      book.textContent = bookIcons[Math.floor(Math.random() * bookIcons.length)];
      book.style.left = `${Math.random() * 100}%`;
      book.style.top = `${Math.random() * 100}%`;
      book.style.fontSize = `${30 + Math.random() * 40}px`;
      book.style.opacity = `${0.3 + Math.random() * 0.3}`;
      book.style.animationDuration = `${8 + Math.random() * 7}s`;
      book.style.animationDelay = `${Math.random() * 2}s`;
      container.appendChild(book);
    }
  }
}

