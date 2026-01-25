import { getCurrentUser, setCurrentUser } from '../storage';
import { getBooks, getReadingGoal } from '../storage';
import { Book, ReadingGoal } from '../types';
import { calculateStats } from '../stats';
import { GoalSetterModal } from '../modals/GoalSetterModal';
import { getRandomFunFact } from '../funfacts';
import { app } from '../app';

export class DashboardView {
  private books: Book[] = [];
  private goal: ReadingGoal | undefined;
  private funFactInterval: NodeJS.Timeout | null = null;

  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.className = 'dashboard-view';
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
      app.navigate('/');
      return container;
    }

    this.books = await getBooks(currentUser.id);
    this.goal = await getReadingGoal(currentUser.id);

    container.innerHTML = await this.getHTML();
    
    this.attachEventListeners(container);
    this.startFunFactRotation(container);
    
    return container;
  }

  private async getHTML(): Promise<string> {
    const stats = await calculateStats(this.books,this.goal);

    return `
      <nav class="dashboard-nav">
        <div></div>
        <button class="nav-btn" id="logoutBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </nav>

      ${this.goal ? await this.getGoalProgressHTML(stats) : await this.getFirstTimePromptHTML()}

      <div class="stats-grid">
        <div class="stat-card stat-total">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
            <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
          </svg>
          <div class="stat-value">${stats.totalBooks}</div>
          <div class="stat-label">Total Books</div>
        </div>

        <div class="stat-card stat-to-read">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <div class="stat-value">${stats.toRead}</div>
          <div class="stat-label">To Read</div>
        </div>

        <div class="stat-card stat-reading">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <div class="stat-value">${stats.reading}</div>
          <div class="stat-label">Reading</div>
        </div>

        <div class="stat-card stat-completed">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div class="stat-value">${stats.completed}</div>
          <div class="stat-label">Completed</div>
        </div>
      </div>

      <div class="fun-fact-card">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <h4 class="fun-fact-title">Did you know?</h4>
          <p class="fun-fact-content">Loading interesting fact...</p>
        </div>
      </div>

      <div class="quick-actions">
        <h3 class="section-title">Quick Actions</h3>
        
        <button class="action-btn action-btn-goal" id="setGoalBtn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          <span>${this.goal ? 'Update Reading Goal' : 'Set Reading Goal'}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <button class="action-btn" id="viewShelfBtn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
            <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
          </svg>
          <span>View My Bookshelf</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    `;
  }

  private async getGoalProgressHTML(stats: any): Promise<string> {
    const progressPercentage = Math.min(100, stats.progressPercentage);
    const circumference = 2 * Math.PI * 90;
    const dashOffset = circumference - (progressPercentage / 100) * circumference;

    return `
      <div class="welcome-header">
        <div class="welcome-icon-container">
          <svg class="welcome-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <h1 class="welcome-title text-gradient">Your Reading Journey</h1>
        <p class="welcome-greeting">Keep up the great work!</p>
      </div>

      <div class="goal-progress-card">
        <div class="progress-ring-container">
          <svg class="progress-ring" width="200" height="200">
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="rgba(230, 204, 128, 0.2)"
              stroke-width="12"
              fill="none"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="url(#gradient)"
              stroke-width="12"
              fill="none"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${dashOffset}"
              stroke-linecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:var(--color-golden-primary);stop-opacity:1" />
                <stop offset="100%" style="stop-color:var(--color-golden-secondary);stop-opacity:1" />
              </linearGradient>
            </defs>
          </svg>
          <div class="progress-center">
            <div class="progress-number">${stats.completedThisYear}</div>
            <div class="progress-of">of ${stats.yearlyGoal}</div>
            <div class="progress-label">books</div>
          </div>
        </div>

        <p class="motivational-message">${stats.motivationalMessage}</p>

        <div class="progress-stats">
          <div class="progress-stat">
            <div class="progress-stat-value">${Math.round(stats.progressPercentage)}%</div>
            <div class="progress-stat-label">Complete</div>
          </div>
          <div class="progress-divider"></div>
          <div class="progress-stat">
            <div class="progress-stat-value">${stats.booksNeededPerMonth}</div>
            <div class="progress-stat-label">Per Month</div>
          </div>
          <div class="progress-divider"></div>
          <div class="progress-stat">
            <div class="progress-stat-value">${stats.daysRemainingInYear}</div>
            <div class="progress-stat-label">Days Left</div>
          </div>
        </div>
      </div>
    `;
  }

  private async getFirstTimePromptHTML(): Promise<string> {
    return `
      <div class="first-time-prompt">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
        <h2>Set Your Reading Goal</h2>
        <p>Track your progress and stay motivated by setting a yearly reading goal!</p>
        <button class="btn btn-primary" id="setGoalPromptBtn">Set My Goal</button>
        <a href="#" class="skip-link" id="skipGoalBtn">Skip for now</a>
      </div>
    `;
  }

  private attachEventListeners(container: HTMLElement) {
    const logoutBtn = container.querySelector('#logoutBtn');
    logoutBtn?.addEventListener('click', () => {
      setCurrentUser(null);
      app.navigate('/');
    });

    const setGoalBtn = container.querySelector('#setGoalBtn');
    const setGoalPromptBtn = container.querySelector('#setGoalPromptBtn');
    
    const openGoalModal = () => {
      const modal = new GoalSetterModal();
      modal.show(this.goal, () => {
        app.navigate('/dashboard');
      });
    };

    setGoalBtn?.addEventListener('click', openGoalModal);
    setGoalPromptBtn?.addEventListener('click', openGoalModal);

    const skipGoalBtn = container.querySelector('#skipGoalBtn');
    skipGoalBtn?.addEventListener('click', (e) => {
      e.preventDefault();
    });

    const viewShelfBtn = container.querySelector('#viewShelfBtn');
    viewShelfBtn?.addEventListener('click', () => {
      app.navigate('/bookshelf');
    });
  }

  private startFunFactRotation(container: HTMLElement) {
    this.updateFunFact(container);
    
    this.funFactInterval = setInterval(() => {
      this.updateFunFact(container);
    }, 120000); // 2 minutes
  }

  private async updateFunFact(container: HTMLElement) {
    const funFactContent = container.querySelector('.fun-fact-content');
    if (funFactContent) {
      const fact = await getRandomFunFact();
      funFactContent.textContent = fact;
    }
  }

  destroy() {
    if (this.funFactInterval) {
      clearInterval(this.funFactInterval);
    }
  }
}