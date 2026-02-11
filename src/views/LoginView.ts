import { createUser, loginUser } from '../storage';
import { icon } from '../icons';

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
            ${icon('book', { size: 70, class: 'book-icon', strokeWidth: 2 })}
          </div>
          <h1 class="login-title text-gradient">My Bookshelf</h1>
          <p class="login-subtitle" id="subtitle">Welcome Back, Reader</p>
          <div class="decorative-divider">
            <div class="divider-line"></div>
            ${icon('book', { size: 40, strokeWidth: 2 })}
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
                ${icon('mail', { size: 16, strokeWidth: 2 })}
                Email Address
              </label>
              <input type="email" class="input" id="email" required placeholder="your.email@example.com">
            </div>

            <div class="form-group">
              <label class="form-label">
                ${icon('lock', { size: 16, strokeWidth: 2 })}
                Password
              </label>
              <input type="password" class="input" id="password" required placeholder="••••••••">
            </div>

            <div class="form-group ${this.isSignUp ? '' : 'hidden'}" id="confirmPasswordGroup">
              <label class="form-label">
                ${icon('lock', { size: 16, strokeWidth: 2 })}
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
