// ============================================================================
// SLOWMODE HANDLER
// ============================================================================

const config = require('../config/config');
const Utils = require('../utils');
const Logger = require('../utils/logger');
const { slowmodeManager } = require('../managers');

class SlowmodeHandler {
  /**
   * Check and handle slowmode
   * @param {Message} message - Discord message
   * @returns {boolean} - True if message should be processed
   */
  static async handle(message) {
    // Check if channel has slowmode enabled
    if (!config.CHANNELS.WARNING.includes(message.channel.id)) {
      return true;
    }

    const userId = message.author.id;
    const channelId = message.channel.id;
    
    // Check if user has donatur role
    const isDonatur = Utils.hasRole(message.member, config.DONATUR.ROLE_NAME);
    const slowmodeDuration = isDonatur 
      ? config.DONATUR.SLOWMODE_MINUTES 
      : config.NON_DONATUR.SLOWMODE_MINUTES;

      console.log({
  configRole: config.DONATUR.ROLE_NAME,
  userRoles: message.member.roles.cache.map(r => r.name),
  isDonatur
});

    
    // Get remaining time
    const remainingTime = slowmodeManager.getRemainingTime(userId, channelId, slowmodeDuration);
    
    if (remainingTime > 0) {
      // User sent message too quickly - delete it
      try {
        await message.delete();
      } catch (error) {
        Logger.debug('Cannot delete user message - missing permissions');
      }
      
      // Send slowmode warning
      const timeString = Utils.formatTime(remainingTime);
      const slowmodeWarning = await message.channel.send(
        `${message.author} **⏰ Slowmode aktif:** tunggu **${timeString}** sebelum kirim pesan lagi!\n` +
        `💡 Boost server untuk cooldown lebih cepat **(${config.DONATUR.SLOWMODE_MINUTES} Menit)**!`
      );
      
      Utils.deleteMessageAfterDelay(slowmodeWarning, 5000);
      Logger.info(`Slowmode: ${message.author.tag} too fast in ${message.channel.name}`);
      
      return false;
    }
    
    // Update last message time
    slowmodeManager.setLastMessageTime(userId, channelId);
    Logger.debug(`Message allowed from ${message.author.tag} (${isDonatur ? 'Donatur' : 'Non-Donatur'})`);
    
    return true;
  }
}

module.exports = SlowmodeHandler;