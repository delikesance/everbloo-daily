import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getGuildChannel } from '../database/models';
import { startDailySession } from '../utils/dailyFlow';
import { Command } from './index';

export const triggerSessionCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('trigger_session')
    .setDescription('Force le début de la session (Admin uniquement).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Sécurité Admin

  async execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;
    const channelId = getGuildChannel(interaction.guildId);

    if (channelId) {
      await interaction.reply({ content: "Lancement session (Admin force)...", ephemeral: true });
      await startDailySession(interaction.client, interaction.guildId, channelId);
    } else {
      await interaction.reply({ content: "Configurez d'abord avec /init", ephemeral: true });
    }
  }
};
