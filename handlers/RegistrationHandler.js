// ============================================================================
// REGISTRATION HANDLER
// ============================================================================

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const RegistrationEmbeds = require('../embeds/RegistrationEmbeds');
const Utils = require('../utils');
const Logger = require('../utils/logger');
const { registrationManager } = require('../managers');
const config = require('../config/config');

class RegistrationHandler {
  /**
   * Show modal for opening registration ticket
   */
  static async showOpenTicketModal(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ **Error:** Hanya admin yang bisa membuka tiket pendaftaran!',
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('open_ticket_modal')
      .setTitle('🎫 Buka Tiket Pendaftaran');

    const sessionNameInput = new TextInputBuilder()
      .setCustomId('session_name')
      .setLabel('Nama Sesi')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Tournament-MLBB')
      .setRequired(true);

    const feeInput = new TextInputBuilder()
      .setCustomId('fee')
      .setLabel('Biaya Pendaftaran (Angka saja)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: 50000')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(sessionNameInput),
      new ActionRowBuilder().addComponents(feeInput)
    );

    await interaction.showModal(modal);
    Logger.info(`Open ticket modal shown to ${interaction.user.tag}`);
  }

  /**
   * Handle open ticket modal submit
   */
  static async handleOpenTicketSubmit(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });

      const sessionName = interaction.fields.getTextInputValue('session_name');
      const feeRaw = interaction.fields.getTextInputValue('fee').replace(/\D/g, '');
      const fee = parseInt(feeRaw);

      if (isNaN(fee) || fee < 0) {
        return interaction.editReply({
          content: '❌ **Error:** Biaya harus berupa angka positif!'
        });
      }

      // Create session
      const session = registrationManager.createSession({
        sessionName,
        fee,
        creatorId: interaction.user.id,
        channelId: interaction.channel.id // Use current channel
      });

      // Update original message with registration panel
      const embed = RegistrationEmbeds.createSessionEmbed(session);
      const button = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`register_${session.id}`)
            .setLabel('📝 Daftar Sekarang')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✨')
        );

      await interaction.channel.send({ embeds: [embed], components: [button] });

      await interaction.editReply({
        content: `✅ **Tiket pendaftaran berhasil dibuka!**\n\n` +
          `📌 **Nama Sesi:** ${sessionName}\n` +
          `💰 **Biaya:** Rp ${fee.toLocaleString('id-ID')}\n` +
          `🆔 **Session ID:** \`${session.id}\`\n\n` +
          `Member sekarang bisa mendaftar di channel ini!`
      });

      Logger.success(`Registration opened: ${session.id} by ${interaction.user.tag}`);

    } catch (error) {
      Logger.error('Error opening registration ticket', error);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ **Error:** Gagal membuka tiket pendaftaran!'
        });
      }
    }
  }

  /**
   * Show registration form with dropdown
   */
  static async showRegistrationForm(interaction, sessionId) {
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
        content: '⚠️ Anda sudah terdaftar untuk sesi ini!',
        flags: 64
      });
    }

    // Get members with "akamsiNS88" role
    const akamsiRole = interaction.guild.roles.cache.find(role => role.name === 'akamsiNS88');
    
    if (!akamsiRole) {
      return interaction.reply({
        content: '❌ **Error:** Role "akamsiNS88" tidak ditemukan! Hubungi admin.',
        flags: 64
      });
    }

    const akamsiMembers = interaction.guild.members.cache.filter(member => 
      member.roles.cache.has(akamsiRole.id) && !member.user.bot
    );

    if (akamsiMembers.size === 0) {
      return interaction.reply({
        content: '❌ **Error:** Tidak ada member dengan role "akamsiNS88"!',
        flags: 64
      });
    }

    // Create dropdown options (max 25)
    const options = akamsiMembers.map(member => ({
      label: `${member.user.username}`,
      description: `Kenalan dengan ${member.displayName}`,
      value: member.id,
      emoji: '👋'
    })).slice(0, 25);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_kenalan_${sessionId}_${interaction.user.id}`)
      .setPlaceholder('🔍 Pilih member untuk kenalan')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Store session temporarily
    await interaction.reply({
      content: `📝 **Formulir Pendaftaran - ${session.sessionName}**\n\n` +
        `💰 **Biaya Pendaftaran:** Rp ${session.fee.toLocaleString('id-ID')}\n\n` +
        `**Step 1/2:** Pilih member "akamsiNS88" yang ingin kamu kenalan:`,
      components: [row],
      flags: 64
    });

    Logger.info(`Registration form shown to ${interaction.user.tag} for ${sessionId}`);
  }

  /**
   * Handle kenalan selection
   */
  static async handleKenalanSelect(interaction, sessionId, userId) {
    // Verify this is the right user
    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: '❌ Ini bukan form pendaftaran Anda!',
        flags: 64
      });
    }

    const kenalanId = interaction.values[0];
    const kenalanMember = await interaction.guild.members.fetch(kenalanId);

    if (!kenalanMember) {
      return interaction.update({
        content: '❌ **Error:** Member tidak ditemukan!',
        components: []
      });
    }

    // Show modal for username and display name
    const modal = new ModalBuilder()
      .setCustomId(`registration_final_${sessionId}_${kenalanId}`)
      .setTitle('📝 Form Pendaftaran');

    const usernameInput = new TextInputBuilder()
      .setCustomId('username')
      .setLabel('Username')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Masukkan username kamu')
      .setRequired(true);

    const displayNameInput = new TextInputBuilder()
      .setCustomId('display_name')
      .setLabel('Display Name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Masukkan display name kamu')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(usernameInput),
      new ActionRowBuilder().addComponents(displayNameInput)
    );

    await interaction.showModal(modal);
    Logger.info(`Kenalan selected: ${kenalanMember.user.tag} by ${interaction.user.tag}`);
  }

  /**
   * Handle final registration submit
   */
  static async handleFinalRegistration(interaction, sessionId, kenalanId) {
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
          content: '⚠️ Anda sudah terdaftar!'
        });
      }

      const username = interaction.fields.getTextInputValue('username');
      const displayName = interaction.fields.getTextInputValue('display_name');
      const kenalanMember = await interaction.guild.members.fetch(kenalanId);

      // Create private ticket channel for this registration
      const ticketChannel = await interaction.guild.channels.create({
        name: `${session.sessionName}-${interaction.user.username}`.toLowerCase(),
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        topic: `Pendaftaran ${session.sessionName} - ${interaction.user.tag}`,
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
            id: kenalanMember.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ],
          },
          {
            id: interaction.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory
            ],
          },
        ],
      });

      // Add admins to channel
      const admins = Utils.getAdmins(interaction.guild);
      for (const [_, admin] of admins) {
        await ticketChannel.permissionOverwrites.create(admin.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }

      // Add registration
      const registration = registrationManager.addRegistration(sessionId, interaction.user.id, {
        username,
        displayName,
        kenalanId,
        kenalanTag: kenalanMember.user.tag,
        ticketChannelId: ticketChannel.id
      });

      // Send embed to ticket channel
      const embed = RegistrationEmbeds.createRegistrationTicketEmbed(
        session,
        registration,
        interaction.user,
        kenalanMember
      );

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_payment_${sessionId}_${interaction.user.id}`)
            .setLabel('✅ Konfirmasi Pembayaran')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`cancel_registration_${sessionId}_${interaction.user.id}`)
            .setLabel('❌ Batalkan Pendaftaran')
            .setStyle(ButtonStyle.Danger)
        );

      await ticketChannel.send({ 
        content: `${interaction.user} ${kenalanMember}`, 
        embeds: [embed],
        components: [buttons]
      });

      // Reply to user
      await interaction.editReply({
        content: `✅ **Pendaftaran berhasil dibuat!**\n\n` +
          `📍 **Channel Pendaftaran:** ${ticketChannel}\n` +
          `🆔 **Ticket ID:** \`${registration.ticketId}\`\n` +
          `💰 **Biaya:** Rp ${session.fee.toLocaleString('id-ID')}\n` +
          `👋 **Kenalan dengan:** ${kenalanMember.user.tag}\n\n` +
          `Silakan lakukan pembayaran dan upload bukti di channel tersebut!`
      });

      Logger.success(`Registration ticket created for ${interaction.user.tag} - ${registration.ticketId}`);

    } catch (error) {
      Logger.error('Error creating registration ticket', error);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ **Error:** Gagal membuat tiket pendaftaran!'
        });
      }
    }
  }

  /**
   * Handle payment confirmation
   */
  static async handlePaymentConfirmation(interaction, sessionId, userId) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ **Error:** Hanya admin yang bisa konfirmasi pembayaran!',
        flags: 64
      });
    }

    const registration = registrationManager.getRegistration(sessionId, userId);
    
    if (!registration) {
      return interaction.reply({
        content: '❌ **Error:** Pendaftaran tidak ditemukan!',
        flags: 64
      });
    }

    if (registration.paid) {
      return interaction.reply({
        content: '⚠️ Pembayaran sudah dikonfirmasi sebelumnya!',
        flags: 64
      });
    }

    registrationManager.updateRegistration(sessionId, userId, {
      paid: true,
      status: 'approved',
      paidAt: new Date(),
      approvedBy: interaction.user.id
    });

    await interaction.reply({
      content: `✅ **Pembayaran dikonfirmasi!**\n\n` +
        `Pendaftaran <@${userId}> telah disetujui.\n` +
        `Terima kasih! 🎉`
    });

    Logger.success(`Payment confirmed for ${userId} by ${interaction.user.tag}`);
  }

  /**
   * Handle cancel registration
   */
  static async handleCancelRegistration(interaction, sessionId, userId) {
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = interaction.user.id === userId;

    if (!isAdmin && !isOwner) {
      return interaction.reply({
        content: '❌ **Error:** Hanya admin atau pemilik pendaftaran yang bisa membatalkan!',
        flags: 64
      });
    }

    const registration = registrationManager.getRegistration(sessionId, userId);
    
    if (!registration) {
      return interaction.reply({
        content: '❌ **Error:** Pendaftaran tidak ditemukan!',
        flags: 64
      });
    }

    await interaction.reply({
      content: `❌ **Pendaftaran dibatalkan!**\n\nChannel ini akan dihapus dalam 5 detik...`
    });

    setTimeout(async () => {
      try {
        const channel = await interaction.guild.channels.fetch(registration.ticketChannelId);
        if (channel) {
          await channel.delete();
        }
      } catch (error) {
        Logger.error('Error deleting registration channel', error);
      }
    }, 5000);

    registrationManager.removeRegistration(sessionId, userId);
    Logger.info(`Registration cancelled for ${userId}`);
  }
}

module.exports = RegistrationHandler;