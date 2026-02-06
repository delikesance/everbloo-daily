import { Database } from "bun:sqlite";

const db = new Database("daily_bot.sqlite");

// Initialisation des tables
db.run(`
  CREATE TABLE IF NOT EXISTS guilds (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    name TEXT,
    UNIQUE(guild_id, name)
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS dailies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    user_id TEXT,
    username TEXT,
    date TEXT, -- YYYY-MM-DD
    team_name TEXT,
    yesterday TEXT,
    today TEXT,
    in_progress TEXT,
    blockers TEXT,
    mood TEXT
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS daily_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    team_name TEXT,
    date TEXT,
    channel_id TEXT,
    message_id TEXT,
    UNIQUE(guild_id, team_name, date)
  );
`);

console.log("📂 Base de données SQLite initialisée.");

export default db;
