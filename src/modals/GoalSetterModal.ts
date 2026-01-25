import { ReadingGoal } from '../types';
import { setReadingGoal, getCurrentUser } from '../storage';

export class GoalSetterModal {
  private overlay: HTMLElement | null = null;
  private selectedGoal: number | null = null;

  show(currentGoal?: ReadingGoal, onClose?: () => void) {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = this.getHTML(currentGoal);
    
    this.attachEventListeners(onClose);
    
    document.body.appendChild(this.overlay);
  }

  private getHTML(currentGoal?: ReadingGoal): string {
    const popularGoals = [12, 24, 36, 52];
    
    return `
      <div class="modal-content goal-setter-modal">
        <button class="modal-close" id="closeBtn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div class="goal-setter-header">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          <h2>Set Your Reading Goal</h2>
          <p>How many books do you want to read this year?</p>
        </div>

        <div class="popular-goals-section">
          <h3>Popular Goals</h3>
          <div class="popular-goals-grid">
            ${popularGoals.map(goal => `
              <button class="quick-goal-btn ${currentGoal?.yearlyGoal === goal ? 'selected' : ''}" data-goal="${goal}">
                <div class="quick-goal-number">${goal}</div>
                <div class="quick-goal-label">books/year</div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="custom-goal-section">
          <h3>Or set a custom goal</h3>
          <div class="form-group">
            <input 
              type="number" 
              class="input" 
              id="customGoalInput" 
              placeholder="Enter number of books"
              min="1"
              max="365"
              value="${currentGoal?.yearlyGoal || ''}"
            >
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="saveGoalBtn" disabled>
          Save Goal
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
    const customGoalInput = this.overlay.querySelector('#customGoalInput') as HTMLInputElement;
    const saveGoalBtn = this.overlay.querySelector('#saveGoalBtn') as HTMLButtonElement;

    const updateSaveButton = () => {
      const hasSelection = this.selectedGoal !== null || (customGoalInput.value && parseInt(customGoalInput.value) > 0);
      saveGoalBtn.disabled = !hasSelection;
    };

    quickGoalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        quickGoalBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedGoal = parseInt((btn as HTMLElement).dataset.goal || '0');
        customGoalInput.value = '';
        updateSaveButton();
      });
    });

    customGoalInput?.addEventListener('input', () => {
      quickGoalBtns.forEach(b => b.classList.remove('selected'));
      this.selectedGoal = null;
      updateSaveButton();
    });

    saveGoalBtn?.addEventListener('click', async () => {
      await this.saveGoal(customGoalInput, onClose);
    });
  }

  private async saveGoal(customGoalInput: HTMLInputElement, onClose?: () => void) {
    const goalValue = this.selectedGoal || parseInt(customGoalInput.value);
    
    if (!goalValue || goalValue < 1) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const goal: ReadingGoal = {
      userID: currentUser.id,
      yearlyGoal: goalValue,
      year: new Date().getFullYear(),
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    try {
      await setReadingGoal(goal);
      this.close();
      onClose?.();
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  }

  private close() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}