import cron from 'node-cron';
import { Client } from 'discord.js';
import { getAllGuilds } from '../database/models';
import { startDailySession } from '../utils/dailyFlow';

export function setupCronJobs(client: Client) {
  // 10h10 : Lancement Session
  cron.schedule('10 10 * * *', async () => {
    console.log('[Cron] 10h10 - Lancement Session');
    const guilds = getAllGuilds();
    for (const g of guilds) {
      if (g.channel_id) await startDailySession(client, g.guild_id, g.channel_id);
    }
  });
  
  console.log('⏰ Cron job initialisé (10h10 Session uniquement).');
}
