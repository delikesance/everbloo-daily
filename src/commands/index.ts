import { Collection, CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { initCommand } from './init';
import { createTeamCommand } from './create_team';
import { viewDailyCommand } from './view_daily';
import { deleteDailyCommand } from './delete_daily';
import { triggerSessionCommand } from './trigger_session';
import { triggerSummaryCommand } from './trigger_summary';

export interface Command {
  data: SlashCommandBuilder | any;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();

// Ajout des commandes
commands.set(initCommand.data.name, initCommand);
commands.set(createTeamCommand.data.name, createTeamCommand);
commands.set(viewDailyCommand.data.name, viewDailyCommand);
commands.set(deleteDailyCommand.data.name, deleteDailyCommand);
commands.set(triggerSessionCommand.data.name, triggerSessionCommand);
commands.set(triggerSummaryCommand.data.name, triggerSummaryCommand);

export default commands;
