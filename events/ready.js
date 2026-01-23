// ============================================================================
// READY EVENT
// ============================================================================

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config/config');
const EmbedFactory = require('../embeds/EmbedFactory');
const SessionEmbeds = require('../embeds/SessionEmbeds');
const Logger = require('../utils/logger');
const { sessionManager } = require('../managers');

async function ready(client) {
  Logger.success(`Bot ${client.user.tag} is online!`);
  Logger.info(`Connected to ${client.guilds.cache.size} server(s)`);
  Logger.info(`Version: ${config.BOT.VERSION}`);
  
  // Set bot activity
  client.user.setActivity(config.BOT.ACTIVITY, { type: config.BOT.ACTIVITY_TYPE });
  
  // Auto-setup ticket panel in designated channel (optional)
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
  }

  // Auto-setup session panel in designated channel (optional)
  if (config.CHANNELS.SESSION) {
    try {
      const channel = await client.channels.fetch(config.CHANNELS.SESSION);
      
      if (channel) {
        // Create dummy session for panel
        const session = sessionManager.createSession({
          title: 'Panel Pendaftaran',
          description: 'Sistem pendaftaran otomatis',
          date: '-',
          time: '-',
          maxSlots: 0,
          fee: '-',
          creatorId: 'system'
        });

        const embed = SessionEmbeds.createSessionEmbed(session);
        const button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('open_session_panel')
              .setLabel('📝 BUKA TIKET PENDAFTARAN')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('📋')
          );

        await channel.send({ embeds: [embed], components: [button] });
        Logger.success(`Session panel sent to: ${channel.name}`);
      }
    } catch (error) {
      Logger.error('Failed to send session panel', error);
    }
  }
}

module.exports = ready;