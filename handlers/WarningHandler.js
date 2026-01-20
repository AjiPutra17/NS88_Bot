// ============================================================================
// WARNING HANDLER
// ============================================================================

const config = require('../config/config');
const EmbedFactory = require('../embeds/EmbedFactory');
const Logger = require('../utils/logger');
const { slowmodeManager } = require('../managers');

class WarningHandler {
  /**
   * Handle auto-warning in specified channels
   * @param {Message} message - Discord message
   * @returns {boolean} - True if warning was sent
   */
  static async handle(message) {
    // Check if channel has auto-warning enabled
    if (!config.CHANNELS.WARNING.includes(message.channel.id)) {
      return false;
    }

    try {
      // Delete old warning message
      const lastWarningId = slowmodeManager.getWarningMessage(message.channel.id);
      if (lastWarningId) {
        try {
          const oldWarning = await message.channel.messages.fetch(lastWarningId);
          await oldWarning.delete();
        } catch (error) {
          Logger.debug('Old warning already deleted');
        }
      }

      // Send new warning
      const warningEmbed = EmbedFactory.createWarningEmbed();
      const warningMessage = await message.channel.send({ embeds: [warningEmbed] });
      
      // Store warning message ID
      slowmodeManager.setWarningMessage(message.channel.id, warningMessage.id);
      Logger.info(`Auto-warning sent in ${message.channel.name}`);
      
      return true;
    } catch (error) {
      Logger.error('Error in warning handler', error);
      return false;
    }
  }
}

module.exports = WarningHandler;