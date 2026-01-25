import { getCurrentUser } from '../storage';
import { setReadingGoal } from '../storage';
import { ReadingGoal } from '../types';

export class GoalSetterModal {
  private overlay: HTMLElement | null = null;
  private selectedGoal: number | null = null;

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
      <div class="modal-content goal-setter-modal">
        <button class="modal-close" id="closeBtn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div class="goal-setter-header">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          <h2>Set Your Reading Goal</h2>
          <p>Choose how many books you'd like to read this year</p>
        </div>

        <div class="popular-goals-section">
          <h3>Popular Goals</h3>
          <div class="popular-goals-grid">
            ${[12, 24, 36, 52].map(num => `
              <button class="quick-goal-btn" data-goal="${num}">
                <div class="quick-goal-number">${num}</div>
                <div class="quick-goal-label">books</div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="custom-goal-section">
          <label class="form-label">Or set a custom goal</label>
          <input type="number" class="input" id="customGoal" placeholder="Enter number of books" min="1" max="365">
        </div>

        <div class="error-message hidden" id="errorMessage"></div>

        <button class="btn btn-primary btn-full" id="saveBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Set Goal
        </button>
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

    const quickGoalBtns = this.overlay.querySelectorAll('.quick-goal-btn');
    quickGoalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const goal = parseInt((btn as HTMLElement).dataset.goal || '0');
        this.selectGoal(goal);
      });
    });

    const customInput = this.overlay.querySelector('#customGoal') as HTMLInputElement;
    customInput?.addEventListener('input', () => {
      const value = parseInt(customInput.value);
      if (value > 0) {
        this.selectGoal(value);
      }
    });

    const saveBtn = this.overlay.querySelector('#saveBtn');
    saveBtn?.addEventListener('click', async () => {
      await this.saveGoal(onClose);
    });
  }

  private selectGoal(goal: number) {
    this.selectedGoal = goal;
    
    // Update UI
    const quickGoalBtns = this.overlay?.querySelectorAll('.quick-goal-btn');
    quickGoalBtns?.forEach(btn => {
      const btnGoal = parseInt((btn as HTMLElement).dataset.goal || '0');
      if (btnGoal === goal) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    const customInput = this.overlay?.querySelector('#customGoal') as HTMLInputElement;
    if (customInput && parseInt(customInput.value) !== goal) {
      customInput.value = goal.toString();
    }
  }

  private async saveGoal(onClose?: () => void) {
    if (!this.selectedGoal || this.selectedGoal < 1 || this.selectedGoal > 365) {
      const errorMsg = this.overlay?.querySelector('#errorMessage');
      if (errorMsg) {
        errorMsg.textContent = 'Please enter a valid goal (1-365)';
        errorMsg.classList.remove('hidden');
      }
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const goal: ReadingGoal = {
      userID: currentUser.id,
      yearlyGoal: this.selectedGoal,
      year: new Date().getFullYear(),
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    try {
      await setReadingGoal(goal);
      this.close();
      onClose?.();
    } catch (error) {
      const errorMsg = this.overlay?.querySelector('#errorMessage');
      if (errorMsg) {
        errorMsg.textContent = 'Error saving goal. Please try again.';
        errorMsg.classList.remove('hidden');
      }
    }
  }

  private close() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      this.selectedGoal = null;
    }
  }
}

