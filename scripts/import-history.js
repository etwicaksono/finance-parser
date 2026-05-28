const { Client } = require('pg');
const crypto = require('crypto');

async function run() {
  const sourceClient = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/finance_app' });
  const targetClient = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/finance_parser' });
  
  const userId = 'cml5arqcw00012cckgdz9gs9j';

  try {
    await sourceClient.connect();
    console.log("Connected to source finance_app database");
    await targetClient.connect();
    console.log("Connected to target finance_parser database");

    // 1. Fetch categories
    console.log("Fetching categories...");
    const catRes = await sourceClient.query(`SELECT id, name FROM "Category" WHERE user_id = $1`, [userId]);
    const categories = catRes.rows;
    console.log(`Found ${categories.length} categories.`);

    // Map of ID to Name for local assignment
    const categoryNameMap = new Map();

    // Insert categories into target Postgres
    for (const cat of categories) {
      await targetClient.query(`
        INSERT INTO categories (id, name, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `, [cat.id, cat.name]);
      categoryNameMap.set(cat.id, cat.name);
    }
    console.log("Categories imported to target PostgreSQL.");

    // 2. Fetch transactions
    console.log("Fetching transactions...");
    const txRes = await sourceClient.query(`SELECT description, category_id FROM "Transaction" WHERE user_id = $1`, [userId]);
    const transactions = txRes.rows;
    console.log(`Found ${transactions.length} transactions.`);

    // 3. Process descriptions into keyword mappings
    const keywordMap = new Map();
    
    // Light cleanup utility for description
    const cleanDescription = (desc) => {
      if (!desc) return null;
      let cleaned = desc.split('=>')[0].split('-')[0].trim().toLowerCase();
      return cleaned.length > 0 ? cleaned : null;
    };

    for (const tx of transactions) {
      if (!tx.description || !tx.category_id) continue;
      
      const keyword = cleanDescription(tx.description);
      if (!keyword) continue;

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
      const [keyword, category_id] = key.split('::');
      const categoryName = categoryNameMap.get(category_id);
      
      if (!categoryName) continue; // Skip unknown

      await targetClient.query(`
        INSERT INTO keyword_mappings (id, keyword, category_id, usage_count, ai_category, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (keyword) DO UPDATE SET 
          usage_count = keyword_mappings.usage_count + EXCLUDED.usage_count,
          updated_at = EXCLUDED.updated_at
      `, [crypto.randomUUID(), keyword, category_id, count, categoryName]);
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
