// ============================================================================
// REGISTRATION HANDLER
// ============================================================================

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const RegistrationEmbeds = require('../embeds/RegistrationEmbeds');
const Logger = require('../utils/logger');
const { registrationManager } = require('../managers');

class RegistrationHandler {
  /**
   * Show create registration session modal
   */
  static async showCreateSessionModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('registration_session_form')
      .setTitle('📋 Buat Sesi Pendaftaran');

    const inputs = [
      {
        id: 'event_name',
        label: 'Nama Event/Kegiatan',
        placeholder: 'Contoh: Tournament Mobile Legends',
        style: TextInputStyle.Short,
        required: true
      },
      {
        id: 'description',
        label: 'Deskripsi Event',
        placeholder: 'Jelaskan detail event secara singkat',
        style: TextInputStyle.Paragraph,
        required: true
      },
      {
        id: 'max_participants',
        label: 'Maksimal Peserta (kosongkan untuk unlimited)',
        placeholder: 'Contoh: 50',
        style: TextInputStyle.Short,
        required: false
      },
      {
        id: 'requirements',
        label: 'Syarat & Ketentuan',
        placeholder: 'Contoh: Minimal level 30, punya hero 20+',
        style: TextInputStyle.Paragraph,
        required: false
      },
      {
        id: 'additional_info',
        label: 'Informasi Tambahan',
        placeholder: 'Hadiah, jadwal, dll',
        style: TextInputStyle.Paragraph,
        required: false
      }
    ];

    const rows = inputs.map(input => {
      const textInput = new TextInputBuilder()
        .setCustomId(input.id)
        .setLabel(input.label)
        .setStyle(input.style)
        .setPlaceholder(input.placeholder)
        .setRequired(input.required);
      return new ActionRowBuilder().addComponents(textInput);
    });

