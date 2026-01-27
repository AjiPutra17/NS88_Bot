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
      return interaction.reply({
        content: '❌ **Error:** Hanya admin yang bisa membuka sesi pendaftaran!',
        flags: 64,
      });
    }

    await this.showSessionCreationModal(interaction);
  }

  // ==========================================================================
  // ADMIN: SESSION CREATION MODAL
  // ==========================================================================
  static async showSessionCreationModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('create_session_form')
      .setTitle('📋 Buat Sesi Pendaftaran Baru');

    const sessionNameInput = new TextInputBuilder()
      .setCustomId('session_name')
      .setLabel('Nama Sesi')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Sesi Belajar Discord Bot')
      .setRequired(true)
      .setMaxLength(100);

    const sessionFeeInput = new TextInputBuilder()
      .setCustomId('session_fee')
      .setLabel('Biaya Pendaftaran')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: 20000')
      .setRequired(true)
      .setMaxLength(20);

    modal.addComponents(
      new ActionRowBuilder().addComponents(sessionNameInput),
      new ActionRowBuilder().addComponents(sessionFeeInput),
    );

    await interaction.showModal(modal);
    Logger.info(`Session modal shown to ${interaction.user.tag}`);
  }

  // ==========================================================================
  // SESSION CREATION SUBMIT
  // ==========================================================================
  static async handleSessionCreationSubmit(interaction) {
    try {
      await interaction.deferReply({ flags: 64 });

      const sessionName = interaction.fields.getTextInputValue('session_name');
      const sessionFee = interaction.fields.getTextInputValue('session_fee');

      if (isNaN(sessionFee) || Number(sessionFee) < 0) {
        return interaction.editReply({
          content: '❌ **Error:** Biaya pendaftaran harus berupa angka valid!',
        });
      }

      const feeNumber = parseInt(sessionFee);
      const sessionChannel = await this.createSessionChannel(interaction, sessionName);

      if (!sessionChannel) {
        return interaction.editReply({
          content: '❌ **Error:** Gagal membuat channel sesi.',
        });
      }

      const session = sessionManager.createSession({
        title: sessionName,
        description: 'Silakan daftar sekarang!',
        date: new Date().toLocaleDateString('id-ID'),
        time: '-',
        maxSlots: 999,
        fee: feeNumber,
        feeFormatted: `Rp ${feeNumber.toLocaleString('id-ID')}`,
        creatorId: interaction.user.id,
        channelId: sessionChannel.id,
      });

      const embed = this.createSessionAnnounceEmbed(session);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`register_session_${session.id}`)
          .setLabel('📝 DAFTAR SEKARANG')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`close_session_${session.id}`)
          .setLabel('🔒 TUTUP SESI')
          .setStyle(ButtonStyle.Danger),
      );

      const msg = await sessionChannel.send({ embeds: [embed], components: [buttons] });
      sessionManager.updateSession(session.id, { messageId: msg.id });

      await interaction.editReply({
        content:
          `✅ **Sesi berhasil dibuat!**\n\n` +
          `📌 **ID:** ${session.id}\n` +
          `📋 **Nama:** ${session.title}\n` +
          `💰 **Biaya:** ${session.feeFormatted}\n` +
          `📝 **Channel:** ${sessionChannel}`,
      });

      Logger.success(`Session ${session.id} created by ${interaction.user.tag}`);
    } catch (err) {
      Logger.error('Session creation error', err);
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Terjadi kesalahan.' });
      }
    }
  }

  // ==========================================================================
  // CREATE SESSION CHANNEL
  // ==========================================================================
  static async createSessionChannel(interaction, title) {
    try {
      const cleanTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);

      return await interaction.guild.channels.create({
        name: `📋-${cleanTitle}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        topic: `Pendaftaran: ${title}`,
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
              PermissionFlagsBits.ManageMessages,
            ],
          },
        ],
      });
    } catch (err) {
      Logger.error('Create session channel failed', err);
      return null;
    }
  }

  // ==========================================================================
  // EMBEDS
  // ==========================================================================
  static createSessionAnnounceEmbed(session) {
    return new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎯 PENDAFTARAN DIBUKA')
      .setDescription(
        `**${session.title}**\n\n` +
        `💰 **Biaya:** ${session.feeFormatted}\n\n` +
        `Klik tombol di bawah untuk mendaftar.`,
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME}` })
      .setTimestamp();
  }

    // ==========================================================================
  // PAYMENT PROOF HANDLER (MESSAGE CREATE)
  // ==========================================================================
  static async handlePaymentProof(message) {
    try {
      // Hanya channel pembayaran
      if (!message.channel.name.startsWith('💳-pembayaran-')) return;

      // Harus ada attachment
      if (message.attachments.size === 0) return;

      // Cek apakah ada gambar
      const hasImage = message.attachments.some(att =>
        att.contentType?.startsWith('image/')
      );

      if (!hasImage) return;

      // Balas ke user
      await message.reply(
        `✅ **Bukti pembayaran diterima!**\n\n` +
        `Terima kasih ${message.author}.\n` +
        `Admin akan segera memverifikasi pembayaran Anda.`
      );

      // Notifikasi admin di channel
      await message.channel.send(
        `🔔 **Notifikasi Admin**\n\n` +
        `${message.author} telah mengirim bukti pembayaran.\n` +
        `⏱️ *${new Date().toLocaleTimeString('id-ID')}*`
      );

      Logger.success(
        `Payment proof received from ${message.author.tag} in ${message.channel.name}`
      );

    } catch (error) {
      Logger.error('Error handling payment proof', error);
    }
  }

}

module.exports = SessionHandler;
