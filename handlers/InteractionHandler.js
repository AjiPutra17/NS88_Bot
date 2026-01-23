// ============================================================================
// INTERACTION HANDLER
// ============================================================================

const {
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  ChannelType
} = require('discord.js');
const config = require('../config/config');
const EmbedFactory = require('../embeds/EmbedFactory');
const Utils = require('../utils');
const Logger = require('../utils/logger');
const { ticketManager } = require('../managers');
const TicketOperations = require('./TicketOperations');

class InteractionHandler {
  /**
   * Handle button interactions
   */
  static async handleButton(interaction) {
    const { customId } = interaction;

    try {
      if (customId === 'create_ticket') {
        await this.showTicketModal(interaction);
      } else if (customId === 'open_session_panel') {
        const SessionHandler = require('./SessionHandler');
        await SessionHandler.handleOpenSessionPanel(interaction);
      } else if (customId.startsWith('register_session_')) {
        const SessionHandler = require('./SessionHandler');
        await SessionHandler.handleRegisterButton(interaction);
      } else if (customId.startsWith('close_session_')) {
        const SessionHandler = require('./SessionHandler');
        await SessionHandler.handleCloseSession(interaction);
      } else if (customId.startsWith('confirm_registration_')) {
        const SessionHandler = require('./SessionHandler');
        await SessionHandler.handleConfirmRegistration(interaction);
      } else if (customId.startsWith('reject_registration_')) {
        const SessionHandler = require('./SessionHandler');
        await SessionHandler.handleRejectRegistration(interaction);
      } else if (customId.startsWith('add_buyer_')) {
        await this.showBuyerSelect(interaction);
      } else if (customId.startsWith('add_seller_')) {
        await this.showSellerSelect(interaction);
      } else if (customId.startsWith('complete_')) {
        await this.completeTicket(interaction);
      } else if (customId.startsWith('cancel_')) {
        await this.cancelTicket(interaction);
      }
    } catch (error) {
      Logger.error('Error handling button interaction', error);
      await this.sendErrorResponse(interaction, 'Terjadi kesalahan saat memproses button.');
    }
  }

  /**
   * Show ticket creation modal
   */
  static async showTicketModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('ticket_form')
      .setTitle('📝 Formulir ORDER REKBER/MC');

    const inputs = [
      { 
        id: 'buyer_username', 
        label: 'USERNAME DISCORD PEMBELI', 
        placeholder: 'Contoh: username#0000',
        style: TextInputStyle.Short
      },
      { 
        id: 'seller_username', 
        label: 'USERNAME DISCORD PENJUAL', 
        placeholder: 'Contoh: username#0000',
        style: TextInputStyle.Short
      },
      { 
        id: 'item', 
        label: 'BARANG/JASA YANG DITRANSAKSIKAN', 
        placeholder: 'Contoh: Akun Roblox Level 50 + 10K Robux',
        style: TextInputStyle.Short
      },
      { 
        id: 'nominal', 
        label: 'NOMINAL TRANSAKSI (angka saja)', 
        placeholder: 'Contoh: 50000 (tanpa titik atau koma)',
        style: TextInputStyle.Short
      },
      { 
        id: 'payment_method', 
        label: 'METODE PEMBAYARAN', 
        placeholder: 'Contoh: DANA, GoPay, OVO, Transfer BCA',
        style: TextInputStyle.Short
      }
    ];

    const rows = inputs.map(input => {
      const textInput = new TextInputBuilder()
        .setCustomId(input.id)
        .setLabel(input.label)
        .setStyle(input.style)
        .setPlaceholder(input.placeholder)
        .setRequired(true);
      return new ActionRowBuilder().addComponents(textInput);
    });

