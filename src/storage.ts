import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  Timestamp,
  initStorage,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Book, ReadingGoal, User, CurrentUser } from './types';

// Helper to convert Firestore dates to JS Dates
const convertDates = (data: any): any => {
  if (!data) return data;
  const converted = { ...data };
  for (const key in converted) {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  }
  return converted;
};

// User management
export async function createUser(email: string, password: string): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user: User = {
    id: userCredential.user.uid,
    email: userCredential.user.email || '',
    createdAt: new Date(),
  };

  // Create user profile document
  await setDoc(doc(db, 'users', user.id), {
    email: user.email,
    createdAt: user.createdAt
  });

  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return {
    id: userCredential.user.uid,
    email: userCredential.user.email || '',
    createdAt: new Date(), // We could fetch this from firestore if needed
  };
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
  localStorage.removeItem('currentUser'); // Clear local cache if any
}

// Current user session - kept for sync access where needed, 
// but App should prefer onAuthStateChanged
export function getCurrentUser(): CurrentUser | null {
  // We can still use localStorage for a synchronous "hint" of who is logged in
  // but definitive auth comes from Firebase
  const stored = localStorage.getItem('currentUser');
  return stored ? JSON.parse(stored) : null;
}

export function setCurrentUser(user: CurrentUser | null) {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
    signOut(auth).catch(console.error);
  }
}

// Books
export async function getBooks(userID: string): Promise<Book[]> {
  const booksRef = collection(db, 'users', userID, 'books');
  const snapshot = await getDocs(booksRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertDates(doc.data())
  } as Book));
}

export async function addBook(userID: string, book: Omit<Book, 'id'>): Promise<Book> {
  const booksRef = collection(db, 'users', userID, 'books');
  const docRef = await addDoc(booksRef, {
    ...book,
    dateAdded: book.dateAdded || new Date(),
  });

  return {
    id: docRef.id,
    ...book,
    dateAdded: book.dateAdded || new Date(),
  };
}

export async function updateBook(book: Book): Promise<void> {
  // We need the userID to update the book. 
  // Since the Book type doesn't natively have userID, we rely on the current auth state
  // This is a slight limitation of the current type design vs Firestore structure.
  if (!auth.currentUser) throw new Error("No user logged in");

  const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', book.id);
  // Exclude id from the update data
  const { id, ...data } = book;
  await updateDoc(bookRef, data);
}

export async function deleteBook(bookId: string): Promise<void> {
  if (!auth.currentUser) throw new Error("No user logged in");
  const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', bookId);
  await deleteDoc(bookRef);
}

export async function getBookById(bookId: string): Promise<Book | undefined> {
  if (!auth.currentUser) return undefined;
  const bookRef = doc(db, 'users', auth.currentUser.uid, 'books', bookId);
  const docSnap = await getDoc(bookRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...convertDates(docSnap.data()) } as Book;
  }
  return undefined;
}

// Reading goals
export async function getReadingGoal(userID: string): Promise<ReadingGoal | undefined> {
  const goalRef = doc(db, 'users', userID, 'goals', 'current');
  const docSnap = await getDoc(goalRef);

  if (docSnap.exists()) {
    return convertDates(docSnap.data()) as ReadingGoal;
  }
  return undefined;
}

export async function setReadingGoal(goal: ReadingGoal): Promise<void> {
  const goalRef = doc(db, 'users', goal.userID, 'goals', 'current');
  await setDoc(goalRef, goal);
}