    modal.addComponents(...rows);
    await interaction.showModal(modal);
    Logger.info(`Registration session modal shown to ${interaction.user.tag}`);
  }

  /**
   * Handle create session modal submit
   */
  static async handleCreateSessionSubmit(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });

      const eventName = interaction.fields.getTextInputValue('event_name');
      const description = interaction.fields.getTextInputValue('description');
      const maxParticipantsRaw = interaction.fields.getTextInputValue('max_participants');
      const requirements = interaction.fields.getTextInputValue('requirements') || 'Tidak ada syarat khusus';
      const additionalInfo = interaction.fields.getTextInputValue('additional_info') || '';

      const maxParticipants = maxParticipantsRaw ? parseInt(maxParticipantsRaw) : null;

      // Validate max participants
      if (maxParticipantsRaw && (isNaN(maxParticipants) || maxParticipants < 1)) {
        return interaction.editReply({
          content: '❌ **Error:** Maksimal peserta harus berupa angka positif!'
        });
      }

      // Create session
      const session = registrationManager.createSession({
        eventName,
        description,
        maxParticipants,
        requirements,
        additionalInfo,
        creatorId: interaction.user.id
      });

      // Create embed and buttons
      const embed = RegistrationEmbeds.createSessionEmbed(session);
      const buttons = this.createSessionButtons(session.id);

      // Send to channel
      await interaction.channel.send({ embeds: [embed], components: [buttons] });

      await interaction.editReply({
        content: `✅ **Sesi pendaftaran berhasil dibuat!**\n\n` +
          `📌 **Session ID:** \`${session.id}\`\n` +
          `📝 **Event:** ${eventName}\n` +
          `🟢 **Status:** Dibuka\n\n` +
          `**Commands yang bisa digunakan:**\n` +
          `• \`!close-registration ${session.id}\` - Tutup pendaftaran\n` +
          `• \`!open-registration ${session.id}\` - Buka kembali pendaftaran\n` +
          `• \`!list-participants ${session.id}\` - Lihat daftar peserta\n` +
          `• \`!delete-registration ${session.id}\` - Hapus sesi`
      });

      Logger.success(`Registration session ${session.id} created by ${interaction.user.tag}`);

    } catch (error) {
      Logger.error('Error creating registration session', error);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ **Error:** Gagal membuat sesi pendaftaran!'
        });
      }
    }
  }

  /**
   * Show registration form modal
   */
  static async showRegistrationModal(interaction, sessionId) {
    const session = registrationManager.getSession(sessionId);
    
    if (!session) {
      return interaction.reply({
        content: '❌ **Error:** Sesi pendaftaran tidak ditemukan!',
        flags: 64
      });
    }

    if (session.status !== 'open') {
      return interaction.reply({
        content: '❌ **Error:** Pendaftaran sudah ditutup!',
        flags: 64
      });
    }

    // Check if already registered
    if (registrationManager.isRegistered(sessionId, interaction.user.id)) {
      return interaction.reply({
        content: '⚠️ Anda sudah terdaftar untuk event ini!',
        flags: 64
      });
    }

    // Check if session is full
    if (session.maxParticipants && session.participants.length >= session.maxParticipants) {
      return interaction.reply({
        content: '❌ **Maaf, pendaftaran sudah penuh!**',
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`registration_form_${sessionId}`)
      .setTitle(`📝 Pendaftaran - ${session.eventName}`);

    const inputs = [
      {
        id: 'name',
        label: 'Nama Lengkap',
        placeholder: 'Masukkan nama lengkap Anda',
        style: TextInputStyle.Short,
        required: true
      },
      {
        id: 'contact',
        label: 'Kontak (WA/Telegram/Email)',
        placeholder: 'Contoh: 08123456789 atau @username',
        style: TextInputStyle.Short,
        required: true
      },
      {
        id: 'notes',
        label: 'Catatan Tambahan (Opsional)',
        placeholder: 'Tim/Squad, Role, dll',
        style: TextInputStyle.Paragraph,
        required: false
      }
    ];

    const rows = inputs.map(input => {
      const textInput = new TextInputBuilder()
        .setCustomId(input.id)
        .setLabel(input.label)
        .setStyle(input.style)
        .setPlaceholder(input.placeholder)
        .setRequired(input.required);
      return new ActionRowBuilder().addComponents(textInput);
    });

    modal.addComponents(...rows);
    await interaction.showModal(modal);
    Logger.info(`Registration modal shown to ${interaction.user.tag} for ${sessionId}`);
  }

  /**
   * Handle registration form submit
   */
  static async handleRegistrationSubmit(interaction, sessionId) {
    try {
      await interaction.deferReply({ flags: 64 });

      const session = registrationManager.getSession(sessionId);
      
      if (!session) {
        return interaction.editReply({
          content: '❌ **Error:** Sesi pendaftaran tidak ditemukan!'
        });
      }

      if (session.status !== 'open') {
        return interaction.editReply({
          content: '❌ **Error:** Pendaftaran sudah ditutup!'
        });
      }

      // Check if already registered
      if (registrationManager.isRegistered(sessionId, interaction.user.id)) {
        return interaction.editReply({
          content: '⚠️ Anda sudah terdaftar untuk event ini!'
        });
      }

      // Check if session is full
      if (session.maxParticipants && session.participants.length >= session.maxParticipants) {
        return interaction.editReply({
          content: '❌ **Maaf, pendaftaran sudah penuh!**'
        });
      }

      const name = interaction.fields.getTextInputValue('name');
      const contact = interaction.fields.getTextInputValue('contact');
      const notes = interaction.fields.getTextInputValue('notes') || '';

      // Add registration
      const registration = registrationManager.addRegistration(sessionId, interaction.user.id, {
        name,
        contact,
        notes
      });

      // Send success embed
      const embed = RegistrationEmbeds.createRegistrationSuccessEmbed(session, {
        name,
        contact,
        notes
      });

      await interaction.editReply({ embeds: [embed] });

      // Notify in channel
      await interaction.channel.send(
        `✅ **${interaction.user.tag}** telah mendaftar untuk **${session.eventName}**!\n` +
        `📊 Total peserta: **${session.participants.length}/${session.maxParticipants || '∞'}**`
      );

      Logger.success(`${interaction.user.tag} registered for ${sessionId}`);

    } catch (error) {
      Logger.error('Error handling registration submit', error);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ **Error:** Gagal mendaftar!'
        });
      }
    }
  }

  /**
   * Handle unregister
   */
  static async handleUnregister(interaction, sessionId) {
    const session = registrationManager.getSession(sessionId);
    
    if (!session) {
      return interaction.reply({
        content: '❌ **Error:** Sesi pendaftaran tidak ditemukan!',
        flags: 64
      });
    }

    if (!registrationManager.isRegistered(sessionId, interaction.user.id)) {
      return interaction.reply({
        content: '⚠️ Anda belum terdaftar untuk event ini!',
        flags: 64
      });
    }

    registrationManager.removeRegistration(sessionId, interaction.user.id);

    await interaction.reply({
      content: `✅ **Pendaftaran Anda untuk ${session.eventName} telah dibatalkan!**\n` +
        `📊 Total peserta: **${session.participants.length}/${session.maxParticipants || '∞'}**`,
      flags: 64
    });

    Logger.info(`${interaction.user.tag} unregistered from ${sessionId}`);
  }

  /**
   * Create session buttons
   */
  static createSessionButtons(sessionId) {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`register_${sessionId}`)
          .setLabel('Daftar')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📝'),
        new ButtonBuilder()
          .setCustomId(`unregister_${sessionId}`)
          .setLabel('Batal Daftar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId(`view_participants_${sessionId}`)
          .setLabel('Lihat Peserta')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👥')
      );
  }

  /**
   * Handle view participants button
   */
  static async handleViewParticipants(interaction, sessionId) {
    const session = registrationManager.getSession(sessionId);
    
    if (!session) {
      return interaction.reply({
        content: '❌ **Error:** Sesi pendaftaran tidak ditemukan!',
        flags: 64
      });
    }

    const registrations = registrationManager.getSessionRegistrations(sessionId);
    const embed = RegistrationEmbeds.createParticipantListEmbed(session, registrations, interaction.guild);

    await interaction.reply({ embeds: [embed], flags: 64 });
    Logger.info(`${interaction.user.tag} viewed participants for ${sessionId}`);
  }
}

module.exports = RegistrationHandler;