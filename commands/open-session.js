// ============================================================================
// OPEN SESSION COMMAND
// ============================================================================

const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const SessionEmbeds = require('../embeds/SessionEmbeds');
const Logger = require('../utils/logger');
const { sessionManager } = require('../managers');
const config = require('../config/config');

async function openSession(message, args) {
  // Check if user is admin
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ **Error:** Hanya admin yang bisa menggunakan command ini!');
  }

  // Check if session channel is configured
  if (!config.CHANNELS.SESSION) {
    return message.reply('❌ **Error:** SESSION_CHANNEL_ID belum dikonfigurasi di .env!');
  }

  // Get session channel
  const sessionChannel = await message.guild.channels.fetch(config.CHANNELS.SESSION).catch(() => null);
  
  if (!sessionChannel) {
    return message.reply('❌ **Error:** Channel session tidak ditemukan!');
  }

  // Create session with placeholder data (should be from modal in production)
  const session = sessionManager.createSession({
    title: 'Sesi Belajar Discord Bot',
    description: 'Belajar membuat bot Discord dari nol sampai mahir!',
    date: '25 Januari 2026',
    time: '19:00 - 21:00 WIB',
    maxSlots: 10,
    fee: 'Rp 50.000',
    creatorId: message.author.id
  });

  // Create session embed
  const sessionEmbed = SessionEmbeds.createSessionEmbed(session);
  
  // Create register button
  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`register_session_${session.id}`)
        .setLabel('📝 DAFTAR SEKARANG')
        .setStyle(ButtonStyle.Primary)
    );

  // Send to session channel
  const sentMessage = await sessionChannel.send({ 
    embeds: [sessionEmbed], 
    components: [button] 
  });

  // Store message ID in session
  sessionManager.updateSession(session.id, { messageId: sentMessage.id });

  // Reply to admin
  await message.reply(
    `✅ **Sesi berhasil dibuka!**\n\n` +
    `📌 **Session ID:** ${session.id}\n` +
    `📍 **Channel:** ${sessionChannel}\n` +
    `👥 **Kuota:** ${session.maxSlots} orang\n\n` +
    `Member sekarang bisa mendaftar dengan klik tombol di channel tersebut!`
  );

  // Delete command message
  message.delete().catch(() => {});
  
  Logger.success(`Session ${session.id} opened by ${message.author.tag}`);
}

module.exports = openSession;