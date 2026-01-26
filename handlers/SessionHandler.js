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
   * Handle open session panel button (for admin)
   */
  static async handleOpenSessionPanel(interaction) {
    // Check if user is admin
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ **Error:** Hanya admin yang bisa membuka sesi pendaftaran!', 
        flags: 64 
      });
    }

    // Show session creation modal
    await this.showSessionCreationModal(interaction);
  }

  /**
   * Show session creation modal for admin
   */
  static async showSessionCreationModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('create_session_form')
      .setTitle('📝 Buat Sesi Pendaftaran Baru');

    const sessionNameInput = new TextInputBuilder()
      .setCustomId('session_name')
      .setLabel('Nama Sesi')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Sesi Belajar Discord Bot')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(sessionNameInput);

    modal.addComponents(row);
    await interaction.showModal(modal);
    Logger.info(`Session creation modal shown to admin ${interaction.user.tag}`);
  }

  /**
   * Handle session creation form submit
   */
  static async handleSessionCreationSubmit(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });

      const sessionName = interaction.fields.getTextInputValue('session_name');

      // Create public channel for this session
      const sessionChannel = await this.createSessionChannel(interaction, sessionName);

      if (!sessionChannel) {
        return interaction.editReply({ 
          content: '❌ **Error:** Gagal membuat channel sesi. Pastikan bot punya permission "Manage Channels".' 
        });
      }

      // Create session with default values
      const session = sessionManager.createSession({
        title: sessionName,
        description: 'Silakan daftar sekarang!',
        date: new Date().toLocaleDateString('id-ID'),
        time: '-',
        maxSlots: 999, // Unlimited by default
        fee: '-',
        creatorId: interaction.user.id,
        channelId: sessionChannel.id
      });

      // Create announcement embed
      const announceEmbed = this.createSessionAnnounceEmbed(session);
      
      // Create buttons (register + close)
      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`register_session_${session.id}`)
            .setLabel('📝 DAFTAR SEKARANG')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId(`close_session_${session.id}`)
            .setLabel('🔒 TUTUP SESI')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );

      // Send to new session channel
      const sentMessage = await sessionChannel.send({ 
        embeds: [announceEmbed], 
        components: [buttons] 
      });

      // Store message ID
      sessionManager.updateSession(session.id, { messageId: sentMessage.id });

      // Reply to admin
      await interaction.editReply({ 
        content: `✅ **Sesi pendaftaran berhasil dibuat!**\n\n` +
                 `📌 **Session ID:** ${session.id}\n` +
                 `📋 **Nama Sesi:** ${sessionName}\n` +
                 `📍 **Channel:** ${sessionChannel}\n\n` +
                 `Member sekarang bisa mendaftar di channel tersebut!`
      });

      Logger.success(`Session ${session.id} created by ${interaction.user.tag} in channel ${sessionChannel.name}`);

    } catch (error) {
      Logger.error('Error handling session creation', error);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: `❌ **Error:** ${error.message || 'Terjadi kesalahan saat membuat sesi.'}` 
        });
      }
    }
  }

  /**
   * Create public session channel
   */
  static async createSessionChannel(interaction, sessionTitle) {
    try {
      const client = interaction.client;
      
      // Clean title for channel name
      const cleanTitle = sessionTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      const sessionChannel = await interaction.guild.channels.create({
        name: `📋-${cleanTitle}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        topic: `Pendaftaran: ${sessionTitle}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory
            ],
            deny: [
              PermissionFlagsBits.SendMessages // Only bot & admin can send
            ]
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.ManageChannels
            ],
          },
        ],
      });

      Logger.success(`Session channel created: ${sessionChannel.name}`);
      return sessionChannel;
      
    } catch (error) {
      Logger.error('Error creating session channel', error);
      return null;
    }
  }

  /**
   * Create session announcement embed (for members)
   */
  static createSessionAnnounceEmbed(session) {
    const EmbedBuilder = require('discord.js').EmbedBuilder;
    
    return new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎯 PENDAFTARAN DIBUKA!')
      .setDescription(
        `**${session.title}**\n\n` +
        `${session.description}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**📝 Cara Daftar:**\n` +
        `1️⃣ Klik tombol **"DAFTAR SEKARANG"** di bawah\n` +
        `2️⃣ Isi formulir pendaftaran\n` +
        `3️⃣ Upload bukti pembayaran di channel pribadi\n` +
        `4️⃣ Tunggu konfirmasi dari admin\n\n` +
        `⚡ **Segera daftar sekarang!**`
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

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
    if (session.maxSlots !== 999 && confirmedCount >= session.maxSlots) {
      return interaction.reply({ 
        content: '❌ **Error:** Kuota sudah penuh!', 
        flags: 64 
      });
    }

    // Show username modal directly
    await this.showUsernameModal(interaction, session);
  }

  /**
   * Show username modal
   */
  static async showUsernameModal(interaction, session) {
    const modal = new ModalBuilder()
      .setCustomId(`username_form_${session.id}`)
      .setTitle('📝 Formulir Pendaftaran');

    const usernameInput = new TextInputBuilder()
      .setCustomId('username')
      .setLabel('Username')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: John Doe')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(usernameInput);

    modal.addComponents(row);
    await interaction.showModal(modal);
    Logger.info(`Username modal shown to ${interaction.user.tag} for ${session.id}`);
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

      const username = interaction.fields.getTextInputValue('username');

      // Get role from temp data
      const tempData = interaction.client.tempRegistrationData?.get(interaction.user.id);
      const role = tempData?.role || 'akamsi';

      // Clear temp data
      if (interaction.client.tempRegistrationData) {
        interaction.client.tempRegistrationData.delete(interaction.user.id);
      }

      // Get role name
      const roleName = role === 'akamsi' ? 'Akamsi NS88' : 'Unknown';

      // Create registration directly to admin (no payment channel)
      const registration = sessionManager.addRegistration(sessionId, {
        userId: interaction.user.id,
        username: username,
        role: roleName,
        contact: interaction.user.tag,
        notes: `Role: ${roleName}`,
        channelId: null // No payment channel needed
      });

      // Send notification to admin (crzdrn)
      await this.notifyAdminPayment(interaction, registration, session);

      // Reply to user
      await interaction.editReply({ 
        content: `✅ **Pendaftaran berhasil!**\n\n` +
                 `📋 **Username:** ${username}\n` +
                 `👤 **Role:** ${roleName}\n` +
                 `💰 **Biaya:** Rp 20.000\n\n` +
                 `📸 **Silakan upload bukti pembayaran ke admin.**\n` +
                 `Admin akan menghubungi Anda untuk konfirmasi.`
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
   * Notify admin about new registration
   */
  static async notifyAdminPayment(interaction, registration, session) {
    const config = require('../config/config');
    const Utils = require('../utils');

    // Find admin user
    const adminUser = Utils.findUserByUsername(interaction.guild, config.ADMIN.USERNAME);

    if (!adminUser) {
      Logger.warning(`Admin ${config.ADMIN.USERNAME} not found`);
      return;
    }

    // Send DM to admin with payment info
    try {
      const { EmbedBuilder } = require('discord.js');
      
      const paymentEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('💳 PENDAFTARAN BARU - MENUNGGU PEMBAYARAN')
        .setDescription(
          `**Detail Pendaftaran:**\n\n` +
          `📌 **Sesi:** ${session.title}\n` +
          `👤 **User:** ${interaction.user} (${interaction.user.tag})\n` +
          `📝 **Username:** ${registration.username}\n` +
          `🎭 **Role:** ${registration.role}\n\n` +
          `💰 **Biaya Pendaftaran:** Rp 20.000\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `**📸 Informasi QRIS:**\n` +
          `🏦 **Atas Nama:** ${config.PAYMENT.ACCOUNT_NAME}\n` +
          `🔢 **NMID:** ${config.PAYMENT.QRIS_NMID}\n\n` +
          `⏳ **Tunggu user mengirim bukti pembayaran.**\n` +
          `Gunakan button dibawah untuk konfirmasi/tolak setelah cek pembayaran.`
        )
        .setImage(config.PAYMENT.QRIS_IMAGE_URL)
        .setFooter({ text: `${registration.id} | ${config.BOT.NAME} 🤖` })
        .setTimestamp();

      const confirmButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_registration_${registration.id}`)
            .setLabel('✅ Konfirmasi')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reject_registration_${registration.id}`)
            .setLabel('❌ Tolak')
            .setStyle(ButtonStyle.Danger)
        );

      await adminUser.send({ 
        embeds: [paymentEmbed], 
        components: [confirmButtons] 
      });

      Logger.success(`Payment notification sent to admin ${adminUser.user.tag}`);

    } catch (error) {
      Logger.error('Failed to send DM to admin', error);
      
      // Fallback: send in channel
      await interaction.channel.send(
        `🔔 **Notifikasi untuk Admin ${adminUser}:**\n\n` +
        `📋 Pendaftaran baru dari ${interaction.user}\n` +
        `👤 Username: ${registration.username}\n` +
        `🎭 Role: ${registration.role}\n` +
        `💰 Biaya: Rp 20.000\n\n` +
        `⚠️ DM gagal terkirim. Silakan cek detail di log.`
      );
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

    // Send confirmation to user via DM
    try {
      const user = await interaction.client.users.fetch(registration.userId);
      const { EmbedBuilder } = require('discord.js');
      
      const confirmEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ PENDAFTARAN DIKONFIRMASI!')
        .setDescription(
          `Selamat! Pendaftaran Anda telah dikonfirmasi.\n\n` +
          `**Detail Pendaftaran:**\n` +
          `📌 **Sesi:** ${session.title}\n` +
          `👤 **Username:** ${registration.username}\n` +
          `🎭 **Role:** ${registration.role}\n\n` +
          `✅ **Dikonfirmasi oleh:** ${interaction.user.tag}\n` +
          `📝 **Status:** TERDAFTAR\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎉 **Terima kasih sudah mendaftar!**\n` +
          `Silakan cek channel list untuk melihat daftar peserta.`
        )
        .setFooter({ text: `${registrationId} | ${config.BOT.NAME} 🤖` })
        .setTimestamp();

      await user.send({ embeds: [confirmEmbed] });
    } catch (error) {
      Logger.warning(`Could not send confirmation DM to user ${registration.userId}`);
    }

    await interaction.reply({ 
      content: `✅ Pendaftaran **${registration.username}** (${registration.role}) dikonfirmasi!`,
      flags: 64
    });

    // Update participant list
    await this.updateParticipantList(interaction.guild, session);

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

    // Send rejection to user via DM
    try {
      const user = await interaction.client.users.fetch(registration.userId);
      await user.send(
        `❌ **Pendaftaran Ditolak**\n\n` +
        `Mohon maaf, pendaftaran Anda untuk sesi **${sessionManager.getSession(registration.sessionId)?.title || 'Unknown'}** ditolak.\n\n` +
        `📝 **Username:** ${registration.username}\n` +
        `🎭 **Role:** ${registration.role}\n\n` +
        `Silakan hubungi admin untuk informasi lebih lanjut.`
      );
    } catch (error) {
      Logger.warning(`Could not send rejection DM to user ${registration.userId}`);
    }

    await interaction.reply({ 
      content: `❌ Pendaftaran **${registration.username}** ditolak.`,
      flags: 64
    });

    Logger.warning(`Registration ${registrationId} rejected by ${interaction.user.tag}`);
  }

  /**
   * Handle close session button
   */
  static async handleCloseSession(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ **Error:** Hanya Admin yang bisa menutup sesi!', 
        flags: 64
      });
    }

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

    // Close session
    sessionManager.closeSession(sessionId);

    // Get confirmed count
    const confirmedCount = sessionManager.getConfirmedCount(sessionId);

    // Update message - remove buttons
    const closedEmbed = this.createClosedSessionEmbed(session, confirmedCount);
    
    await interaction.message.edit({ 
      embeds: [closedEmbed], 
      components: [] 
    });

    await interaction.reply({ 
      content: `✅ **Sesi berhasil ditutup!**\n\n` +
               `📌 **Session:** ${session.title}\n` +
               `👥 **Total Peserta:** ${confirmedCount}/${session.maxSlots}\n` +
               `🔒 **Ditutup oleh:** ${interaction.user.tag}`,
      flags: 64
    });

    // Delete session channel after delay
    const sessionChannel = await interaction.guild.channels.fetch(session.channelId);
    if (sessionChannel) {
      await sessionChannel.send(
        `🔒 **SESI DITUTUP**\n\n` +
        `Pendaftaran untuk sesi **${session.title}** telah ditutup.\n` +
        `👥 **Total Peserta Terdaftar:** ${confirmedCount}/${session.maxSlots}\n\n` +
        `⏳ Channel ini akan dihapus dalam ${config.SESSION.DELETE_DELAY_MS / 1000} detik...`
      );
      
      setTimeout(async () => {
        try {
          await sessionChannel.delete();
          Logger.success(`Session channel ${sessionChannel.name} deleted`);
        } catch (error) {
          Logger.error('Failed to delete session channel', error);
        }
      }, config.SESSION.DELETE_DELAY_MS);
    }

    Logger.success(`Session ${sessionId} closed by ${interaction.user.tag}`);
  }

  /**
   * Create closed session embed
   */
  static createClosedSessionEmbed(session, confirmedCount) {
    const EmbedBuilder = require('discord.js').EmbedBuilder;
    
    return new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🔒 SESI DITUTUP')
      .setDescription(
        `**${session.title}**\n\n` +
        `${session.description}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📋 **Informasi:**\n` +
        `👥 **Peserta Terdaftar:** ${confirmedCount} orang\n` +
        `📅 **Ditutup pada:** ${new Date().toLocaleString('id-ID')}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🔒 **Pendaftaran telah ditutup.**\n` +
        `Terima kasih atas partisipasinya!`
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }
}

module.exports = SessionHandler;