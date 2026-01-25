import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { BookshelfView } from './views/BookshelfView';
import { getCurrentUser } from './storage';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { setCurrentUser } from './storage';

export class App {
  private currentView: HTMLElement | null = null;

  init() {
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          id: user.uid,
          email: user.email || '',
          isLoggedIn: true
        });
      } else {
        setCurrentUser(null);
      }
      this.render();
    });

    // Initial render attempt (will likely show loading or login until auth resolves)
    this.render();
    window.addEventListener('popstate', () => this.render());
  }

  private async render() {
    const app = document.getElementById('app');
    if (!app) return;

    const currentUser = getCurrentUser();

    // Clear previous view
    if (this.currentView) {
      // Basic cleanup if needed
      app.innerHTML = '';
    }

    // Render appropriate view
    if (!currentUser || !currentUser.isLoggedIn) {
      this.currentView = new LoginView().render();
      app.appendChild(this.currentView);
    } else {
      const path = window.location.pathname;
      if (path === '/bookshelf' || path === '/bookshelf/') {
        this.currentView = await new BookshelfView().render();
      } else {
        this.currentView = await new DashboardView().render();
      }
      app.appendChild(this.currentView);
    }
  }

  navigate(path: string) {
    window.history.pushState({}, '', path);
    this.render();
  }
}

// Export singleton instance
export const app = new App();

