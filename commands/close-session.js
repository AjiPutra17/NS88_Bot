// ============================================================================
// CLOSE SESSION COMMAND
// ============================================================================

const { PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { sessionManager } = require('../managers');

async function closeSession(message, args) {
  // Check if user is admin
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ **Error:** Hanya admin yang bisa menggunakan command ini!');
  }

  // Get session ID from args
  const sessionId = args[0];
  
  if (!sessionId) {
    return message.reply(
      `❌ **Error:** Format command salah!\n\n` +
      `**Format yang benar:**\n` +
      `\`!close-session <sessionId>\`\n\n` +
      `**Contoh:**\n` +
      `\`!close-session SESSION-1\``
    );
  }

  // Get session
  const session = sessionManager.getSession(sessionId);
  
  if (!session) {
    return message.reply('❌ **Error:** Session tidak ditemukan!');
  }

  if (session.status === 'closed') {
    return message.reply('❌ **Error:** Session sudah ditutup!');
  }

  // Close session
  sessionManager.closeSession(sessionId);

  // Get registrations count
  const confirmedCount = sessionManager.getConfirmedCount(sessionId);

  await message.reply(
    `✅ **Session berhasil ditutup!**\n\n` +
    `📌 **Session ID:** ${sessionId}\n` +
    `📋 **Judul:** ${session.title}\n` +
    `👥 **Total Peserta:** ${confirmedCount}/${session.maxSlots}\n` +
    `📅 **Ditutup:** ${new Date().toLocaleString('id-ID')}`
  );

  Logger.success(`Session ${sessionId} closed by ${message.author.tag}`);
}

module.exports = closeSession;