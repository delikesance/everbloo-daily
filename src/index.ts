import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import commands from './commands';
import { handleInteraction } from './events/interactionCreate';
import { setupCronJobs } from './cron';
import './database/db'; // Init DB

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
// ID du serveur de dev pour enregistrement instantané
const DEV_GUILD_ID = "1055126989566124083"; 

if (!TOKEN || !CLIENT_ID) {
  console.error("ERREUR: .env manquant (DISCORD_TOKEN, CLIENT_ID)");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`🤖 Bot connecté: ${client.user?.tag}`);
  
  // Enregistrement Commandes (DEV ONLY pour l'instant)
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    const commandsData = commands.map(c => c.data.toJSON());
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, DEV_GUILD_ID), { body: commandsData });
    console.log(`✅ Commandes enregistrées sur ${DEV_GUILD_ID}`);
  } catch (e) {
    console.error('Erreur enregistrement commandes:', e);
  }

  // Cron
  setupCronJobs(client);
});

client.on('interactionCreate', handleInteraction);

client.login(TOKEN);
