import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { searchDailies } from '../database/models';
import { Command } from './index';

function parseDate(input: string): string | null {
  // YYYY-MM-DD
  if (input.match(/^\d{4}-\d{2}-\d{2}$/)) return input;
  // DD/MM/YYYY
  if (input.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = input.split('/');
    return `${year}-${month}-${day}`;
  }
  return null;
}

export const viewDailyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('view_daily')
    .setDescription('Rechercher des daily reports (Filtres combinables).')
    .addUserOption(opt => opt.setName('membre').setDescription('Filtrer par membre'))
    .addStringOption(opt => opt.setName('team').setDescription('Filtrer par équipe (ex: Front, Back...)'))
    .addStringOption(opt => opt.setName('date').setDescription('Filtrer par date (JJ/MM/AAAA)')),

  async execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;

    const user = interaction.options.getUser('membre');
    const team = interaction.options.get('team')?.value as string;
    const dateInput = interaction.options.get('date')?.value as string;

    let searchDate = undefined;
    if (dateInput) {
      const parsed = parseDate(dateInput);
      if (!parsed) {
        await interaction.reply({ content: "❌ Format de date invalide. Utilisez JJ/MM/AAAA.", ephemeral: true });
        return;
      }
      searchDate = parsed;
    }

    // Exécuter la recherche
    const results = searchDailies({
      guildId: interaction.guildId,
      userId: user?.id,
      teamName: team,
      date: searchDate
    });

    if (results.length === 0) {
      await interaction.reply({ content: "🔍 Aucun résultat trouvé pour ces critères.", ephemeral: true });
      return;
    }

    // Création des embeds
    const embeds = results.map(log => {
      const moodEmoji = log.mood ? log.mood.split(' ')[0] : '😎';
      
      return new EmbedBuilder()
        .setColor(0x0099ff)
        .setAuthor({ name: `${log.username} (${log.team_name})`, iconURL: undefined }) // On n'a pas l'URL avatar en DB, juste le username, ou on pourrait le fetcher
        .setTitle(`📅 Daily du ${log.date}`)
        .addFields(
          { name: 'Météo', value: log.mood || '?', inline: true },
          { name: '✅ Fait', value: log.yesterday, inline: false },
          { name: '⏳ En cours', value: log.in_progress, inline: false },
          { name: '🚧 A faire', value: log.today, inline: false },
          { name: '🛑 Bloquants', value: log.blockers, inline: false }
        );
    });

    await interaction.reply({ 
      content: `📋 **Résultats de la recherche** (${results.length} trouvés) :`, 
      embeds: embeds.slice(0, 10), // Limite Discord à 10 embeds par message
      ephemeral: true // Visible seulement par celui qui cherche (confidentialité/spam)
    });

    if (results.length > 10) {
      await interaction.followUp({ content: `... et ${results.length - 10} autres résultats (affinez votre recherche).`, ephemeral: true });
    }
  }
};
