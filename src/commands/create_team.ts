import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { createTeam } from '../database/models';
import { Command } from './index';

export const createTeamCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('create_team')
    .setDescription('Créer une nouvelle équipe pour les dailies.')
    .addStringOption(opt => opt.setName('nom').setDescription('Nom de l\'équipe').setRequired(true)),

  async execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;
    // @ts-ignore
    const teamName = interaction.options.getString('nom', true);
    
    const success = createTeam(interaction.guildId, teamName);
    
    if (success) {
      await interaction.reply({ content: `✅ Équipe **${teamName}** créée !`, ephemeral: true });
    } else {
      await interaction.reply({ content: `❌ L'équipe "${teamName}" existe déjà.`, ephemeral: true });
    }
  }
};
