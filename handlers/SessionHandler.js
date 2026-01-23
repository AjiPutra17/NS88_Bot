// ============================================================================
// SESSION HANDLER
// ============================================================================

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const config = require('../config/config');
const SessionEmbeds = require('../embeds/SessionEmbeds');
const Logger = require('../utils/logger');
const { sessionManager } = require('../managers');

class SessionHandler {
  /**
   * Handle register session button
   */
  static async handleRegisterButton(interaction) {
    const sessionId = interaction.customId.split('_')[2];
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return interaction.reply({ 
        content: '❌ **Error:** Session tidak ditemukan!', 
        flags: 64 
      });
    }

    if (session.status === 'closed') {
      return interaction.reply({ 
        content: '❌ **Error:** Session sudah ditutup!', 
        flags: 64 
      });
    }

    // Check if quota is full
    const confirmedCount = sessionManager.getConfirmedCount(sessionId);
    if (confirmedCount >= session.maxSlots) {
      return interaction.reply({ 
        content: '❌ **Error:** Kuota sudah penuh!', 
        flags: 64 
      });
    }

    // Show registration modal
    await this.showRegistrationModal(interaction, session);
  }

  /**
   * Show registration modal
   */
  static async showRegistrationModal(interaction, session) {
    const modal = new ModalBuilder()
      .setCustomId(`registration_form_${session.id}`)
      .setTitle('📝 Formulir Pendaftaran');

    const inputs = [
      { 
        id: 'name', 
        label: 'Nama Lengkap', 
        placeholder: 'Contoh: John Doe',
        style: TextInputStyle.Short
      },
      { 
        id: 'contact', 
        label: 'Kontak (WhatsApp/Telegram)', 
        placeholder: 'Contoh: 08123456789 atau @username',
        style: TextInputStyle.Short
      },
      { 
        id: 'notes', 
        label: 'Catatan (Opsional)', 
        placeholder: 'Ada pertanyaan atau request khusus?',
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
        .setRequired(input.required !== false);
      return new ActionRowBuilder().addComponents(textInput);
    });

    modal.addComponents(...rows);
    await interaction.showModal(modal);
    Logger.info(`Registration modal shown to ${interaction.user.tag} for ${session.id}`);
  }

  /**
   * Handle registration modal submit
   */
  static async handleRegistrationSubmit(interaction) {
    const sessionId = interaction.customId.split('_')[2];
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return interaction.reply({ 
        content: '❌ **Error:** Session tidak ditemukan!', 
        flags: 64 
      });
    }

    try {
      await interaction.deferReply({ flags: 64 });

      const name = interaction.fields.getTextInputValue('name');
      const contact = interaction.fields.getTextInputValue('contact');
      const notes = interaction.fields.getTextInputValue('notes') || '';

      // Create payment channel for this registration
      const paymentChannel = await this.createPaymentChannel(interaction, session, name);

      if (!paymentChannel) {
        return interaction.editReply({ 
          content: '❌ **Error:** Gagal membuat channel pembayaran. Pastikan bot punya permission "Manage Channels".' 
        });
      }

      // Create registration
      const registration = sessionManager.addRegistration(sessionId, {
        userId: interaction.user.id,
        name,
        contact,
        notes,
        channelId: paymentChannel.id
      });

      // Send registration embed to payment channel
      const registrationEmbed = SessionEmbeds.createRegistrationEmbed(registration, session);
      const confirmButtons = this.createConfirmButtons(registration.id);

      await paymentChannel.send({ embeds: [registrationEmbed], components: [confirmButtons] });
      await paymentChannel.send(
        `${interaction.user}\n\n` +
        `📸 **Silakan upload bukti pembayaran di sini:**\n` +
        `• Screenshot transfer\n` +
        `• Foto bukti pembayaran\n\n` +
        `⏳ Setelah upload, tunggu konfirmasi dari admin.`
      );

      // Reply to user
      await interaction.editReply({ 
        content: `✅ **Pendaftaran berhasil!**\n📍 Silakan cek channel ${paymentChannel} untuk upload bukti pembayaran.` 
      });

      Logger.success(`Registration ${registration.id} created for ${interaction.user.tag}`);

    } catch (error) {
      Logger.error('Error handling registration submit', error);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: `❌ **Error:** ${error.message || 'Terjadi kesalahan saat mendaftar.'}` 
        });
      }
    }
  }

  /**
   * Create payment channel
   */
  static async createPaymentChannel(interaction, session, participantName) {
    try {
      const client = interaction.client;
      const cleanName = participantName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const paymentChannel = await interaction.guild.channels.create({
        name: `${config.SESSION.PAYMENT_CHANNEL_PREFIX}${cleanName}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        topic: `Payment channel untuk ${participantName} - ${session.title}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages
            ],
          },
        ],
      });

      Logger.success(`Payment channel created: ${paymentChannel.name}`);
      return paymentChannel;
      
    } catch (error) {
      Logger.error('Error creating payment channel', error);
      return null;
    }
  }

  /**
   * Create confirm/reject buttons
   */
  static createConfirmButtons(registrationId) {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_registration_${registrationId}`)
          .setLabel('✅ Konfirmasi')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_registration_${registrationId}`)
          .setLabel('❌ Tolak')
          .setStyle(ButtonStyle.Danger)
      );
  }

  /**
   * Handle payment proof in payment channel
   */
  static async handlePaymentProof(message) {
    // Check if in payment channel
    if (!message.channel.name || !message.channel.name.startsWith(config.SESSION.PAYMENT_CHANNEL_PREFIX)) {
      return;
    }

    // Check if message has image attachment
    if (message.attachments.size === 0) {
      return;
    }

    const hasImage = message.attachments.some(att => 
      att.contentType && att.contentType.startsWith('image/')
    );

    if (!hasImage) {
      return;
    }

    try {
      // Send confirmation to user
      const replyEmbed = SessionEmbeds.createPaymentReceivedEmbed(message.author.username);
      await message.reply({ embeds: [replyEmbed] });

      // Notify admin
      await message.channel.send(
        `🔔 **Notifikasi untuk Admin:**\n\n` +
        `${message.author} telah mengirim bukti pembayaran. Mohon segera dicek dan dikonfirmasi!\n` +
        `⏱️ *Waktu: ${new Date().toLocaleTimeString('id-ID')}*`
      );
      
      Logger.success(`Payment proof received from ${message.author.tag} in ${message.channel.name}`);
      
    } catch (error) {
      Logger.error('Error handling payment proof', error);
    }
  }

  /**
   * Handle confirm registration
   */
  static async handleConfirmRegistration(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ **Error:** Hanya Admin yang bisa mengkonfirmasi pendaftaran!', 
        flags: 64
      });
    }

    const registrationId = interaction.customId.split('_')[2];
    const registration = sessionManager.getRegistration(registrationId);

    if (!registration) {
      return interaction.reply({ 
        content: '❌ **Error:** Registration tidak ditemukan!', 
        flags: 64 
      });
    }

    if (registration.status === 'confirmed') {
      return interaction.reply({ 
        content: '❌ **Error:** Pendaftaran sudah dikonfirmasi!', 
        flags: 64 
      });
    }

    const session = sessionManager.getSession(registration.sessionId);

    // Update registration status
    sessionManager.updateRegistrationStatus(
      registrationId, 
      'confirmed', 
      interaction.user.tag
    );

    // Send confirmation message
    const confirmedEmbed = SessionEmbeds.createConfirmedEmbed(
      registration, 
      session, 
      interaction.user.tag
    );

    await interaction.channel.send({ embeds: [confirmedEmbed] });
    await interaction.reply(`✅ Pendaftaran **${registration.name}** dikonfirmasi oleh ${interaction.user.tag}!`);

    // Update participant list
    await this.updateParticipantList(interaction.guild, session);

    // Archive and delete payment channel
    await this.archiveAndDeleteChannel(registration, session, interaction.guild);

    Logger.success(`Registration ${registrationId} confirmed by ${interaction.user.tag}`);
  }

  /**
   * Update participant list
   */
  static async updateParticipantList(guild, session) {
    if (!config.CHANNELS.SESSION_LIST) return;

    try {
      const listChannel = await guild.channels.fetch(config.CHANNELS.SESSION_LIST);
      if (!listChannel) return;

      const registrations = sessionManager.getRegistrations(session.id);
      const listEmbed = SessionEmbeds.createParticipantListEmbed(session, registrations);

      // Try to find and update existing message, or send new one
      const messages = await listChannel.messages.fetch({ limit: 10 });
      const existingMessage = messages.find(m => 
        m.embeds[0]?.footer?.text?.includes(session.id)
      );

      if (existingMessage) {
        await existingMessage.edit({ embeds: [listEmbed] });
      } else {
        await listChannel.send({ embeds: [listEmbed] });
      }

      Logger.success(`Participant list updated for ${session.id}`);
    } catch (error) {
      Logger.error('Error updating participant list', error);
    }
  }

  /**
   * Archive and delete payment channel
   */
  static async archiveAndDeleteChannel(registration, session, guild) {
    try {
      // Send to archive channel
      if (config.CHANNELS.ARCHIVE) {
        const archiveChannel = await guild.channels.fetch(config.CHANNELS.ARCHIVE);
        
        if (archiveChannel) {
          const archiveEmbed = SessionEmbeds.createRegistrationArchiveEmbed(registration, session);
          await archiveChannel.send({ embeds: [archiveEmbed] });
          Logger.success(`Registration ${registration.id} archived`);
        }
      }
      
      // Delete payment channel after delay
      const paymentChannel = await guild.channels.fetch(registration.channelId);
      if (paymentChannel) {
        await paymentChannel.send(`⏳ Channel ini akan dihapus dalam ${config.SESSION.DELETE_DELAY_MS / 1000} detik...`);
        
        setTimeout(async () => {
          try {
            await paymentChannel.delete();
            Logger.success(`Payment channel ${paymentChannel.name} deleted`);
          } catch (error) {
            Logger.error('Failed to delete payment channel', error);
          }
        }, config.SESSION.DELETE_DELAY_MS);
      }
      
    } catch (error) {
      Logger.error('Error in archiveAndDeleteChannel', error);
    }
  }

  /**
   * Handle reject registration
   */
  static async handleRejectRegistration(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ **Error:** Hanya Admin yang bisa menolak pendaftaran!', 
        flags: 64
      });
    }

    const registrationId = interaction.customId.split('_')[2];
    const registration = sessionManager.getRegistration(registrationId);

    if (!registration) {
      return interaction.reply({ 
        content: '❌ **Error:** Registration tidak ditemukan!', 
        flags: 64 
      });
    }

    // Update registration status
    sessionManager.updateRegistrationStatus(registrationId, 'rejected');

    await interaction.reply(`❌ Pendaftaran **${registration.name}** ditolak oleh ${interaction.user.tag}.`);

    // Delete payment channel after delay
    const paymentChannel = await interaction.guild.channels.fetch(registration.channelId);
    if (paymentChannel) {
      await paymentChannel.send(
        `❌ **Pendaftaran Ditolak**\n\n` +
        `Mohon maaf, pendaftaran Anda ditolak.\n` +
        `Silakan hubungi admin untuk informasi lebih lanjut.\n\n` +
        `⏳ Channel ini akan dihapus dalam ${config.SESSION.DELETE_DELAY_MS / 1000} detik...`
      );
      
      setTimeout(async () => {
        try {
          await paymentChannel.delete();
          Logger.success(`Payment channel deleted after rejection`);
        } catch (error) {
          Logger.error('Failed to delete payment channel', error);
        }
      }, config.SESSION.DELETE_DELAY_MS);
    }

    Logger.warning(`Registration ${registrationId} rejected by ${interaction.user.tag}`);
  }
}

module.exports = SessionHandler;