// ============================================================================
// SETUP TICKET COMMAND
// ============================================================================

const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedFactory = require('../embeds/EmbedFactory');
const Logger = require('../utils/logger');

async function setupTicket(message) {
  // Check if user is admin
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ **Error:** Hanya admin yang bisa menggunakan command ini!');
  }

  // Create setup embed
  const embed = EmbedFactory.createSetupEmbed();
  
  // Create button
  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('ORDER REKBER/MC')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫')
    );

  // Send to channel
  await message.channel.send({ embeds: [embed], components: [button] });
  
  // Delete command message
  message.delete().catch(() => {});
  
  Logger.success(`Setup ticket executed by ${message.author.tag}`);
}

module.exports = setupTicket;