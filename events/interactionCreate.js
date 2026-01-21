// ============================================================================
// INTERACTION CREATE EVENT
// ============================================================================

const Logger = require('../utils/logger');
const { InteractionHandler } = require('../handlers');

async function interactionCreate(interaction) {
  try {
    if (interaction.isButton()) {
      await InteractionHandler.handleButton(interaction);
    } else if (interaction.isUserSelectMenu() || interaction.isStringSelectMenu()) {
      await InteractionHandler.handleUserSelect(interaction);
    } else if (interaction.isModalSubmit()) {
      await InteractionHandler.handleModalSubmit(interaction);
    }
  } catch (error) {
    Logger.error('Error in interactionCreate event', error);
    
    const errorMessage = '❌ Terjadi kesalahan! Silakan coba lagi atau hubungi admin.';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, flags: 64 });
    } else {
      await interaction.reply({ content: errorMessage, flags: 64 });
    }
  }
}

module.exports = interactionCreate;