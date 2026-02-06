import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getGuildChannel, getTeams } from '../database/models';
import { updateTeamDashboard } from '../utils/dailyFlow';
import { Command } from './index';

export const triggerSummaryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('trigger_summary')
    .setDescription('Force la mise à jour des dashboards (Admin uniquement).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Sécurité Admin

  async execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;
    const channelId = getGuildChannel(interaction.guildId);

    if (channelId) {
      await interaction.reply({ content: "Mise à jour forcée des dashboards...", ephemeral: true });
      const teams = getTeams(interaction.guildId);
      for (const team of teams) {
        await updateTeamDashboard(interaction.client, interaction.guildId, team);
      }
    } else {
      await interaction.reply({ content: "Configurez d'abord avec /init", ephemeral: true });
    }
  }
};
