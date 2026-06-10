import { Client } from 'pg';
import crypto from 'crypto';
import { cleanKeyword } from '../src/lib/keyword-utils';

async function run() {
  const sourceClient = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/finance_app' });
  const targetClient = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/finance_parser' });
  
  const userId = 'cml5arqcw00012cckgdz9gs9j';

  try {
    await sourceClient.connect();
    console.log("Connected to source finance_app database");
    await targetClient.connect();
    console.log("Connected to target finance_parser database");

    // 0. Seed Default Contra Keywords
    console.log("Seeding default contra keywords...");
    const DEFAULT_CONTRA_KEYWORDS = [
      "diskon", "disc", "voucher", "vocer", "cashback", 
      "promo", "potongan", "refund", "kembali", "kembalian"
    ];
    for (const kw of DEFAULT_CONTRA_KEYWORDS) {
      await targetClient.query(`
        INSERT INTO contra_keywords (id, keyword, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (keyword) DO NOTHING
      `, [crypto.randomUUID(), kw]);
    }
    console.log("Default contra keywords seeded.");

    // 1. Seed Google Sheets Categories
    console.log("Seeding Google Sheets Categories...");
    const SHEET_CATEGORIES_RAW = [
      "Food & Drinks::1", "Bar, cafe, snack::2", "Groceries, main meal::3",
      "Restaurant, fast-food::4", "Shopping::5", "Clothes & Footwear::6",
      "Drug-store, chemist::7", "Electronics, accessories::8", "Toiletries::9",
      "Gifts, joy::10", "Skincare, Make Up::11", "Home, garden::12",
      "Jewels, accessories::13", "Kids::14", "Pets, animals::15",
      "Stationery, tools::16", "Housing::17", "Energy, utilities::18",
      "Maintenance, repairs::19", "Mortgage::20", "Property insurance::21",
      "Rent::22", "Services::23", "Transportation::24",
      "Business trips::25", "Long distance::26", "Public transport::27",
      "Taxi::28", "Vehicle::29", "Fuel::30", "Leasing::31",
      "Parking::32", "Rentals::33", "Vehicle insurance::34",
      "Vehicle maintenance::35", "Life & entertainment::36", "Active sport, fitness::37",
      "Alcohol, tobacco::38", "Books, audio, subscriptions::39", "Charity, gifts::40",
      "Culture, sport events::41", "Education, development::42", "Health care, doctor::43",
      "Hobbies::44", "Holiday, trips, hotels::45", "Life events::46",
      "Lottery, gambling::47", "Wellness, beauty::48", "Movie, TV, Streaming::49",
      "Communication, Gadgets::50", "Internet, phone credit::51", "Laptop, Smartphone::52",
      "Postal services::53", "Software, apps, games::54", "Financial expenses::55",
      "Advisory::56", "Charges, Fees::57", "Child Support::58",
      "Fines::59", "Insurances::60", "Loans, interests::61",
      "Taxes::62", "Investments::63", "Collection::64",
      "Financial investments::65", "Realty::66", "Savings::67",
      "Vehicles, chattels::68", "Income::69", "Checks, coupons::70",
      "Child Support::71", "Dues & grants::72", "Gifts::73",
      "Interests::74", "Lending, renting::75", "Dividens::76",
      "Refunds (tax, purchase)::77", "Rental income::78", "Sale::79",
      "Wage, invoices::80", "Others::81", "Missing::82"
    ];

    const newCategoryNameToIdMap = new Map();
    
    // Delete existing categories (this will cascade and delete old keyword mappings)
    await targetClient.query(`DELETE FROM categories`);

    for (const catRaw of SHEET_CATEGORIES_RAW) {
      const baseName = catRaw.split("::")[0];
      const newId = crypto.randomUUID();
      await targetClient.query(`
        INSERT INTO categories (id, name, created_at)
        VALUES ($1, $2, NOW())
      `, [newId, catRaw]);
      newCategoryNameToIdMap.set(baseName, newId);
    }
    console.log("Google Sheets Categories seeded.");

    // 1.2 Fetch legacy categories for mapping keyword imports
    console.log("Fetching legacy categories for mapping...");
    const catRes = await sourceClient.query(`SELECT id, name FROM "Category" WHERE user_id = $1`, [userId]);
    const legacyCategoryNameMap = new Map();
    for (const cat of catRes.rows) {
      legacyCategoryNameMap.set(cat.id, cat.name);
    }

    // 1.5 Seed Google Sheets Accounts
    console.log("Seeding Google Sheets Accounts...");
    const SHEET_ACCOUNTS_RAW = [
      "Cash Eko::1", "CIMB Syariah::2", "Saldo Pulsa::3", "OVO Eko::4",
      "Shopee Pay Eko::7", "Saldo Tokped::8", "Gopay::9", "DANA::10",
      "Octo Pay::12", "Cash Dewi::17", "Mandiri Eko::18", "OVO Dewi::20",
      "Shopee Pay Dewi::21", "Celengan::23", "Mandiri Dewi::11",
      "BRI Dewi::19", "Uang Dewi::22", "Uang Faris::6", "Jago Debit::13"
    ];

    await targetClient.query(`DELETE FROM accounts`);

    for (const accRaw of SHEET_ACCOUNTS_RAW) {
      await targetClient.query(`
        INSERT INTO accounts (id, name, created_at)
        VALUES ($1, $2, NOW())
      `, [crypto.randomUUID(), accRaw]);
    }
    console.log("Google Sheets Accounts seeded.");

    // 2. Fetch transactions
    console.log("Fetching transactions...");
    const txRes = await sourceClient.query(`SELECT description, category_id FROM "Transaction" WHERE user_id = $1`, [userId]);
    const transactions = txRes.rows;
    console.log(`Found ${transactions.length} transactions.`);

    // 3. Process descriptions into keyword mappings
    const keywordMap = new Map();
    for (const tx of transactions) {
      if (!tx.description || !tx.category_id) continue;
      const keyword = cleanKeyword(tx.description);
      if (!keyword || keyword.trim() === '') continue;

      const key = `${keyword}::${tx.category_id}`;
      if (keywordMap.has(key)) {
        keywordMap.set(key, keywordMap.get(key) + 1);
      } else {
        keywordMap.set(key, 1);
      }
    }

    console.log(`Extracted ${keywordMap.size} unique keyword mappings.`);

    // 4. Insert into keyword_mappings
    for (const [key, count] of keywordMap.entries()) {
      const [keyword, legacyCategoryId] = key.split('::');
      const categoryName = legacyCategoryNameMap.get(legacyCategoryId);
      
      if (!categoryName) continue; // Skip unknown legacy categories

      let newCategoryId = newCategoryNameToIdMap.get(categoryName);
      if (!newCategoryId) {
        // Fallback to "Missing" (82) or skip. We will map to 82 if possible.
        newCategoryId = "82";
      }

      await targetClient.query(`
        INSERT INTO keyword_mappings (id, keyword, category_id, usage_count, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (keyword) DO UPDATE SET 
          usage_count = GREATEST(keyword_mappings.usage_count, EXCLUDED.usage_count),
          category_id = EXCLUDED.category_id,
          updated_at = EXCLUDED.updated_at
      `, [crypto.randomUUID(), keyword, newCategoryId, count, 'migration', 'migration']);
    }
    console.log("Keyword mappings imported to target PostgreSQL.");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

run();
