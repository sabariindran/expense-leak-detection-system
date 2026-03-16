/**
 * Client-side categorization utility.
 * Mirrors backend categorize.py keyword logic for PREVIEW only.
 * The backend remains the authoritative categorizer on save.
 */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    'zomato', 'swiggy', 'pizza', 'biryani', 'mess', 'cafe',
    'restaurant', 'kitchen', 'food', 'juice', 'tea', 'bakery',
    'grill', 'broilers', 'milk', 'hotel', 'annapoorani',
    'rose milk', 'frozen bottle', 'chai', 'bhavan', 'treat',
    'paradise', 'court', 'hot breads', 'starbucks', 'coffee',
  ],
  shopping: [
    'amazon', 'flipkart', 'myntra', 'meesho', 'zepto',
    'marketplace', 'super market', 'supermarket',
    'departmental', 'store', 'stores', 'mart',
    'retail', 'collection', 'traders', 'agency',
    'enterprises', 'provisional', 'groceries',
    'pay groceries', 'dress', 'fashion', 'spices',
  ],
  travel: [
    'uber', 'ola', 'rapido', 'irctc', 'tourism',
    'transport', 'metro', 'petrol', 'fuels',
    'fuel', 'diesel', 'petroleum', 'pump',
    'motors', 'automobiles', 'auto', 'tyre',
  ],
  subscription: [
    'airtel', 'www airtel', 'payments bank',
    'netflix', 'spotify', 'prime', 'youtube',
    'hotstar', 'renewal', 'subscription',
    'membership', 'autopay',
  ],
  education: [
    'school', 'college', 'university',
    'academy', 'computer center',
    'students', 'tuition', 'training',
    'institute',
  ],
  entertainment: [
    'pvr', 'inox', 'cinema', 'theatre',
    'entertainment', 'movie', 'district',
    'bookmyshow',
  ],
  health: [
    'medical', 'pharmacy', 'clinic',
    'hospital', 'medicals', 'apollo',
    'health', 'diagnostic',
  ],
  bills: [
    'electric', 'electricity', 'water',
    'gas', 'wifi', 'broadband',
    'recharge', 'bill', 'insurance',
    'rent', 'emi', 'loan', 'communication',
  ],
};

const NOISE_WORDS = [
  'private limited', 'pvt ltd', 'ltd', 'limited',
  'india', 'online', 'order', 'payment',
  'payments', 'bank', 'upi', 'ref', 'txn',
  'xxxx', 'xxxxxxxxxx',
];

function cleanName(name: string): string {
  if (!name) return '';
  let cleaned = name.toLowerCase();
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');
  for (const noise of NOISE_WORDS) {
    cleaned = cleaned.split(noise).join(' ');
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Predict category for a merchant name using keyword matching.
 * Returns a capitalized category string.
 */
export function categorizeMerchant(name: string): string {
  const cleaned = cleanName(name);
  if (!cleaned) return 'Others';

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (cleaned.includes(keyword)) {
        return category.charAt(0).toUpperCase() + category.slice(1);
      }
    }
  }
  return 'Others';
}

/**
 * Extract a readable merchant name from a UPI ID string.
 * Rules:
 *   - Take substring before "@"
 *   - Replace dots/underscores/hyphens with spaces
 *   - Convert to title case
 * Examples:
 *   starbucks@upi       → "Starbucks"
 *   teashop@okaxis      → "Teashop"
 *   tea_shop@okaxis     → "Tea Shop"
 *   uber.eats@paytm     → "Uber Eats"
 */
export function extractMerchantFromUPI(upiId: string): string {
  if (!upiId || !upiId.includes('@')) return '';
  const localPart = upiId.split('@')[0];
  const withSpaces = localPart.replace(/[._-]/g, ' ').trim();
  return withSpaces
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
