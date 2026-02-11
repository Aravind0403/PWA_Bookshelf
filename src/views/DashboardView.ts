import { getCurrentUser, setCurrentUser } from '../storage';
import { getBooks, getReadingGoal } from '../storage';
import { Book, ReadingGoal, ReadingStats } from '../types';
import { calculateStats } from '../stats';
import { GoalSetterModal } from '../modals/GoalSetterModal';
import { getRandomFunFact } from '../funfacts';
import { app } from '../app';
import { icon } from '../icons';

export class DashboardView {
  private books: Book[] = [];
  private goal: ReadingGoal | undefined;
  private funFactInterval: ReturnType<typeof setInterval> | null = null;

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
          ${icon('logout', { size: 20 })}
          Logout
        </button>
      </nav>

      ${this.goal ? await this.getGoalProgressHTML(stats) : await this.getFirstTimePromptHTML()}

      <div class="stats-grid">
        <div class="stat-card stat-total">
          ${icon('book', { size: 32 })}
          <div class="stat-value">${stats.totalBooks}</div>
          <div class="stat-label">Total Books</div>
        </div>

        <div class="stat-card stat-to-read">
          ${icon('clock', { size: 32 })}
          <div class="stat-value">${stats.toRead}</div>
          <div class="stat-label">To Read</div>
        </div>

        <div class="stat-card stat-reading">
          ${icon('openBook', { size: 32 })}
          <div class="stat-value">${stats.reading}</div>
          <div class="stat-label">Reading</div>
        </div>

        <div class="stat-card stat-completed">
          ${icon('checkmark', { size: 32 })}
          <div class="stat-value">${stats.completed}</div>
          <div class="stat-label">Completed</div>
        </div>
      </div>

      <div class="fun-fact-card">
        ${icon('helpCircle')}
        <div>
          <h4 class="fun-fact-title">Did you know?</h4>
          <p class="fun-fact-content">Loading interesting fact...</p>
        </div>
      </div>

      <div class="quick-actions">
        <h3 class="section-title">Quick Actions</h3>
        
        <button class="action-btn action-btn-goal" id="setGoalBtn">
          ${icon('star')}
          <span>${this.goal ? 'Update Reading Goal' : 'Set Reading Goal'}</span>
          ${icon('chevronRight', { size: 20 })}
        </button>

        <button class="action-btn" id="viewShelfBtn">
          ${icon('book')}
          <span>View My Bookshelf</span>
          ${icon('chevronRight', { size: 20 })}
        </button>
      </div>
    `;
  }

  private async getGoalProgressHTML(stats: ReadingStats): Promise<string> {
    const progressPercentage = Math.min(100, stats.progressPercentage);
    const ringRadius = 90;
    const ringCenter = 100;
    const ringStroke = 12;
    const circumference = 2 * Math.PI * ringRadius;
    const dashOffset = circumference - (progressPercentage / 100) * circumference;

    return `
      <div class="welcome-header">
        <div class="welcome-icon-container">
          ${icon('openBook', { size: 80, class: 'welcome-icon' })}
        </div>
        <h1 class="welcome-title text-gradient">Your Reading Journey</h1>
        <p class="welcome-greeting">Keep up the great work!</p>
      </div>

      <div class="goal-progress-card">
        <div class="progress-ring-container">
          <svg class="progress-ring" viewBox="0 0 200 200" aria-label="Goal progress">
            <circle
              cx="${ringCenter}"
              cy="${ringCenter}"
              r="${ringRadius}"
              stroke="rgba(230, 204, 128, 0.2)"
              stroke-width="${ringStroke}"
              fill="none"
            />
            <circle
              cx="${ringCenter}"
              cy="${ringCenter}"
              r="${ringRadius}"
              stroke="url(#gradient)"
              stroke-width="${ringStroke}"
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
        ${icon('star', { size: 64 })}
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
