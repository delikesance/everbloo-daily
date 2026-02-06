import { Interaction, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, Client } from 'discord.js';
import commands from '../commands';
import { getTeams, saveDaily, DailyEntry, getLastUserTeam } from '../database/models';
import { getTodayDateString, updateTeamDashboard } from '../utils/dailyFlow';

// Cache temporaire
const tempDailyCache = new Map<string, Partial<DailyEntry>>();

export async function handleInteraction(interaction: Interaction) {
  // 1. Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Une erreur est survenue !', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Une erreur est survenue !', ephemeral: true });
      }
    }
  }

  // 2. Bouton Démarrer -> Smart Check (Dernière Team ou Select)
  if (interaction.isButton() && interaction.customId === 'start_daily_flow') {
    if (!interaction.guildId) return;

    // Vérification si déjà rempli aujourd'hui
    const date = getTodayDateString();
    const db = require('../database/db').default;
    const alreadyFilled = db.query("SELECT id FROM dailies WHERE guild_id = ? AND user_id = ? AND date = ?").get(interaction.guildId, interaction.user.id, date);

    if (alreadyFilled) {
      // Pour l'UX, on propose de modifier au lieu de bloquer
      const confirmRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder().setCustomId('confirm_overwrite_daily').setLabel('Modifier ma daily').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('cancel_daily').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.reply({ 
        content: "⚠️ Vous avez déjà une daily pour aujourd'hui. Voulez-vous la modifier (écraser) ?", 
        components: [confirmRow],
        ephemeral: true 
      });
      return;
    }

    // --- SMART TEAM CHECK ---
    const lastTeam = getLastUserTeam(interaction.guildId, interaction.user.id);
    
    if (lastTeam) {
        // Option Rapide
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('quick_start_daily').setLabel(`Go (${lastTeam})`).setStyle(ButtonStyle.Success).setEmoji('🚀'),
                new ButtonBuilder().setCustomId('reset_team_selection').setLabel('Changer d\'équipe').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
            );
        
        await interaction.reply({ content: `On continue avec l'équipe **${lastTeam}** ?`, components: [row], ephemeral: true });
    } else {
        // Pas d'historique -> Menu classique
        await showTeamSelection(interaction);
    }
  }

  // 2b. Confirmation d'écrasement (Overwrite)
  if (interaction.isButton() && interaction.customId === 'confirm_overwrite_daily') {
      const lastTeam = getLastUserTeam(interaction.guildId!, interaction.user.id);
      if (lastTeam) {
          // On repart sur le flow rapide
           const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('quick_start_daily').setLabel(`Go (${lastTeam})`).setStyle(ButtonStyle.Success).setEmoji('🚀'),
                new ButtonBuilder().setCustomId('reset_team_selection').setLabel('Changer d\'équipe').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
            );
        await interaction.update({ content: `On modifie pour l'équipe **${lastTeam}** ?`, components: [row] });
      } else {
          await showTeamSelection(interaction);
      }
  }

  if (interaction.isButton() && interaction.customId === 'cancel_daily') {
      await interaction.update({ content: "Opération annulée.", components: [] });
  }

  // 2c. Quick Start (Smart Team)
  if (interaction.isButton() && interaction.customId === 'quick_start_daily') {
      const lastTeam = getLastUserTeam(interaction.guildId!, interaction.user.id);
      if (!lastTeam) {
          await showTeamSelection(interaction); // Fallback
          return;
      }
      await openDailyModal(interaction, lastTeam);
  }

  // 2d. Reset Team (Retour au menu)
  if (interaction.isButton() && interaction.customId === 'reset_team_selection') {
      await showTeamSelection(interaction);
  }

  // 3. Choix Team -> Modal (Menu Classique)
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_team_daily') {
    const selectedTeam = interaction.values[0];
    await openDailyModal(interaction, selectedTeam);
  }

  // 4. Submit Modal -> Choix Météo
  if (interaction.isModalSubmit() && interaction.customId === 'daily_modal') {
    const cached = tempDailyCache.get(interaction.user.id);
    if (!cached) {
      await interaction.reply({ content: "Session expirée.", ephemeral: true });
      return;
    }

    cached.yesterday = interaction.fields.getTextInputValue('faitInput') || "-";
    cached.in_progress = interaction.fields.getTextInputValue('enCoursInput') || "-";
    cached.today = interaction.fields.getTextInputValue('aFaireInput') || "-";
    cached.blockers = interaction.fields.getTextInputValue('blockersInput') || "Aucun";

    tempDailyCache.set(interaction.user.id, cached);

    const moodRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId('mood_chill').setLabel('Chill').setEmoji('😎').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('mood_fire').setLabel('On Fire').setEmoji('🔥').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('mood_dead').setLabel('Dead').setEmoji('💀').setStyle(ButtonStyle.Danger)
      );

    await interaction.reply({ content: "Météo ?", components: [moodRow], ephemeral: true });
  }

  // 5. Choix Météo -> Sauvegarde
  if (interaction.isButton() && interaction.customId.startsWith('mood_')) {
    const cached = tempDailyCache.get(interaction.user.id);
    if (!cached || !cached.team_name) {
      await interaction.update({ content: "❌ Session expirée.", components: [] });
      return;
    }

    let mood = "😎 Chill";
    if (interaction.customId === 'mood_fire') mood = "🔥 Fire";
    if (interaction.customId === 'mood_dead') mood = "💀 Dead";

    const fullEntry: DailyEntry = {
      guild_id: interaction.guildId!,
      user_id: interaction.user.id,
      username: interaction.user.username,
      date: getTodayDateString(),
      team_name: cached.team_name,
      yesterday: cached.yesterday!,
      today: cached.today!,
      in_progress: cached.in_progress!,
      blockers: cached.blockers!,
      mood: mood
    };

    saveDaily(fullEntry);
    tempDailyCache.delete(interaction.user.id);

    // Mise à jour LIVE du Dashboard
    await updateTeamDashboard(interaction.client, fullEntry.guild_id, fullEntry.team_name);

    await interaction.update({ 
      content: `✅ Daily enregistrée pour **${fullEntry.team_name}** ! Le tableau de bord a été mis à jour.`, 
      components: [] 
    });
  }
}

