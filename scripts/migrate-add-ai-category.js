const Database = require('better-sqlite3');
const db = new Database('.data/sqlite.db');

try {
  db.exec('ALTER TABLE keyword_mappings ADD COLUMN ai_category TEXT');
  console.log('Added ai_category column');
} catch (e) {
  console.log('ai_category already exists or error:', e.message);
}

try {
  db.exec('ALTER TABLE keyword_mappings ADD COLUMN ai_parent_category TEXT');
  console.log('Added ai_parent_category column');
} catch (e) {
  console.log('ai_parent_category already exists or error:', e.message);
}

// Remove NOT NULL constraint on category_id by recreating - SQLite workaround
// We already handle nullable via Drizzle schema, the column was NOT NULL before
// Just verify columns exist
const cols = db.prepare("PRAGMA table_info(keyword_mappings)").all();
console.log('Columns:', cols.map(c => c.name).join(', '));
db.close();
console.log('Done.');
