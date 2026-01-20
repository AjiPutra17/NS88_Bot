// ============================================================================
// HELP COMMAND
// ============================================================================

const EmbedFactory = require('../embeds/EmbedFactory');
const Logger = require('../utils/logger');

async function help(message) {
  const helpEmbed = EmbedFactory.createHelpEmbed();
  await message.reply({ embeds: [helpEmbed] });
  Logger.info(`Help command used by ${message.author.tag}`);
}

module.exports = help;