// --- HELPER FUNCTIONS ---

async function showTeamSelection(interaction: Interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isCommand()) return;
    if (!interaction.guildId) return;

    const teams = getTeams(interaction.guildId);

    if (teams.length === 0) {
        // Fallback: Si c'est un bouton "Changer" mais qu'il n'y a pas d'équipes (bizarre mais possible)
        const reply = { content: "❌ Aucune équipe n'a été créée sur ce serveur.", components: [], ephemeral: true };
        if (interaction.isButton() || interaction.isStringSelectMenu()) await interaction.update(reply);
        else await interaction.reply(reply);
        return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_team_daily')
      .setPlaceholder('Sélectionnez votre équipe')
      .addOptions(
        teams.map(team => new StringSelectMenuOptionBuilder().setLabel(team).setValue(team))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    
    // Si on vient d'un bouton (Update ou Changer), on fait un Update, sinon Reply
    const payload = { content: "Pour quelle équipe ?", components: [row], ephemeral: true };
    if (interaction.isButton()) {
        await interaction.update(payload);
    } else {
        await interaction.reply(payload);
    }
}

async function openDailyModal(interaction: Interaction, teamName: string) {
    // Note: ShowModal DOIT être appelé directement sur une interaction de type Button ou SelectMenu
    // Il ne peut pas être appelé après un 'deferUpdate' ou 'update' si trop de temps passe, mais ici c'est immédiat.
    
    tempDailyCache.set(interaction.user.id, { team_name: teamName });

    const modal = new ModalBuilder().setCustomId('daily_modal').setTitle(`Daily: ${teamName}`);
    
    // Champs
    const fait = new TextInputBuilder().setCustomId('faitInput').setLabel("Fait").setStyle(TextInputStyle.Paragraph).setRequired(false);
    const enCours = new TextInputBuilder().setCustomId('enCoursInput').setLabel("En cours").setStyle(TextInputStyle.Paragraph).setRequired(false);
    const aFaire = new TextInputBuilder().setCustomId('aFaireInput').setLabel("A faire").setStyle(TextInputStyle.Paragraph).setRequired(false);
    const blockers = new TextInputBuilder().setCustomId('blockersInput').setLabel("Bloquants").setStyle(TextInputStyle.Paragraph).setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(fait),
      new ActionRowBuilder<TextInputBuilder>().addComponents(enCours),
      new ActionRowBuilder<TextInputBuilder>().addComponents(aFaire),
      new ActionRowBuilder<TextInputBuilder>().addComponents(blockers)
    );

    if ('showModal' in interaction) {
        await interaction.showModal(modal);
    }
}