    modal.addComponents(...rows);
    await interaction.showModal(modal);
    Logger.info(`Ticket modal shown to ${interaction.user.tag}`);
  }

  /**
   * Show buyer selection menu
   */
  static async showBuyerSelect(interaction) {
    const ticketId = interaction.customId.split('_')[2];
    const ticket = ticketManager.get(ticketId);

    if (!ticket) {
      return interaction.reply({ 
        content: '❌ **Error:** Ticket tidak ditemukan!', 
        flags: 64 
      });
    }

    const userSelectMenu = new UserSelectMenuBuilder()
      .setCustomId(`select_buyer_${ticketId}`)
      .setPlaceholder('🔍 Pilih user untuk ditambahkan sebagai Buyer')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(userSelectMenu);

    await interaction.reply({
      content: '👤 **Pilih user sebagai Buyer:**\n💡 Gunakan search bar untuk mencari user dengan cepat!',
      components: [row],
      flags: 64
    });
  }

  /**
   * Show seller selection menu
   */
  static async showSellerSelect(interaction) {
    const ticketId = interaction.customId.split('_')[2];
    const ticket = ticketManager.get(ticketId);

    if (!ticket) {
      return interaction.reply({ 
        content: '❌ **Error:** Ticket tidak ditemukan!', 
        flags: 64 
      });
    }

    const userSelectMenu = new UserSelectMenuBuilder()
      .setCustomId(`select_seller_${ticketId}`)
      .setPlaceholder('🔍 Pilih user untuk ditambahkan sebagai Seller')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(userSelectMenu);

    await interaction.reply({
      content: '💼 **Pilih user sebagai Seller:**\n💡 Gunakan search bar untuk mencari user dengan cepat!',
      components: [row],
      flags: 64
    });
  }

  /**
   * Complete ticket
   */
  static async completeTicket(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ **Error:** Hanya Admin yang bisa menandai transaksi selesai!', 
        flags: 64
      });
    }

    const ticketId = interaction.customId.split('_')[1];
    const ticket = ticketManager.get(ticketId);

    if (!ticket) {
      return interaction.reply({ 
        content: '❌ **Error:** Ticket tidak ditemukan!', 
        flags: 64 
      });
    }

    await interaction.reply(`✅ **Transaksi ${ticketId} ditandai selesai oleh ${interaction.user.tag}!**`);
    await TicketOperations.updateStatus(ticketId, 'selesai', interaction.channel);
    await TicketOperations.archiveAndDelete(ticket, 'selesai', interaction.guild);
    
    Logger.success(`Ticket ${ticketId} completed by ${interaction.user.tag}`);
  }

  /**
   * Cancel ticket
   */
  static async cancelTicket(interaction) {
    const ticketId = interaction.customId.split('_')[1];
    const ticket = ticketManager.get(ticketId);

    if (!ticket) {
      return interaction.reply({ 
        content: '❌ **Error:** Ticket tidak ditemukan!', 
        flags: 64 
      });
    }

    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const isAllowedUser = ticket.allowedUsers && ticket.allowedUsers.includes(interaction.user.id);

    if (!isAdmin && !isAllowedUser) {
      return interaction.reply({ 
        content: '❌ **Error:** Hanya Admin, Buyer, atau Seller yang bisa membatalkan transaksi!', 
        flags: 64
      });
    }

    await interaction.reply(`❌ **Transaksi ${ticketId} dibatalkan oleh ${interaction.user.tag}!**`);
    await TicketOperations.updateStatus(ticketId, 'dibatalkan', interaction.channel);
    await TicketOperations.archiveAndDelete(ticket, 'dibatalkan', interaction.guild);
    
    Logger.warning(`Ticket ${ticketId} cancelled by ${interaction.user.tag}`);
  }

  /**
   * Handle user select menu
   */
  static async handleUserSelect(interaction) {
    const { customId, values } = interaction;

    try {
      if (customId.startsWith('select_buyer_')) {
        await this.addBuyer(interaction, values[0]);
      } else if (customId.startsWith('select_seller_')) {
        await this.addSeller(interaction, values[0]);
      }
    } catch (error) {
      Logger.error('Error handling user select', error);
      await interaction.update({
        content: '❌ **Error:** Terjadi kesalahan saat menambahkan user!',
        components: []
      });
    }
  }

  /**
   * Add buyer to ticket
   */
  static async addBuyer(interaction, userId) {
    const ticketId = interaction.customId.split('_')[2];
    const ticket = ticketManager.get(ticketId);

    if (!ticket) {
      return interaction.update({ 
        content: '❌ **Error:** Ticket tidak ditemukan!', 
        components: [] 
      });
    }

    try {
      const selectedUser = await TicketOperations.addUserToTicket(
        ticket, 
        userId, 
        interaction.guild, 
        'buyer'
      );

      await interaction.update({
        content: `✅ **${selectedUser.user.tag}** berhasil ditambahkan sebagai **Buyer**!`,
        components: []
      });
    } catch (error) {
      if (error.message === 'Cannot add bot as user') {
        await interaction.update({
          content: '❌ **Error:** Tidak bisa menambahkan bot sebagai Buyer!',
          components: []
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Add seller to ticket
   */
  static async addSeller(interaction, userId) {
    const ticketId = interaction.customId.split('_')[2];
    const ticket = ticketManager.get(ticketId);

    if (!ticket) {
      return interaction.update({ 
        content: '❌ **Error:** Ticket tidak ditemukan!', 
        components: [] 
      });
    }

    try {
      const selectedUser = await TicketOperations.addUserToTicket(
        ticket, 
        userId, 
        interaction.guild, 
        'seller'
      );

      await interaction.update({
        content: `✅ **${selectedUser.user.tag}** berhasil ditambahkan sebagai **Seller**!`,
        components: []
      });
    } catch (error) {
      if (error.message === 'Cannot add bot as user') {
        await interaction.update({
          content: '❌ **Error:** Tidak bisa menambahkan bot sebagai Seller!',
          components: []
        });
      } else {
        throw error;
      }
    }
  }

  static async handleModalSubmit(interaction) {
    if (interaction.customId === 'ticket_form') {
      await this.handleTicketModalSubmit(interaction);
    } else if (interaction.customId === 'create_session_form') {
      const SessionHandler = require('./SessionHandler');
      await SessionHandler.handleSessionCreationSubmit(interaction);
    } else if (interaction.customId.startsWith('registration_form_')) {
      const SessionHandler = require('./SessionHandler');
      await SessionHandler.handleRegistrationSubmit(interaction);
    }
  }

  /**
   * Handle ticket modal submit
   */
  static async handleTicketModalSubmit(interaction) {

    try {
      await interaction.deferReply({ flags: 64 });

      const buyer = interaction.fields.getTextInputValue('buyer_username');
      const seller = interaction.fields.getTextInputValue('seller_username');
      const item = interaction.fields.getTextInputValue('item');
      const nominalRaw = interaction.fields.getTextInputValue('nominal').replace(/\D/g, '');
      const nominal = parseInt(nominalRaw);
      const paymentMethod = interaction.fields.getTextInputValue('payment_method');

      // Validate nominal
      if (isNaN(nominal) || nominal < config.TICKET.MIN_NOMINAL) {
        return interaction.editReply({ 
          content: `❌ **Error:** Nominal tidak valid! Minimal ${Utils.formatRupiah(config.TICKET.MIN_NOMINAL)}` 
        });
      }

      // Calculate fee and total
      const fee = Utils.calculateFee(nominal);
      const total = nominal + fee;

      // Create ticket channel
      const ticketChannel = await this.createTicketChannel(interaction);

      if (!ticketChannel) {
        return interaction.editReply({ 
          content: '❌ **Error:** Gagal membuat channel ticket. Pastikan bot punya permission "Manage Channels".' 
        });
      }

      // Create ticket
      const ticket = ticketManager.create({
        buyer,
        seller,
        item,
        nominal,
        fee,
        total,
        paymentMethod,
        channelId: ticketChannel.id,
        creatorId: interaction.user.id,
        allowedUsers: [interaction.user.id]
      });

      // Send ticket embed
      const ticketEmbed = EmbedFactory.createTicketEmbed(ticket);
      const buttons = this.createTicketButtons(ticket.id);

      await ticketChannel.send({ embeds: [ticketEmbed], components: [buttons] });

      // Reply to user
      const successReply = await interaction.editReply({ 
        content: `✅ **Ticket berhasil dibuat!**\n📍 Silakan cek channel ${ticketChannel}` 
      });

      Utils.deleteMessageAfterDelay(successReply, 5000);
      Logger.success(`Ticket ${ticket.id} created by ${interaction.user.tag}`);

    } catch (error) {
      Logger.error('Error handling modal submit', error);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: `❌ **Error:** ${error.message || 'Terjadi kesalahan saat membuat ticket.'}` 
        });
      } else {
        await interaction.reply({ 
          content: '❌ **Error:** Terjadi kesalahan!', 
          flags: 64
        });
      }
    }
  }

  /**
   * Create ticket channel
   */
  static async createTicketChannel(interaction) {
    try {
      const client = interaction.client;
      
      const ticketChannel = await interaction.guild.channels.create({
        name: `${config.TICKET.CHANNEL_PREFIX}${ticketManager.counter}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        topic: `Ticket dibuat oleh ${interaction.user.tag}`,
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

      Logger.success(`Channel created: ${ticketChannel.name}`);
      return ticketChannel;
      
    } catch (error) {
      Logger.error('Error creating ticket channel', error);
      return null;
    }
  }

  /**
   * Create ticket action buttons
   */
  static createTicketButtons(ticketId) {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`add_buyer_${ticketId}`)
          .setLabel('Tambah Buyer')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👤'),
        new ButtonBuilder()
          .setCustomId(`add_seller_${ticketId}`)
          .setLabel('Tambah Seller')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💼'),
        new ButtonBuilder()
          .setCustomId(`complete_${ticketId}`)
          .setLabel('Selesai')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`cancel_${ticketId}`)
          .setLabel('Batalkan')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );
  }

  /**
   * Send error response
   */
  static async sendErrorResponse(interaction, message) {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: `❌ ${message}`, flags: 64 });
    } else {
      await interaction.reply({ content: `❌ ${message}`, flags: 64 });
    }
  }
}

module.exports = InteractionHandler;