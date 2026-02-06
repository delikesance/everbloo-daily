import { Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, EmbedBuilder } from 'discord.js';
import { getDailiesByTeam, getDailyMessage, saveDailyMessage, getGuildChannel } from '../database/models';

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function startDailySession(client: Client, guildId: string, channelId: string) {
  try {
    const channel = await client.channels.fetch(channelId) as TextChannel;
    if (!channel) return;

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('start_daily_flow')
          .setLabel('Remplir ma Daily')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📝')
      );

    await channel.send({
      content: "📢 **Session Daily Ouverte !**\nLe tableau de bord se mettra à jour en temps réel ci-dessous.",
      components: [row]
    });
    console.log(`Session lancée sur ${guildId}`);
  } catch (err) {
    console.error(`Erreur startDailySession ${guildId}:`, err);
  }
}

export async function updateTeamDashboard(client: Client, guildId: string, teamName: string) {
  try {
    const channelId = getGuildChannel(guildId);
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId) as TextChannel;
    if (!channel) return;

    const date = getTodayDateString();
    const teamLogs = getDailiesByTeam(guildId, teamName, date);
    
    // Construction de l'Embed
    const teamEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`🛡️ Dashboard Équipe : ${teamName}`)
      .setDescription(`Rapport du ${date} (${teamLogs.length} membres)`)
      .setTimestamp();

    for (const log of teamLogs) {
      const moodEmoji = log.mood ? log.mood.split(' ')[0] : '😎';
      
      const truncate = (str: string | undefined, max: number) => {
         if (!str) return "-";
         return str.length > max ? str.substring(0, max - 3) + "..." : str;
      };

      const fieldValue = 
        `✅ **Fait:** ${truncate(log.yesterday, 200)}\n` +
        `⏳ **En cours:** ${truncate(log.in_progress, 200)}\n` +
        `🚧 **A faire:** ${truncate(log.today, 200)}\n` +
        `🛑 **Bloquants:** ${truncate(log.blockers, 200)}\n\u200b`;

      teamEmbed.addFields({
        name: `${moodEmoji} ${log.username}`,
        value: fieldValue,
        inline: false 
      });
    }

    // Récupération du message existant
    const existingMsg = getDailyMessage(guildId, teamName, date);

    if (existingMsg) {
      try {
        const messageToEdit = await channel.messages.fetch(existingMsg.message_id);
        if (messageToEdit) {
          await messageToEdit.edit({ embeds: [teamEmbed] });
          console.log(`[Dashboard] Mise à jour équipe ${teamName} (Msg: ${existingMsg.message_id})`);
          return;
        }
      } catch (e) {
        console.warn(`[Dashboard] Message introuvable (supprimé ?), création d'un nouveau.`);
      }
    }

    // Création d'un nouveau message si pas trouvé ou pas existant
    const newMsg = await channel.send({ embeds: [teamEmbed] });
    saveDailyMessage(guildId, teamName, date, channel.id, newMsg.id);
    console.log(`[Dashboard] Création équipe ${teamName} (Msg: ${newMsg.id})`);

  } catch (err) {
    console.error(`Erreur updateTeamDashboard ${guildId}/${teamName}:`, err);
  }
}
