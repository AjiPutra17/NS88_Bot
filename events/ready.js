// ============================================================================
// READY EVENT
// ============================================================================

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config/config.js');
const EmbedFactory = require('../embed/EmbedFactory');
const Logger = require('../utils/logger');

async function ready(client) {
  Logger.success(`Bot ${client.user.tag} is online!`);
  Logger.info(`Connected to ${client.guilds.cache.size} server(s)`);
  Logger.info(`Version: ${config.BOT.VERSION}`);
  
  // Set bot activity
  client.user.setActivity(config.BOT.ACTIVITY, { type: config.BOT.ACTIVITY_TYPE });
  
  // Auto-setup in designated channel (optional)
  if (config.CHANNELS.SETUP) {
    try {
      const channel = await client.channels.fetch(config.CHANNELS.SETUP);
      
      if (channel) {
        const embed = EmbedFactory.createSetupEmbed();
        const button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('create_ticket')
              .setLabel('ORDER REKBER/MC')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🎫')
          );

        await channel.send({ embeds: [embed], components: [button] });
        Logger.success(`Setup message sent to: ${channel.name}`);
      }
    } catch (error) {
      Logger.error('Failed to send setup message', error);
    }
  } else {
    Logger.warning('SETUP_CHANNEL_ID not configured');
  }
}

module.exports = ready;