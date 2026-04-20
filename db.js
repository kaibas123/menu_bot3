const Database = require("better-sqlite3");
const db = new Database("bot.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    restaurant TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, restaurant)
  )
`).run();

function addMenu(menu) {
    const stmt = db.prepare(`
    INSERT INTO menus (date, restaurant, payload)
    VALUES (?, ?, ?)
    ON CONFLICT(date, restaurant)
    DO UPDATE SET
      payload = excluded.payload,
      created_at = CURRENT_TIMESTAMP
  `);

    stmt.run(menu.date, menu.restaurant, JSON.stringify(menu));
}

function getMenu(date, restaurant) {
    const stmt = db.prepare(`
    SELECT payload
    FROM menus
    WHERE date = ? AND restaurant = ?
    LIMIT 1
  `);

    const row = stmt.get(date, restaurant);
    return row ? JSON.parse(row.payload) : null;
}

module.exports = {
    addMenu,
    getMenu,
};