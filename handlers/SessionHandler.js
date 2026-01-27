// ============================================================================
// SESSION HANDLER - FINAL ARCHIVE VERSION
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
  EmbedBuilder
} = require('discord.js');

const config = require('../config/config');
const Logger = require('../utils/logger');
const { sessionManager } = require('../managers');

class SessionHandler {

  // =========================================================================
  // OPEN SESSION PANEL
  // =========================================================================
  static async handleOpenSessionPanel(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    const modal = new ModalBuilder()
      .setCustomId('create_session_form')
      .setTitle('📋 Buat Sesi Baru');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('session_name')
          .setLabel('Nama Sesi')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('session_fee')
          .setLabel('Biaya (angka)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }

  // =========================================================================
  // CREATE SESSION
  // =========================================================================
  static async handleSessionCreationSubmit(interaction) {
    await interaction.deferReply({ flags: 64 });

    const title = interaction.fields.getTextInputValue('session_name');
    const fee = parseInt(interaction.fields.getTextInputValue('session_fee'));

    if (isNaN(fee) || fee < 0) {
      return interaction.editReply('❌ Biaya tidak valid.');
    }

    const channel = await interaction.guild.channels.create({
      name: `📋-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`.slice(0, 50),
      type: ChannelType.GuildText,
      parent: interaction.channel.parentId,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.SendMessages]
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels
          ]
        }
      ]
    });

    const session = sessionManager.createSession({
      title,
      fee,
      feeFormatted: `Rp ${fee.toLocaleString('id-ID')}`,
      creatorId: interaction.user.id,
      channelId: channel.id
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎯 PENDAFTARAN DIBUKA')
      .setDescription(
        `📌 **${title}**\n\n` +
        `💰 Biaya: **${session.feeFormatted}**\n\n` +
        `Klik tombol di bawah untuk mendaftar.`
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME}` });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`register_session_${session.id}`)
        .setLabel('📝 DAFTAR')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`close_session_${session.id}`)
        .setLabel('🔒 TUTUP SESI')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [buttons] });
    await interaction.editReply(`✅ Session **${title}** berhasil dibuat.`);
  }

  // =========================================================================
  // REGISTER BUTTON
  // =========================================================================
  static async handleRegisterButton(interaction) {
    const sessionId = interaction.customId.split('_')[2];
    const session = sessionManager.getSession(sessionId);

    if (!session || session.status === 'closed') {
      return interaction.reply({ content: '❌ Session tidak tersedia.', flags: 64 });
    }

    const modal = new ModalBuilder()
      .setCustomId(`username_form_${sessionId}`)
      .setTitle('📝 Form Pendaftaran');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('username')
          .setLabel('Username')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }

  // =========================================================================
  // SUBMIT REGISTRATION
  // =========================================================================
  static async handleRegistrationSubmit(interaction) {
    await interaction.deferReply({ flags: 64 });

    const sessionId = interaction.customId.split('_')[2];
    const session = sessionManager.getSession(sessionId);
    const username = interaction.fields.getTextInputValue('username');

    if (!session) {
      return interaction.editReply('❌ Session tidak ditemukan.');
    }

    // Allow admin roles
    const adminRoles = interaction.guild.roles.cache.filter(r =>
      r.permissions.has(PermissionFlagsBits.Administrator)
    );

    const overwrites = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles
        ]
      },
      {
        id: interaction.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ];

    adminRoles.forEach(role => {
      overwrites.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    });

    const payChannel = await interaction.guild.channels.create({
      name: `💳-pembayaran-${interaction.user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      parent: interaction.channel.parentId,
      permissionOverwrites: overwrites
    });

    const registration = sessionManager.addRegistration(sessionId, {
      userId: interaction.user.id,
      username,
      channelId: payChannel.id
    });

    const paymentEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('💳 PEMBAYARAN')
      .setDescription(
        `👤 User: ${interaction.user}\n` +
        `📋 Sesi: **${session.title}**\n` +
        `💰 Biaya: **${session.feeFormatted}**\n\n` +
        `📸 Upload bukti pembayaran (gambar)`
      )
      .setImage(config.PAYMENT.QRIS_IMAGE_URL)
      .setFooter({ text: `${registration.id} | ${config.BOT.NAME}` });

    await payChannel.send({ embeds: [paymentEmbed] });
    await interaction.editReply(`✅ Upload bukti pembayaran di ${payChannel}`);
  }

  // =========================================================================
  // HANDLE PAYMENT PROOF
  // =========================================================================
  static async handlePaymentProof(message) {
    if (!message.channel.name.startsWith('💳-pembayaran-')) return;
    if (message.author.bot) return;

    const image = message.attachments.find(a => a.contentType?.startsWith('image/'));
    if (!image) return;

    const registration = sessionManager.findRegistrationByChannel(message.channel.id);
    if (!registration) return;

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_registration_${registration.id}`)
        .setLabel('✅ KONFIRMASI')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_registration_${registration.id}`)
        .setLabel('❌ TOLAK')
        .setStyle(ButtonStyle.Danger)
    );

    await message.reply({
      content: '⏳ Menunggu verifikasi admin...',
      components: [buttons]
    });
  }

  // =========================================================================
  // CONFIRM / REJECT → MOVE TO ARCHIVE
  // =========================================================================
  static async archivePaymentChannel(interaction, status) {
    const delay = config.SESSION.PAYMENT_CHANNEL_DELETE_DELAY;

    await interaction.update({
      content: status === 'confirmed'
        ? '✅ PEMBAYARAN DIKONFIRMASI'
        : '❌ PEMBAYARAN DITOLAK',
      components: []
    });

    await interaction.channel.setParent(config.SESSION.PAYMENT_CHANNEL_ARCHIVE);

    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.id,
      { SendMessages: false }
    );

    await interaction.channel.send(
      `📦 **CHANNEL DIARSIPKAN**\n` +
      `Status: **${status.toUpperCase()}**`
    );

    Logger.success(`Payment channel archived: ${interaction.channel.name}`);
  }

  static async handleConfirmRegistration(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    const regId = interaction.customId.split('_')[2];
    sessionManager.updateRegistrationStatus(regId, 'confirmed', interaction.user.tag);
    await this.archivePaymentChannel(interaction, 'confirmed');
  }

  static async handleRejectRegistration(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    const regId = interaction.customId.split('_')[2];
    sessionManager.updateRegistrationStatus(regId, 'rejected', interaction.user.tag);
    await this.archivePaymentChannel(interaction, 'rejected');
  }

  // =========================================================================
  // CLOSE SESSION → AUTO DELETE CHANNEL
  // =========================================================================
  static async handleCloseSession(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', flags: 64 });
    }

    const delay = config.SESSION.SESSION_DELETE_DELAY;

    await interaction.reply({
      content: `🔒 Sesi ditutup. Channel akan dihapus dalam ${delay / 1000} detik.`,
      flags: 64
    });

    await interaction.channel.send(
      `🔒 **SESI DITUTUP**\nChannel akan dihapus otomatis.`
    );

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, delay);
  }
}

module.exports = SessionHandler;
