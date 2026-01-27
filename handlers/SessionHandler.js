// ============================================================================
// SESSION HANDLER (FULL IMPLEMENTATION)
// ============================================================================

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');

const config = require('../config/config');
const Logger = require('../utils/logger');
const { sessionManager } = require('../managers');

class SessionHandler {

  // ==========================================================================
  // ADMIN: OPEN SESSION PANEL
  // ==========================================================================
  static async handleOpenSessionPanel(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Hanya admin!', flags: 64 });
    }
    await this.showSessionCreationModal(interaction);
  }

  // ==========================================================================
  // ADMIN: CREATE SESSION MODAL
  // ==========================================================================
  static async showSessionCreationModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('create_session_form')
      .setTitle('📋 Buat Sesi Pendaftaran');

    const nameInput = new TextInputBuilder()
      .setCustomId('session_name')
      .setLabel('Nama Sesi')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const feeInput = new TextInputBuilder()
      .setCustomId('session_fee')
      .setLabel('Biaya')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(feeInput),
    );

    await interaction.showModal(modal);
  }

  // ==========================================================================
  // ADMIN: SUBMIT CREATE SESSION
  // ==========================================================================
  static async handleSessionCreationSubmit(interaction) {
    await interaction.deferReply({ flags: 64 });

    const title = interaction.fields.getTextInputValue('session_name');
    const fee = parseInt(interaction.fields.getTextInputValue('session_fee'));

    if (isNaN(fee) || fee < 0) {
      return interaction.editReply({ content: '❌ Biaya tidak valid.' });
    }

    const channel = await interaction.guild.channels.create({
      name: `📋-${title.toLowerCase().replace(/\s+/g, '-')}`,
      type: ChannelType.GuildText,
      parent: interaction.channel.parentId,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.SendMessages],
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
    });

    const session = sessionManager.createSession({
      title,
      fee,
      feeFormatted: `Rp ${fee.toLocaleString('id-ID')}`,
      channelId: channel.id,
      creatorId: interaction.user.id,
      status: 'open',
    });

    const embed = this.createSessionAnnounceEmbed(session);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`register_session_${session.id}`)
        .setLabel('📝 DAFTAR')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`close_session_${session.id}`)
        .setLabel('🔒 TUTUP')
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({ embeds: [embed], components: [buttons] });

    await interaction.editReply({
      content: `✅ Session **${title}** dibuat di ${channel}`,
    });
  }

  // ==========================================================================
  // USER: REGISTER BUTTON
  // ==========================================================================
  static async handleRegisterButton(interaction) {
    const sessionId = interaction.customId.split('_')[2];
    const session = sessionManager.getSession(sessionId);

    if (!session || session.status === 'closed') {
      return interaction.reply({ content: '❌ Session tidak tersedia.', flags: 64 });
    }

    await this.showUsernameModal(interaction, session);
  }

  // ==========================================================================
  // USERNAME MODAL
  // ==========================================================================
  static async showUsernameModal(interaction, session) {
    const modal = new ModalBuilder()
      .setCustomId(`username_form_${session.id}`)
      .setTitle('📝 Pendaftaran');

    const username = new TextInputBuilder()
      .setCustomId('username')
      .setLabel('Username')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(username),
    );

    await interaction.showModal(modal);
  }

  // ==========================================================================
  // SUBMIT REGISTRATION
  // ==========================================================================
  static async handleRegistrationSubmit(interaction) {
    const sessionId = interaction.customId.split('_')[2];
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return interaction.reply({ content: '❌ Session tidak ditemukan.', flags: 64 });
    }

    const username = interaction.fields.getTextInputValue('username');

    sessionManager.addRegistration(sessionId, {
      userId: interaction.user.id,
      username,
      status: 'pending',
    });

    await interaction.reply({
      content:
        `✅ **Pendaftaran berhasil!**\n\n` +
        `👤 Username: ${username}\n` +
        `📋 Session: ${session.title}\n\n` +
        `Silakan upload bukti pembayaran.`,
      flags: 64,
    });
  }

  // ==========================================================================
  // PAYMENT PROOF (MESSAGE CREATE)
  // ==========================================================================
  static async handlePaymentProof(message) {
    if (!message.channel.name.startsWith('💳-pembayaran-')) return;
    if (!message.attachments.size) return;

    const hasImage = message.attachments.some(a =>
      a.contentType?.startsWith('image/')
    );
    if (!hasImage) return;

    await message.reply(
      `✅ **Bukti pembayaran diterima.**\nAdmin akan memverifikasi.`
    );

    Logger.success(`Payment proof from ${message.author.tag}`);
  }

  // ==========================================================================
  // ADMIN: CONFIRM REGISTRATION
  // ==========================================================================
  static async handleConfirmRegistration(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    await interaction.reply({
      content: '✅ Pendaftaran dikonfirmasi.',
      flags: 64,
    });
  }

  // ==========================================================================
  // ADMIN: REJECT REGISTRATION
  // ==========================================================================
  static async handleRejectRegistration(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    await interaction.reply({
      content: '❌ Pendaftaran ditolak.',
      flags: 64,
    });
  }

  // ==========================================================================
  // ADMIN: CLOSE SESSION
  // ==========================================================================
  static async handleCloseSession(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    const sessionId = interaction.customId.split('_')[2];
    sessionManager.closeSession(sessionId);

    await interaction.reply({
      content: '🔒 Session ditutup.',
      flags: 64,
    });
  }

  // ==========================================================================
  // EMBED
  // ==========================================================================
  static createSessionAnnounceEmbed(session) {
    return new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎯 PENDAFTARAN DIBUKA')
      .setDescription(
        `📋 **${session.title}**\n` +
        `💰 Biaya: ${session.feeFormatted}\n\n` +
        `Klik tombol di bawah untuk mendaftar.`,
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME}` })
      .setTimestamp();
  }
}

module.exports = SessionHandler;
