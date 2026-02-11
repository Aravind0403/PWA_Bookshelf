interface BookResult {
  title: string;
  author: string;
  coverImage: string;
}

async function fetchFromOpenLibrary(cleanISBN: string): Promise<BookResult | null> {
  const response = await fetch(`https://openlibrary.org/isbn/${cleanISBN}.json`);
  if (!response.ok) return null;

  const data = await response.json();
  const title = data.title || '';
  if (!title) return null;

  // Resolve author names (Open Library stores author refs)
  let author = 'Unknown Author';
  if (data.authors?.length) {
    try {
      const authorRes = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
      if (authorRes.ok) {
        const authorData = await authorRes.json();
        author = authorData.name || author;
      }
    } catch {
      // keep fallback author
    }
  }

  // Build cover URL from cover ID or ISBN
  let coverImage = '';
  if (data.covers?.length) {
    coverImage = `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;
  } else {
    coverImage = `https://covers.openlibrary.org/b/isbn/${cleanISBN}-M.jpg`;
  }

  return { title, author, coverImage };
}

async function fetchFromGoogleBooks(cleanISBN: string): Promise<BookResult | null> {
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}`);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.items || data.items.length === 0) return null;

  const book = data.items[0].volumeInfo;
  const title = book.title || 'Unknown Title';
  const author = book.authors ? book.authors.join(', ') : 'Unknown Author';
  const coverImage = (book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '')
    .replace('http://', 'https://');

  return { title, author, coverImage };
}

export async function fetchBookByISBN(isbn: string): Promise<BookResult | null> {
  const cleanISBN = isbn.replace(/[-\s]/g, '');

  try {
    // Try Open Library first (more reliable for ISBN lookups)
    const olResult = await fetchFromOpenLibrary(cleanISBN);
    if (olResult) return olResult;
  } catch {
    // Open Library failed, try Google Books
  }

  try {
    const gbResult = await fetchFromGoogleBooks(cleanISBN);
    if (gbResult) return gbResult;
  } catch {
    // Both APIs failed
  }

  return null;
}

export function validateISBN(isbn: string): boolean {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  // ISBN-13 (all digits) or ISBN-10 (9 digits + digit or X check)
  return /^(\d{9}[\dXx]|\d{13})$/.test(cleanISBN);
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

