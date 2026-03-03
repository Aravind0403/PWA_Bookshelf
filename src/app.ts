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

    try {
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
    } catch (error) {
      console.error('[App] Render failed:', error);
      app.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    min-height:100vh;padding:40px;text-align:center;color:#d9bf8c;">
          <p style="font-size:18px;margin-bottom:20px;">Something went wrong loading the app.</p>
          <button onclick="window.location.reload()"
                  style="padding:10px 28px;border:1px solid #d9bf8c;border-radius:8px;
                         background:transparent;color:#d9bf8c;font-size:15px;cursor:pointer;">
            Refresh
          </button>
        </div>
      `;
    }
  }

  navigate(path: string) {
    window.history.pushState({}, '', path);
    this.render();
  }
}

// Export singleton instance
export const app = new App();

