import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { BookshelfView } from './views/BookshelfView';
import { getCurrentUser } from './storage';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { setCurrentUser } from './storage';

interface Destroyable {
  destroy?(): void;
}

export class App {
  private currentView: HTMLElement | null = null;
  private currentViewInstance: Destroyable | null = null;
  private renderGeneration = 0;

  init() {
    // Listen for auth state changes — fires immediately with current state,
    // so no separate this.render() call needed (avoids duplicate rendering).
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

    window.addEventListener('popstate', () => this.render());
  }

  private async render() {
    const app = document.getElementById('app');
    if (!app) return;

    // Guard against concurrent renders: if a newer render starts while
    // an older async render is awaiting, the older one bails out.
    const generation = ++this.renderGeneration;

    // Destroy previous view before rendering new one
    this.currentViewInstance?.destroy?.();

    const currentUser = getCurrentUser();
    app.innerHTML = '';

    // Render appropriate view
    if (!currentUser || !currentUser.isLoggedIn) {
      const view = new LoginView();
      this.currentView = view.render();
      this.currentViewInstance = view;
      app.appendChild(this.currentView);
    } else {
      const path = window.location.pathname;
      if (path === '/bookshelf' || path === '/bookshelf/') {
        const view = new BookshelfView();
        this.currentView = await view.render();
        if (generation !== this.renderGeneration) return; // stale render
        this.currentViewInstance = view;
      } else {
        const view = new DashboardView();
        this.currentView = await view.render();
        if (generation !== this.renderGeneration) return; // stale render
        this.currentViewInstance = view;
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

