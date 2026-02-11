interface BookResult {
  title: string;
  author: string;
  coverImage: string;
}

interface OpenLibraryAuthor {
  name?: string;
}

interface OpenLibraryCover {
  medium?: string;
  large?: string;
}

interface OpenLibraryBookEntry {
  title?: string;
  authors?: OpenLibraryAuthor[];
  cover?: OpenLibraryCover;
}

type OpenLibraryResponse = Record<string, OpenLibraryBookEntry>;

interface GoogleBooksResponse {
  items?: Array<{
    volumeInfo?: {
      title?: string;
      authors?: string[];
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
    };
  }>;
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromOpenLibrary(cleanISBN13: string): Promise<BookResult | null> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN13}&format=json&jscmd=data`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;

  const data = await response.json() as OpenLibraryResponse;
  const key = `ISBN:${cleanISBN13}`;
  const entry = data[key];
  if (!entry?.title) return null;

  const title = entry.title;
  const author = entry.authors?.map(a => a.name).filter(Boolean).join(', ') || 'Unknown Author';
  const coverImage =
    entry.cover?.medium ||
    entry.cover?.large ||
    `https://covers.openlibrary.org/b/isbn/${cleanISBN13}-M.jpg`;

  return { title, author, coverImage };
}

async function fetchFromGoogleBooks(cleanISBN13: string): Promise<BookResult | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN13}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;

  const data = await response.json() as GoogleBooksResponse;
  const item = data.items?.[0]?.volumeInfo;
  if (!item?.title) return null;

  const title = item.title;
  const author = item.authors?.join(', ') || 'Unknown Author';
  const coverImage = (item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail || '')
    .replace('http://', 'https://');

  return { title, author, coverImage };
}

export function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '').toUpperCase();
}

function isValidISBN13(isbn13: string): boolean {
  if (!/^\d{13}$/.test(isbn13)) return false;
  const digits = isbn13.split('').map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === digits[12];
}

function isValidISBN10(isbn10: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn10)) return false;
  const chars = isbn10.split('');
  const sum = chars.slice(0, 9).reduce((acc, c, i) => acc + Number(c) * (10 - i), 0);
  const last = chars[9] === 'X' ? 10 : Number(chars[9]);
  return (sum + last) % 11 === 0;
}

function isbn10To13(isbn10: string): string {
  const core = `978${isbn10.slice(0, 9)}`;
  const digits = core.split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return `${core}${String(check)}`;
}

export function toISBN13(isbn: string): string {
  const clean = normalizeISBN(isbn);
  return clean.length === 10 ? isbn10To13(clean) : clean;
}

export function validateISBN(isbn: string): boolean {
  const clean = normalizeISBN(isbn);
  if (clean.length === 13) return isValidISBN13(clean);
  if (clean.length === 10) return isValidISBN10(clean);
  return false;
}

export async function fetchBookByISBN(isbn: string): Promise<BookResult | null> {
  if (!validateISBN(isbn)) return null;

  const cleanISBN13 = toISBN13(isbn);

  try {
    const olResult = await fetchFromOpenLibrary(cleanISBN13);
    if (olResult) return olResult;
  } catch {
    // Open Library failed, try Google Books.
  }

  try {
    const gbResult = await fetchFromGoogleBooks(cleanISBN13);
    if (gbResult) return gbResult;
  } catch {
    // Google Books failed.
  }

  return null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Network')) {
      return 'Network error. Check your connection.';
    }
    return error.message;
  }
  return 'An unexpected error occurred.';
}
