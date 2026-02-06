import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { setGuildChannel } from '../database/models';
import { Command } from './index';

export const initCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('init')
    .setDescription('Définit ce salon pour les sessions Daily.'),
  
  async execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;
    setGuildChannel(interaction.guildId, interaction.channelId);
    await interaction.reply({ content: `✅ Salon Daily configuré ici: <#${interaction.channelId}>`, ephemeral: true });
  }
};
