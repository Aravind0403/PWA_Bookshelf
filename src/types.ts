export enum ReadingStatus {
  TO_READ = "To Read",
  READING = "Reading",
  COMPLETED = "Completed"
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage?: string; // optional — absent when no cover is available
  status: ReadingStatus;
  dateAdded?: Date;
  dateCompleted?: Date;
  isbn?: string;
}

export interface ReadingGoal {
  userID: string;
  yearlyGoal: number;
  year: number;
  createdAt: Date;
  lastUpdated: Date;
}

export interface ReadingStats {
  totalBooks: number;
  toRead: number;
  reading: number;
  completed: number;
  completedThisYear: number;
  yearlyGoal: number | null;
  progressPercentage: number;
  daysRemainingInYear: number;
  booksNeededPerMonth: number;
  isAheadOfSchedule: boolean;
  motivationalMessage: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface CurrentUser {
  id: string;
  email: string;
  isLoggedIn: boolean;
}

