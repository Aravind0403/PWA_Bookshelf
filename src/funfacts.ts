// Fallback facts if API fails
const fallbackFacts = [
  "Reading just 6 minutes a day can reduce stress by 68%.",
  "The smell of old books is caused by the breakdown of chemical compounds in the paper.",
  "The average reader can finish a 300-page book in about 6 hours.",
  "Reading before bed can help you sleep better.",
  "Your reading speed is about 300 words per minute on average.",
  "The most read book in the world is the Bible with over 5 billion copies.",
  "Iceland publishes the most books per capita in the world.",
  "Reading can increase your vocabulary by up to 50%.",
  "The longest novel ever written has over 9 million words.",
  "Reading fiction can improve empathy and social skills.",
  "The oldest known library dates back to 2600 BC in ancient Mesopotamia.",
  "People who read regularly live an average of 2 years longer.",
  "Your brain processes reading differently than watching videos.",
  "Children who read at home perform better academically."
];

export async function getRandomFunFact(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch('https://numbersapi.com/random/trivia', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const fact = await response.text();
      return fact;
    }
  } catch {
    // API unavailable — use local facts
  }

  return fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
}