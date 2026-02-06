import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { deleteDaily } from '../database/models';
import { updateTeamDashboard, getTodayDateString } from '../utils/dailyFlow';
import { Command } from './index';

export const deleteDailyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('delete_daily')
    .setDescription('Supprimer ma daily d\'aujourd\'hui.'),

  async execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;

    const date = getTodayDateString();
    
    // Suppression en DB
    const deletedEntry = deleteDaily(interaction.guildId, interaction.user.id, date);

    if (deletedEntry) {
      // Mise à jour immédiate du Dashboard Discord
      await updateTeamDashboard(interaction.client, interaction.guildId, deletedEntry.team_name);
      
      await interaction.reply({ content: "🗑️ Votre daily a été supprimée et le tableau de bord mis à jour.", ephemeral: true });
    } else {
      await interaction.reply({ content: "❌ Vous n'avez pas de daily enregistrée pour aujourd'hui.", ephemeral: true });
    }
  }
};
