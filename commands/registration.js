// ============================================================================
// REGISTRATION COMMANDS
// ============================================================================

const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const RegistrationEmbeds = require('../embeds/RegistrationEmbeds');
const Logger = require('../utils/logger');

/**
 * Setup registration panel in current channel
 * Admin uses this in a prepared channel
 */
async function setupRegistration(message) {
  // Check if user is admin
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ **Error:** Hanya admin yang bisa setup panel pendaftaran!');
  }

  // Create embed and button
  const embed = RegistrationEmbeds.createSetupPanelEmbed();
  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('open_registration_ticket')
        .setLabel('🎫 BUKA TIKET PENDAFTARAN')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📋')
    );

  await message.channel.send({ 
    embeds: [embed], 
    components: [button] 
  });

  message.delete().catch(() => {});
  Logger.success(`Registration panel setup by ${message.author.tag} in ${message.channel.name}`);
}

module.exports = {
  setupRegistration
};