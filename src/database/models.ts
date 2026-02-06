import db from "./db";

// --- GUILDS ---
export function setGuildChannel(guildId: string, channelId: string) {
  const query = db.query(`INSERT OR REPLACE INTO guilds (guild_id, channel_id) VALUES (?, ?)`);
  query.run(guildId, channelId);
}

export function getGuildChannel(guildId: string): string | null {
  const query = db.query(`SELECT channel_id FROM guilds WHERE guild_id = ?`);
  const result = query.get(guildId) as { channel_id: string } | null;
  return result ? result.channel_id : null;
}

export function getAllGuilds() {
  return db.query(`SELECT * FROM guilds`).all() as { guild_id: string, channel_id: string }[];
}

// --- TEAMS ---
export function createTeam(guildId: string, name: string): boolean {
  try {
    db.query(`INSERT INTO teams (guild_id, name) VALUES (?, ?)`).run(guildId, name);
    return true;
  } catch (err) {
    return false; // Probablement déjà existant
  }
}

export function getTeams(guildId: string): string[] {
  const results = db.query(`SELECT name FROM teams WHERE guild_id = ?`).all(guildId) as { name: string }[];
  return results.map(r => r.name);
}

// --- DAILIES ---
export interface DailyEntry {
  guild_id: string;
  user_id: string;
  username: string;
  date: string;
  team_name: string;
  yesterday: string;
  today: string;
  in_progress: string;
  blockers: string;
  mood: string;
}

export function saveDaily(daily: DailyEntry) {
  // On supprime l'ancienne entrée du même jour/user si elle existe (mise à jour)
  db.query(`DELETE FROM dailies WHERE guild_id = ? AND user_id = ? AND date = ?`)
    .run(daily.guild_id, daily.user_id, daily.date);

  db.query(`
    INSERT INTO dailies (guild_id, user_id, username, date, team_name, yesterday, today, in_progress, blockers, mood)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    daily.guild_id, daily.user_id, daily.username, daily.date, daily.team_name,
    daily.yesterday, daily.today, daily.in_progress, daily.blockers, daily.mood
  );
}

// --- DAILY MESSAGES (DASHBOARD) ---
export function getDailyMessage(guildId: string, teamName: string, date: string) {
  return db.query(`
    SELECT channel_id, message_id FROM daily_messages 
    WHERE guild_id = ? AND team_name = ? AND date = ?
  `).get(guildId, teamName, date) as { channel_id: string, message_id: string } | null;
}

export function saveDailyMessage(guildId: string, teamName: string, date: string, channelId: string, messageId: string) {
  db.query(`
    INSERT OR REPLACE INTO daily_messages (guild_id, team_name, date, channel_id, message_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, teamName, date, channelId, messageId);
}

export function getDailiesByTeam(guildId: string, teamName: string, date: string) {
  return db.query(`
    SELECT * FROM dailies 
    WHERE guild_id = ? AND team_name = ? AND date = ?
  `).all(guildId, teamName, date) as DailyEntry[];
}

export interface DailySearchFilters {
  guildId: string;
  userId?: string;
  date?: string;
  teamName?: string;
}

export function searchDailies(filters: DailySearchFilters) {
  let sql = `SELECT * FROM dailies WHERE guild_id = $guildId`;
  const params: any = { $guildId: filters.guildId };

  if (filters.userId) {
    sql += ` AND user_id = $userId`;
    params.$userId = filters.userId;
  }

  if (filters.date) {
    sql += ` AND date = $date`;
    params.$date = filters.date;
  }

  if (filters.teamName) {
    sql += ` AND team_name = $teamName`;
    params.$teamName = filters.teamName;
  }

  sql += ` ORDER BY date DESC, team_name ASC LIMIT 20`; // Limite pour éviter le spam

  return db.query(sql).all(params) as DailyEntry[];
}

export function deleteDaily(guildId: string, userId: string, date: string): DailyEntry | null {
  // On récupère d'abord l'entrée pour connaître la team (nécessaire pour update le dashboard)
  const entry = db.query(`SELECT * FROM dailies WHERE guild_id = ? AND user_id = ? AND date = ?`)
    .get(guildId, userId, date) as DailyEntry | null;

  if (entry) {
    db.query(`DELETE FROM dailies WHERE guild_id = ? AND user_id = ? AND date = ?`)
      .run(guildId, userId, date);
  }
  return entry;
}

export function getLastUserTeam(guildId: string, userId: string): string | null {
  const result = db.query(`
    SELECT team_name FROM dailies 
    WHERE guild_id = ? AND user_id = ? 
    ORDER BY date DESC 
    LIMIT 1
  `).get(guildId, userId) as { team_name: string } | null;
  
  return result ? result.team_name : null;
}
