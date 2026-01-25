import { getCurrentUser, setCurrentUser } from '../storage';
import { calculateStats, getTimeBasedGreeting, getFunFact } from '../stats';
import { getReadingGoal } from '../storage';
import { GoalSetterModal } from '../modals/GoalSetterModal';
import { app } from '../app';

export class DashboardView {
  private goalModal: GoalSetterModal | null = null;

  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.className = 'dashboard-view';
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
      app.navigate('/');
      return container;
    }

    // Show loading state
    container.innerHTML = '<div class="text-center" style="padding: 60px;">Loading...</div>';
    
    const stats = await calculateStats();
    const goal = await getReadingGoal(currentUser.id);
    const greeting = getTimeBasedGreeting();
    const funFact = getFunFact(stats);

    container.innerHTML = this.getHTML(stats, greeting, funFact, !!goal);
    
    this.attachEventListeners(container);
    this.animateOnLoad(container);
    
    return container;
  }

  private getHTML(stats: any, greeting: string, funFact: string, hasGoal: boolean): string {
    return `
      <div class="dashboard-container">
        <nav class="dashboard-nav">
          <button class="nav-btn" id="logoutBtn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Logout
          </button>
          ${hasGoal ? `
            <button class="nav-btn" id="settingsBtn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          ` : ''}
        </nav>

        <div class="welcome-header">
          <div class="welcome-icon-container">
            <svg class="welcome-icon" width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20" stroke="url(#welcomeGradient)" stroke-width="2"/>
              <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z" stroke="url(#welcomeGradient)" stroke-width="2"/>
              <defs>
                <linearGradient id="welcomeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#E6CC80;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#CC9959;stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 class="welcome-title text-gradient">Welcome to Your Library</h1>
          <p class="welcome-greeting">${greeting}</p>
        </div>

        ${hasGoal ? this.getGoalProgressCard(stats) : this.getFirstTimePrompt()}

        <div class="stats-grid">
          <div class="stat-card stat-total">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
              <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
            </svg>
            <div class="stat-value">${stats.totalBooks}</div>
            <div class="stat-label">Total Books</div>
          </div>

          <div class="stat-card stat-to-read">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
              <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
            </svg>
            <div class="stat-value">${stats.toRead}</div>
            <div class="stat-label">To Read</div>
          </div>

          <div class="stat-card stat-reading">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
              <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
            </svg>
            <div class="stat-value">${stats.reading}</div>
            <div class="stat-label">Reading</div>
          </div>

          <div class="stat-card stat-completed">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div class="stat-value">${stats.completed}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>

        <div class="fun-fact-card">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div>
            <div class="fun-fact-title">Did you know?</div>
            <div class="fun-fact-content">${funFact}</div>
          </div>
        </div>

        <div class="quick-actions">
          <h3 class="section-title">Quick Actions</h3>
          <button class="action-btn" id="browseBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/>
              <path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>
            </svg>
            <span>Browse My Bookshelf</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button class="action-btn" id="goalBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            <span>Update Reading Goal</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private getGoalProgressCard(stats: any): string {
    const progressColor = stats.isAheadOfSchedule ? 'var(--color-completed)' : 'var(--color-golden-primary)';
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (stats.progressPercentage * circumference);

    return `
      <div class="goal-progress-card">
        <div class="progress-ring-container">
          <svg class="progress-ring" width="220" height="220">
            <circle class="progress-ring-track" cx="110" cy="110" r="100" fill="none" stroke="rgba(38, 30, 26, 0.3)" stroke-width="20"/>
            <circle class="progress-ring-fill" cx="110" cy="110" r="100" fill="none" 
              stroke="${progressColor}" stroke-width="20" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
              transform="rotate(-90 110 110)"/>
          </svg>
          <div class="progress-center">
            <div class="progress-number">${stats.completedThisYear}</div>
            <div class="progress-of">of ${stats.yearlyGoal}</div>
            <div class="progress-label">books read</div>
          </div>
        </div>
        <p class="motivational-message">${stats.motivationalMessage}</p>
        <div class="progress-stats">
          <div class="progress-stat">
            <div class="progress-stat-value">${stats.daysRemainingInYear}</div>
            <div class="progress-stat-label">days left</div>
          </div>
          <div class="progress-divider"></div>
          <div class="progress-stat">
            <div class="progress-stat-value">${stats.booksNeededPerMonth.toFixed(1)}</div>
            <div class="progress-stat-label">per month</div>
          </div>
        </div>
      </div>
    `;
  }

  private getFirstTimePrompt(): string {
    return `
      <div class="first-time-prompt">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
        <h2>Set Your Reading Goal</h2>
        <p>How many books would you like to read this year?</p>
        <button class="btn btn-primary" id="setGoalBtn">Set My Goal</button>
        <a href="#" class="skip-link" id="skipLink">Skip for now</a>
      </div>
    `;
  }

  private attachEventListeners(container: HTMLElement) {
    const logoutBtn = container.querySelector('#logoutBtn');
    logoutBtn?.addEventListener('click', () => {
      setCurrentUser(null);
      app.navigate('/');
    });

    const settingsBtn = container.querySelector('#settingsBtn');
    settingsBtn?.addEventListener('click', () => {
      this.openGoalSetter();
    });

    const browseBtn = container.querySelector('#browseBtn');
    browseBtn?.addEventListener('click', () => {
      app.navigate('/bookshelf');
    });

    const goalBtn = container.querySelector('#goalBtn');
    goalBtn?.addEventListener('click', () => {
      this.openGoalSetter();
    });

    const setGoalBtn = container.querySelector('#setGoalBtn');
    setGoalBtn?.addEventListener('click', () => {
      this.openGoalSetter();
    });

    const skipLink = container.querySelector('#skipLink');
    skipLink?.addEventListener('click', (e) => {
      e.preventDefault();
      // Just hide the prompt for now
    });
  }

  private openGoalSetter() {
    if (!this.goalModal) {
      this.goalModal = new GoalSetterModal();
    }
    this.goalModal.show(() => {
      // Refresh dashboard after goal is set
      const container = document.querySelector('.dashboard-view');
      if (container) {
        this.render().then(newContainer => {
          container.replaceWith(newContainer);
        });
      }
    });
  }

  private animateOnLoad(container: HTMLElement) {
    const elements = container.querySelectorAll('.welcome-header, .goal-progress-card, .first-time-prompt, .stat-card, .fun-fact-card, .quick-actions');
    elements.forEach((el, index) => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(20px)';
      setTimeout(() => {
        (el as HTMLElement).style.transition = 'all 0.5s ease';
        (el as HTMLElement).style.opacity = '1';
        (el as HTMLElement).style.transform = 'translateY(0)';
      }, index * 100);
    });
  }
}

