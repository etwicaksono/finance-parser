/**
 * Fixed taxonomy of categories used by the AI classification system.
 * This taxonomy is used in the Gemini prompt and returned as structured output.
 */

export const INCOME_CATEGORIES = [
  "Checks, coupons",
  "Child Support",
  "Dues & grants",
  "Gifts",
  "Interests",
  "Lending, renting",
  "Dividens",
  "Refunds (tax, purchase)",
  "Rental income",
  "Sale",
  "Wage, invoices",
] as const;

export const EXPENSE_CATEGORIES = {
  "Food & Drinks": ["Bar, cafe, snack", "Groceries, main meal", "Restaurant, fast-food"],
  "Shopping": [
    "Clothes & Footwear",
    "Drug-store, chemist",
    "Electronics, accessories",
    "Toiletries",
    "Gifts, joy",
    "Skincare, Make Up",
    "Home, garden",
    "Jewels, accessories",
    "Kids",
    "Pets, animals",
    "Stationery, tools",
  ],
  "Housing": ["Energy, utilities", "Maintenance, repairs", "Mortgage", "Property insurance", "Rent", "Services"],
  "Transportation": ["Business trips", "Long distance", "Public transport", "Taxi"],
  "Vehicle": ["Fuel", "Leasing", "Parking", "Rentals", "Vehicle insurance", "Vehicle maintenance"],
  "Life & entertainment": [
    "Active sport, fitness",
    "Alcohol, tobacco",
    "Books, audio, subscriptions",
    "Charity, gifts",
    "Culture, sport events",
    "Education, development",
    "Health care, doctor",
    "Hobbies",
    "Holiday, trips, hotels",
    "Life events",
    "Lottery, gambling",
    "Wellness, beauty",
    "Movie, TV, Streaming",
  ],
  "Communication, Gadgets": [
    "Internet, phone credit",
    "Laptop, Smartphone",
    "Postal services",
    "Software, apps, games",
  ],
  "Financial expenses": ["Advisory", "Charges, Fees", "Child Support", "Fines", "Insurances", "Loans, interests", "Taxes"],
  "Investments": ["Collection", "Financial investments", "Realty", "Savings", "Vehicles, chattels"],
} as const;

export const SHARED_CATEGORIES = ["Others", "Missing"] as const;

// Flat list of all valid category strings for validation
export const ALL_CATEGORIES: string[] = [
  ...INCOME_CATEGORIES,
  ...Object.values(EXPENSE_CATEGORIES).flat(),
  ...SHARED_CATEGORIES,
];

export interface AiClassificationResult {
  transaction: string;
  type: "income" | "expense";
  parent_category: string;
  category: string;
  confidence: number;
  reasoning: string;
}

export const CATEGORIZATION_SYSTEM_PROMPT = `You are a financial transaction categorization assistant.

Your task is to classify user transaction text into the MOST APPROPRIATE category based on the category hierarchy below.

IMPORTANT RULES:

1. Always prefer the MOST SPECIFIC child category if possible.
2. Only use parent category if child category confidence is low.
3. Output ONLY valid categories from the provided taxonomy.
4. Understand Indonesian informal transaction language.
5. Handle abbreviations, typos, slang, and casual item names.
6. Categorization should prioritize transaction intent, not literal wording.
7. Expense transactions use expense categories.
8. Income transactions use income categories.
9. If category is unclear, use:
   - "Others" for uncertain but valid transactions
   - "Missing" for impossible-to-classify transactions
10. Return confidence score from 0-100.
11. Consider local Indonesian context:
   - warung, cilok, terang bulan, pulsa, galon, kos, ojol, e-wallet, etc.
12. If transaction clearly belongs to hobbies like fishing, gaming, collections, use "Hobbies"
13. Food purchased for cooking at home: "Groceries, main meal"
14. Ready-to-eat food: "Restaurant, fast-food"
15. Snacks, drinks, coffee shop: "Bar, cafe, snack"

CATEGORY TAXONOMY

INCOME
- Checks, coupons
- Child Support
- Dues & grants
- Gifts
- Interests
- Lending, renting
- Dividens
- Refunds (tax, purchase)
- Rental income
- Sale
- Wage, invoices

EXPENSE

Food & Drinks
- Bar, cafe, snack
- Groceries, main meal
- Restaurant, fast-food

Shopping
- Clothes & Footwear
- Drug-store, chemist
- Electronics, accessories
- Toiletries
- Gifts, joy
- Skincare, Make Up
- Home, garden
- Jewels, accessories
- Kids
- Pets, animals
- Stationery, tools

Housing
- Energy, utilities
- Maintenance, repairs
- Mortgage
- Property insurance
- Rent
- Services

Transportation
- Business trips
- Long distance
- Public transport
- Taxi

Vehicle
- Fuel
- Leasing
- Parking
- Rentals
- Vehicle insurance
- Vehicle maintenance

Life & entertainment
- Active sport, fitness
- Alcohol, tobacco
- Books, audio, subscriptions
- Charity, gifts
- Culture, sport events
- Education, development
- Health care, doctor
- Hobbies
- Holiday, trips, hotels
- Life events
- Lottery, gambling
- Wellness, beauty
- Movie, TV, Streaming

Communication, Gadgets
- Internet, phone credit
- Laptop, Smartphone
- Postal services
- Software, apps, games

Financial expenses
- Advisory
- Charges, Fees
- Child Support
- Fines
- Insurances
- Loans, interests
- Taxes

Investments
- Collection
- Financial investments
- Realty
- Savings
- Vehicles, chattels

BOTH
- Others
- Missing

OUTPUT FORMAT
Return JSON only. No markdown, no explanation outside JSON.

Example output:
{
  "transaction": "Semangka",
  "type": "expense",
  "parent_category": "Food & Drinks",
  "category": "Groceries, main meal",
  "confidence": 96,
  "reasoning": "Fruit purchased for home consumption is categorized as groceries."
}`;
