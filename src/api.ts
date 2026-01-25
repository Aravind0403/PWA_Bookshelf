export async function fetchBookByISBN(isbn: string): Promise<{ title: string; author: string; coverImage: string } | null> {
  try {
    // Clean ISBN (remove dashes and spaces)
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}`);
    
    if (!response.ok) {
      throw new Error('Network error');
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const book = data.items[0].volumeInfo;
    const title = book.title || 'Unknown Title';
    const author = book.authors ? book.authors.join(', ') : 'Unknown Author';
    const coverImage = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '';

    return {
      title,
      author,
      coverImage: coverImage.replace('http://', 'https://'),
    };
  } catch (error) {
    console.error('Error fetching book:', error);
    throw error;
  }
}

export function validateISBN(isbn: string): boolean {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  // ISBN-10 or ISBN-13
  return /^(\d{10}|\d{13})$/.test(cleanISBN);
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

