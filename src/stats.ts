import {ReadingStatus, ReadingStats } from './types';
import { getBooks, getReadingGoal } from './storage';
import { getCurrentUser } from './storage';

export async function calculateStats(): Promise<ReadingStats> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return getDefaultStats();
  }

  const books = await getBooks(currentUser.id);
  const goal = await getReadingGoal(currentUser.id);

  const now = new Date();
  const currentYear = now.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);
  const daysRemaining = Math.ceil((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const totalBooks = books.length;
  const toRead = books.filter(b => b.status === ReadingStatus.TO_READ).length;
  const reading = books.filter(b => b.status === ReadingStatus.READING).length;
  const completed = books.filter(b => b.status === ReadingStatus.COMPLETED).length;
  
  const completedThisYear = books.filter(b => {
    if (b.status !== ReadingStatus.COMPLETED || !b.dateCompleted) return false;
    return b.dateCompleted >= yearStart;
  }).length;

  const yearlyGoal = goal?.yearlyGoal || null;
  const progressPercentage = yearlyGoal ? completedThisYear / yearlyGoal : 0;
  
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));
  const booksNeededPerMonth = yearlyGoal 
    ? Math.ceil((yearlyGoal - completedThisYear) / monthsRemaining)
    : 0;

  const isAheadOfSchedule = yearlyGoal 
    ? completedThisYear >= (yearlyGoal * (365 - daysRemaining) / 365)
    : false;

  const motivationalMessage = getMotivationalMessage(
    completedThisYear,
    yearlyGoal,
    isAheadOfSchedule,
    booksNeededPerMonth
  );

  return {
    totalBooks,
    toRead,
    reading,
    completed,
    completedThisYear,
    yearlyGoal,
    progressPercentage: Math.min(1, Math.max(0, progressPercentage)),
    daysRemainingInYear: daysRemaining,
    booksNeededPerMonth,
    isAheadOfSchedule,
    motivationalMessage,
  };
}

function getDefaultStats(): ReadingStats {
  return {
    totalBooks: 0,
    toRead: 0,
    reading: 0,
    completed: 0,
    completedThisYear: 0,
    yearlyGoal: null,
    progressPercentage: 0,
    daysRemainingInYear: 365,
    booksNeededPerMonth: 0,
    isAheadOfSchedule: false,
    motivationalMessage: 'Start your reading journey by adding your first book!',
  };
}

function getMotivationalMessage(
  completed: number,
  goal: number | null,
  isAhead: boolean,
  booksPerMonth: number
): string {
  if (!goal) {
    return 'Set a reading goal to track your progress!';
  }

  if (completed === 0) {
    return 'Ready to start your reading journey? Add your first book!';
  }

  if (isAhead) {
    return `You're ahead of schedule! Keep up the excellent reading!`;
  }

  if (booksPerMonth <= 1) {
    return `You're on track! Just ${booksPerMonth} book per month to reach your goal.`;
  }

  return `At your current pace, you'll finish ${goal} books this year! Keep reading!`;
}

export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 12) {
    return 'Good morning! Ready for a literary adventure?';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon! Time for some reading?';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening! Unwind with a good book.';
  } else {
    return 'Burning the midnight oil? Happy reading!';
  }
}

export function getFunFact(stats: ReadingStats): string {
  const facts = [
    `The average person reads 12 books per year. You're at ${stats.completedThisYear}!`,
    `Reading just 6 minutes a day can reduce stress by 68%.`,
    `Your library has ${stats.totalBooks} ${stats.totalBooks === 1 ? 'book' : 'books'}!`,
    `You've completed ${stats.completed} ${stats.completed === 1 ? 'book' : 'books'} so far.`,
  ];

  if (stats.yearlyGoal) {
    facts.push(
      `You're ${Math.round(stats.progressPercentage * 100)}% of the way to your goal!`,
      `At your pace, you'll finish ${stats.yearlyGoal} books this year!`
    );
  }

  return facts[Math.floor(Math.random() * facts.length)];
}

