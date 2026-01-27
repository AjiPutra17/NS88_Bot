// ============================================================================
// SESSION HANDLER - FULL VERSION
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

const Logger = require('../utils/logger');
const config = require('../config/config');
const { sessionManager } = require('../managers');

class SessionHandler {

  // ==========================================================================
  // ADMIN: OPEN SESSION PANEL
  // ==========================================================================
  static async handleOpenSessionPanel(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }
    await this.showSessionCreationModal(interaction);
  }

  // ==========================================================================
  // ADMIN: SESSION CREATION MODAL
  // ==========================================================================
  static async showSessionCreationModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('create_session_form')
      .setTitle('📋 Buat Session');

    const name = new TextInputBuilder()
      .setCustomId('session_name')
      .setLabel('Nama Session')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const fee = new TextInputBuilder()
      .setCustomId('session_fee')
      .setLabel('Biaya')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(fee)
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

    if (isNaN(fee)) {
      return interaction.editReply({ content: '❌ Biaya tidak valid.' });
    }

    const channel = await interaction.guild.channels.create({
      name: `📋-${title.toLowerCase().replace(/\s+/g, '-')}`,
      type: ChannelType.GuildText,
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
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [buttons] });
    await interaction.editReply({ content: `✅ Session dibuat: ${channel}` });
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

    const modal = new ModalBuilder()
      .setCustomId(`username_form_${session.id}`)
      .setTitle('📝 Pendaftaran');

    const username = new TextInputBuilder()
      .setCustomId('username')
      .setLabel('Username')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(username)
    );

    await interaction.showModal(modal);
  }

  // ==========================================================================
  // USER: SUBMIT REGISTRATION
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

    const paymentChannel = await interaction.guild.channels.create({
      name: `💳-pembayaran-${interaction.user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
          ],
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

    await paymentChannel.send(
      `💳 **UPLOAD BUKTI PEMBAYARAN**\n\n` +
      `👤 ${interaction.user}\n` +
      `📋 ${session.title}\n` +
      `💰 ${session.feeFormatted}`
    );

    await interaction.reply({
      content: `✅ Pendaftaran berhasil.\nSilakan lanjut ke ${paymentChannel}`,
      flags: 64,
    });
  }

  // ==========================================================================
  // MESSAGE CREATE: PAYMENT PROOF
  // ==========================================================================
  static async handlePaymentProof(message) {
    if (!message.channel.name.startsWith('💳-pembayaran-')) return;
    if (!message.attachments.size) {
      return message.reply('❌ Kirim **gambar bukti pembayaran**.');
    }

    const image = message.attachments.find(a =>
      a.contentType?.startsWith('image/')
    );

    if (!image) {
      return message.reply('❌ File harus berupa gambar.');
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_payment_${message.author.id}`)
        .setLabel('✅ APPROVE')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_payment_${message.author.id}`)
        .setLabel('❌ REJECT')
        .setStyle(ButtonStyle.Danger)
    );

    await message.reply({
      content: '⏳ Menunggu verifikasi admin...',
      components: [buttons],
    });

    Logger.success(`Payment proof from ${message.author.tag}`);
  }

  // ==========================================================================
  // ADMIN: CONFIRM PAYMENT
  // ==========================================================================
  static async handleConfirmRegistration(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    await interaction.update({
      content: '✅ **PEMBAYARAN DISETUJUI**',
      components: [],
    });
  }

  // ==========================================================================
  // ADMIN: REJECT PAYMENT
  // ==========================================================================
  static async handleRejectRegistration(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    await interaction.update({
      content: '❌ **PEMBAYARAN DITOLAK**',
      components: [],
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

    await interaction.reply({ content: '🔒 Session ditutup.', flags: 64 });
  }

  // ==========================================================================
  // EMBED BUILDER
  // ==========================================================================
  static createSessionAnnounceEmbed(session) {
    return new EmbedBuilder()
      .setColor('#00ff99')
      .setTitle('🎯 PENDAFTARAN DIBUKA')
      .setDescription(
        `📋 **${session.title}**\n` +
        `💰 Biaya: ${session.feeFormatted}\n\n` +
        `Klik tombol di bawah untuk mendaftar.`
      )
      .setTimestamp();
  }
}

module.exports = SessionHandler;
