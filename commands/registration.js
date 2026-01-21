// ============================================================================
// REGISTRATION COMMANDS
// ============================================================================

const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const RegistrationEmbeds = require('../embeds/RegistrationEmbeds');
const Logger = require('../utils/logger');
const { registrationManager } = require('../managers');

/**
 * Create new registration session
 */
async function createRegistration(message, args) {
  // Check if user is admin
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ **Error:** Hanya admin yang bisa membuat sesi pendaftaran!');
  }

  // Show instructions
  await message.reply(
    `📋 **Cara Membuat Sesi Pendaftaran:**\n\n` +
    `Gunakan button di bawah ini untuk membuat sesi pendaftaran baru.\n` +
    `Anda akan diminta untuk mengisi:\n` +
    `• Nama Event\n` +
    `• Deskripsi\n` +
    `• Maksimal Peserta\n` +
    `• Syarat & Ketentuan\n` +
    `• Informasi Tambahan`
  );

  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('create_registration_session')
        .setLabel('Buat Sesi Pendaftaran')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝')
    );

  await message.channel.send({ 
    content: '👇 **Klik tombol dibawah untuk memulai:**',
    components: [button] 
  });

  message.delete().catch(() => {});
  Logger.success(`Create registration command used by ${message.author.tag}`);
}

/**
 * Open registration session
 */
async function openRegistration(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ **Error:** Hanya admin yang bisa membuka sesi pendaftaran!');
  }

  const sessionId = args[0];
  if (!sessionId) {
    return message.reply('❌ **Error:** Format salah! Gunakan: `!open-registration <session_id>`');
  }

  const session = registrationManager.getSession(sessionId);
  if (!session) {
    return message.reply('❌ **Error:** Sesi pendaftaran tidak ditemukan!');
  }

  if (session.status === 'open') {
    return message.reply('⚠️ Sesi pendaftaran sudah dibuka!');
  }

  registrationManager.openSession(sessionId);
  
  const embed = RegistrationEmbeds.createSessionOpenedEmbed(session);
  await message.channel.send({ embeds: [embed] });
  
  await message.reply(`✅ Sesi pendaftaran **${session.eventName}** telah dibuka!`);
  Logger.success(`Registration session ${sessionId} opened by ${message.author.tag}`);
}

/**
 * Close registration session
 */
async function closeRegistration(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ **Error:** Hanya admin yang bisa menutup sesi pendaftaran!');
  }

  const sessionId = args[0];
  if (!sessionId) {
    return message.reply('❌ **Error:** Format salah! Gunakan: `!close-registration <session_id>`');
  }

  const session = registrationManager.getSession(sessionId);
  if (!session) {
    return message.reply('❌ **Error:** Sesi pendaftaran tidak ditemukan!');
  }

  if (session.status === 'closed') {
    return message.reply('⚠️ Sesi pendaftaran sudah ditutup!');
  }

  registrationManager.closeSession(sessionId);
  
  const embed = RegistrationEmbeds.createSessionClosedEmbed(session);
  await message.channel.send({ embeds: [embed] });
  
  await message.reply(`✅ Sesi pendaftaran **${session.eventName}** telah ditutup!`);
  Logger.success(`Registration session ${sessionId} closed by ${message.author.tag}`);
}

/**
 * List all participants
 */
async function listParticipants(message, args) {
  const sessionId = args[0];
  if (!sessionId) {
    return message.reply('❌ **Error:** Format salah! Gunakan: `!list-participants <session_id>`');
  }

  const session = registrationManager.getSession(sessionId);
  if (!session) {
    return message.reply('❌ **Error:** Sesi pendaftaran tidak ditemukan!');
  }

  const registrations = registrationManager.getSessionRegistrations(sessionId);
  const embed = RegistrationEmbeds.createParticipantListEmbed(session, registrations, message.guild);
  
  await message.reply({ embeds: [embed] });
  Logger.info(`Participant list viewed by ${message.author.tag} for ${sessionId}`);
}

/**
 * List all registration sessions
 */
async function listRegistrations(message) {
  const sessions = registrationManager.getAllSessions();
  const embed = RegistrationEmbeds.createSessionsListEmbed(sessions);
  
  await message.reply({ embeds: [embed] });
  Logger.info(`Registration sessions list viewed by ${message.author.tag}`);
}

/**
 * Delete registration session
 */
async function deleteRegistration(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ **Error:** Hanya admin yang bisa menghapus sesi pendaftaran!');
  }

  const sessionId = args[0];
  if (!sessionId) {
    return message.reply('❌ **Error:** Format salah! Gunakan: `!delete-registration <session_id>`');
  }

  const session = registrationManager.getSession(sessionId);
  if (!session) {
    return message.reply('❌ **Error:** Sesi pendaftaran tidak ditemukan!');
  }

  registrationManager.deleteSession(sessionId);
  
  await message.reply(`✅ Sesi pendaftaran **${session.eventName}** telah dihapus!`);
  Logger.success(`Registration session ${sessionId} deleted by ${message.author.tag}`);
}

module.exports = {
  createRegistration,
  openRegistration,
  closeRegistration,
  listParticipants,
  listRegistrations,
  deleteRegistration
};