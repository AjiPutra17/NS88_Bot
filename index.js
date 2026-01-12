// ============================================================================
// NS88 DISCORD BOT - REKBER/MC & REACTION ROLE SYSTEM
// Version: 2.1.0
// Description: Professional Discord bot with middleman/escrow tickets & reaction roles
// Author: NS88 Development Team
// License: MIT
// ============================================================================

const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  UserSelectMenuBuilder,
  ActivityType
} = require('discord.js');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Bot Settings
  BOT: {
    NAME: 'NS88 BOT',
    VERSION: '2.1.0',
    ACTIVITY: 'Rekber/MC System',
    ACTIVITY_TYPE: ActivityType.Watching,
    PREFIX: '!'
  },

  // Channel IDs (from environment variables)
  CHANNELS: {
    SETUP: process.env.SETUP_CHANNEL_ID || null,
    ARCHIVE: process.env.ARCHIVE_CHANNEL_ID || null,
    TICKET: process.env.TICKET_CHANNEL || null,
    WARNING: (process.env.WARNING_CHANNEL_IDS || '').split(',').filter(Boolean)
  },

  // Admin Settings
  ADMIN: {
    USERNAME: process.env.ADMIN_USERNAME || 'crzdrn',
    ROLE_NAME: process.env.ADMIN_ROLE_NAME || 'Admin'
  },

  // Donatur/Booster Settings
  DONATUR: {
    ROLE_NAME: process.env.DONATUR_ROLE_NAME || 'Donatur NS88',
    SLOWMODE_SECONDS: parseInt(process.env.SLOWMODE_DONATUR) || 600,
  },

  // Non-Donatur Settings
  NON_DONATUR: {
    SLOWMODE_SECONDS: parseInt(process.env.SLOWMODE_NON_DONATUR) || 1800,
  },

  // Payment Information
  PAYMENT: {
    QRIS_IMAGE_URL: process.env.QRIS_IMAGE_URL || 'https://cdn.discordapp.com/attachments/1453015494650232842/1458349144963022910/1767753033603.png',
    QRIS_NMID: process.env.QRIS_NMID || 'ID1025461592426',
    ACCOUNT_NAME: process.env.PAYMENT_ACCOUNT_NAME || 'NONSTOP88, GAMER'
  },

  // Ticket Settings
  TICKET: {
    DELETE_DELAY_MS: 5000,
    MIN_NOMINAL: 1000,
    PREFIX: 'TICKET',
    CHANNEL_PREFIX: 'ticket-'
  },

  // Colors (Hex)
  COLORS: {
    PRIMARY: '#5865F2',
    SUCCESS: '#00FF00',
    DANGER: '#FF0000',
    WARNING: '#FFA500',
    INFO: '#00BFFF'
  },

  // Fee Structure (in IDR)
  FEE_STRUCTURE: [
    { min: 1000, max: 9000, fee: 2000 },
    { min: 10000, max: 49000, fee: 3000 },
    { min: 50000, max: 99000, fee: 4000 },
    { min: 100000, max: 150000, fee: 7000 },
    { min: 150000, max: 300000, fee: 10000 },
    { min: 300001, max: Infinity, percentage: 0.05 }
  ]
};

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// ============================================================================
// DATA STORAGE
// ============================================================================

class TicketManager {
  constructor() {
    this.tickets = new Map();
    this.counter = 1;
  }

  create(data) {
    const id = `${CONFIG.TICKET.PREFIX}-${this.counter++}`;
    const ticket = {
      id,
      ...data,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  get(id) {
    return this.tickets.get(id);
  }

  update(id, data) {
    const ticket = this.tickets.get(id);
    if (ticket) {
      Object.assign(ticket, data, { updatedAt: new Date() });
      this.tickets.set(id, ticket);
    }
    return ticket;
  }

  delete(id) {
    return this.tickets.delete(id);
  }

  getAll() {
    return Array.from(this.tickets.values());
  }
}

class SlowmodeManager {
  constructor() {
    this.userLastMessageTime = new Map();
    this.lastWarningMessages = new Map();
  }

  getKey(userId, channelId) {
    return `${userId}-${channelId}`;
  }

  setLastMessageTime(userId, channelId, time = Date.now()) {
    const key = this.getKey(userId, channelId);
    this.userLastMessageTime.set(key, time);
  }

  getLastMessageTime(userId, channelId) {
    const key = this.getKey(userId, channelId);
    return this.userLastMessageTime.get(key);
  }

  getRemainingTime(userId, channelId, duration) {
    const lastTime = this.getLastMessageTime(userId, channelId);
    if (!lastTime) return 0;
    
    const elapsed = (Date.now() - lastTime) / 1000;
    return Math.max(0, duration - elapsed);
  }

  setWarningMessage(channelId, messageId) {
    this.lastWarningMessages.set(channelId, messageId);
  }

  getWarningMessage(channelId) {
    return this.lastWarningMessages.get(channelId);
  }
}

const ticketManager = new TicketManager();
const slowmodeManager = new SlowmodeManager();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

class Utils {
  static calculateFee(nominal) {
    const amount = parseInt(nominal);
    
    for (const tier of CONFIG.FEE_STRUCTURE) {
      if (amount >= tier.min && amount <= tier.max) {
        return tier.percentage 
          ? Math.floor(amount * tier.percentage)
          : tier.fee;
      }
    }
    
    return 0;
  }

  static formatRupiah(amount) {
    return `Rp ${parseInt(amount).toLocaleString('id-ID')}`;
  }

  static formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes} menit ${secs} detik`;
    }
    return `${secs} detik`;
  }

  static getFeeStructureText() {
    let text = '';
    for (const tier of CONFIG.FEE_STRUCTURE) {
      if (tier.percentage) {
        text += `Nominal diatas ${this.formatRupiah(tier.min - 1)}, fee ${(tier.percentage * 100)}% dari nominal transaksi.\n`;
      } else {
        text += `${this.formatRupiah(tier.min)} — ${this.formatRupiah(tier.max)} : ${this.formatRupiah(tier.fee)}\n`;
      }
    }
    return text;
  }

  static hasRole(member, roleName) {
    return member.roles.cache.some(role => role.name === roleName);
  }

  static findUserByUsername(guild, username) {
    return guild.members.cache.find(member => 
      member.user.username.toLowerCase() === username.toLowerCase() && 
      !member.user.bot
    );
  }

  static getAdmins(guild) {
    return guild.members.cache.filter(member => 
      member.permissions.has(PermissionFlagsBits.Administrator) && 
      !member.user.bot
    );
  }

  static async deleteMessageAfterDelay(message, delay = 5000) {
    setTimeout(async () => {
      try {
        await message.delete();
      } catch (error) {
        Logger.debug('Message already deleted or no permission');
      }
    }, delay);
  }
}

// ============================================================================
// EMBED BUILDERS
// ============================================================================

class EmbedFactory {
  static createSetupEmbed() {
    return new EmbedBuilder()
      .setColor(CONFIG.COLORS.PRIMARY)
      .setTitle('🎫 Welcome To Ticket Section')
      .setDescription('Silakan pilih dibawah sesuai kebutuhanmu.')
      .addFields({
        name: '📋 LIST FEE MC BACA YA!',
        value: '```\n' + Utils.getFeeStructureText() + '```'
      })
      .setFooter({ text: `${CONFIG.BOT.NAME} 🤖 v${CONFIG.BOT.VERSION}` })
      .setTimestamp();
  }

  static createTicketEmbed(ticketData) {
    return new EmbedBuilder()
      .setColor(CONFIG.COLORS.WARNING)
      .setTitle('🎫 ORDER REKBER/MC - PENDING')
      .setDescription(
        `**📝 Detail Transaksi:**\n` +
        `🛒 **Barang:** ${ticketData.item}\n\n` +
        `👤 **Pembeli:** ${ticketData.buyer}\n` +
        `💼 **Penjual:** ${ticketData.seller}\n\n` +
        `💰 **Nominal:** ${Utils.formatRupiah(ticketData.nominal)}\n` +
        `💵 **Fee Jasa MC:** ${Utils.formatRupiah(ticketData.fee)}\n` +
        `💳 **Total Pembayaran:** ${Utils.formatRupiah(ticketData.total)}\n\n` +
        `💳 **Metode Pembayaran:** ${ticketData.paymentMethod}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🏦 INFORMASI PEMBAYARAN QRIS**\n` +
        `📱 **Atas Nama:** ${CONFIG.PAYMENT.ACCOUNT_NAME}\n` +
        `📍 **NMID:** ${CONFIG.PAYMENT.QRIS_NMID}\n` +
        `⚡ **SCAN QR CODE DIBAWAH UNTUK TRANSFER**`
      )
      .setImage(CONFIG.PAYMENT.QRIS_IMAGE_URL)
      .setFooter({ text: `${ticketData.id} | ${CONFIG.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  static createArchiveEmbed(ticket, status) {
    const isCompleted = status === 'selesai';
    const color = isCompleted ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.DANGER;
    const emoji = isCompleted ? '✅' : '❌';
    const statusText = isCompleted ? 'SELESAI' : 'DIBATALKAN';
    
    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} ARSIP TICKET - ${statusText}`)
      .setDescription(
        `**${ticket.id}**\n\n` +
        `**📝 Detail Transaksi:**\n` +
        `🛒 **Barang:** ${ticket.item}\n\n` +
        `👤 **Pembeli:** ${ticket.buyer}\n` +
        `💼 **Penjual:** ${ticket.seller}\n\n` +
        `💰 **Nominal:** ${Utils.formatRupiah(ticket.nominal)}\n` +
        `💵 **Fee Jasa MC:** ${Utils.formatRupiah(ticket.fee)}\n` +
        `💳 **Total Pembayaran:** ${Utils.formatRupiah(ticket.total)}\n\n` +
        `💳 **Metode Pembayaran:** ${ticket.paymentMethod}\n` +
        `📅 **Dibuat:** ${ticket.createdAt.toLocaleString('id-ID')}\n` +
        `🏁 **Status:** ${statusText}`
      )
      .setFooter({ text: `${CONFIG.BOT.NAME} 🤖 - Arsip Ticket` })
      .setTimestamp();
  }

  static createWarningEmbed() {
    return new EmbedBuilder()
      .setColor(CONFIG.COLORS.DANGER)
      .setTitle('⚠️ PERINGATAN: Gunakan Rekber/MC Resmi!')
      .setDescription(
        `**🔒 Jangan lupa menggunakan rekber/mc/mm di** <#${CONFIG.CHANNELS.TICKET}> **agar tidak terkena scam!**\n\n` +
        `⚠️ **PENTING:**\n` +
        `• Gunakan layanan rekber/MC resmi untuk keamanan transaksi\n` +
        `• Hati-hati dengan penipuan dan modus-modus baru!\n` +
        `• Laporkan aktivitas mencurigakan kepada admin\n` +
        `• Jangan transfer sebelum menggunakan layanan MC\n\n` +
        `💡 **Tips Aman Bertransaksi:**\n` +
        `• ✅ Selalu gunakan middleman/rekber resmi\n` +
        `• ✅ Jangan percaya janji-janji yang terlalu bagus\n` +
        `• ✅ Verifikasi identitas penjual/pembeli\n` +
        `• ✅ Simpan semua bukti transaksi\n` +
        `• ✅ Baca terms & conditions dengan teliti`
      )
      .setFooter({ text: `${CONFIG.BOT.NAME} 🤖 - Auto Warning System` })
      .setTimestamp();
  }

  static createPaymentProofEmbed(username) {
    return new EmbedBuilder()
      .setColor(CONFIG.COLORS.SUCCESS)
      .setTitle('✅ Bukti Pembayaran Diterima')
      .setDescription(
        `Terima kasih **${username}**!\n\n` +
        `✅ Bukti pembayaran Anda telah kami terima.\n` +
        `👨‍💼 Admin/MC akan segera mengecek dan memverifikasi pembayaran Anda.\n\n` +
        `⏳ Mohon tunggu sebentar...\n\n` +
        `💡 **Note:** Proses verifikasi biasanya memakan waktu 5-15 menit.`
      )
      .setFooter({ text: `${CONFIG.BOT.NAME} 🤖 - Auto Response` })
      .setTimestamp();
  }

  static createHelpEmbed() {
    return new EmbedBuilder()
      .setColor(CONFIG.COLORS.INFO)
      .setTitle(`📖 ${CONFIG.BOT.NAME} Commands`)
      .setDescription('Daftar command yang tersedia untuk bot ini:')
      .addFields(
        { 
          name: '🎫 TICKET SYSTEM', 
          value: `\`${CONFIG.BOT.PREFIX}setup-ticket\` - Setup panel ticket (Admin)\n` +
                 `Menampilkan panel untuk membuat ticket rekber/MC`,
          inline: false
        },
        { 
          name: '📚 GENERAL', 
          value: `\`${CONFIG.BOT.PREFIX}help\` - Tampilkan pesan bantuan ini`,
          inline: false
        },
        {
          name: '📊 STATUS',
          value: `Version: ${CONFIG.BOT.VERSION} | Prefix: ${CONFIG.BOT.PREFIX}`,
          inline: false
        }
      )
      .setFooter({ text: `${CONFIG.BOT.NAME} 🤖 v${CONFIG.BOT.VERSION}` })
      .setTimestamp();
  }
}

// ============================================================================
// LOGGER
// ============================================================================

class Logger {
  static log(message, type = 'INFO') {
    const timestamp = new Date().toLocaleString('id-ID');
    const prefix = {
      'INFO': '✅',
      'ERROR': '❌',
      'WARNING': '⚠️',
      'DEBUG': '🔍',
      'SUCCESS': '🎉'
    }[type] || '📝';
    
    console.log(`[${timestamp}] ${prefix} [${type}] ${message}`);
  }

  static info(message) {
    this.log(message, 'INFO');
  }

  static error(message, error = null) {
    this.log(message, 'ERROR');
    if (error) console.error(error);
  }

  static warning(message) {
    this.log(message, 'WARNING');
  }

  static debug(message) {
    this.log(message, 'DEBUG');
  }

  static success(message) {
    this.log(message, 'SUCCESS');
  }
}

// ============================================================================
// TICKET OPERATIONS
// ============================================================================

class TicketOperations {
  static async archiveAndDelete(ticket, status, guild) {
    try {
      if (CONFIG.CHANNELS.ARCHIVE) {
        const archiveChannel = await guild.channels.fetch(CONFIG.CHANNELS.ARCHIVE);
        
        if (archiveChannel) {
          const archiveEmbed = EmbedFactory.createArchiveEmbed(ticket, status);
          await archiveChannel.send({ embeds: [archiveEmbed] });
          Logger.success(`Ticket ${ticket.id} archived`);
        }
      }
      
      const ticketChannel = await guild.channels.fetch(ticket.channelId);
      if (ticketChannel) {
        await ticketChannel.send(`⏳ Channel ini akan dihapus dalam ${CONFIG.TICKET.DELETE_DELAY_MS / 1000} detik...`);
        
        setTimeout(async () => {
          try {
            await ticketChannel.delete();
            Logger.success(`Channel ${ticketChannel.name} deleted`);
          } catch (error) {
            Logger.error('Failed to delete channel', error);
          }
        }, CONFIG.TICKET.DELETE_DELAY_MS);
      }
      
      ticketManager.delete(ticket.id);
      
    } catch (error) {
      Logger.error('Error in archiveAndDelete', error);
    }
  }

  static async addUserToTicket(ticket, userId, guild, role = 'buyer') {
    try {
      const selectedUser = await guild.members.fetch(userId);
      
      if (selectedUser.user.bot) {
        throw new Error('Cannot add bot as user');
      }

      const ticketChannel = await guild.channels.fetch(ticket.channelId);
      
      await ticketChannel.permissionOverwrites.create(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true
      });

      if (!ticket.allowedUsers.includes(userId)) {
        ticket.allowedUsers.push(userId);
        ticketManager.update(ticket.id, { allowedUsers: ticket.allowedUsers });
      }

      const roleEmoji = role === 'buyer' ? '👤' : '💼';
      const roleText = role === 'buyer' ? 'Buyer' : 'Seller';
      
      await ticketChannel.send(
        `${roleEmoji} **${selectedUser.user.tag}** telah ditambahkan sebagai **${roleText}**`
      );

      Logger.success(`User ${selectedUser.user.tag} added as ${roleText} to ${ticket.id}`);
      
      return selectedUser;
      
    } catch (error) {
      Logger.error('Error adding user to ticket', error);
      throw error;
    }
  }

  static async updateStatus(ticketId, status, channel) {
    try {
      const ticket = ticketManager.get(ticketId);
      if (!ticket) return;

      ticketManager.update(ticketId, { status });

      const messages = await channel.messages.fetch({ limit: 10 });
      const ticketMessage = messages.find(m => 
        m.embeds[0]?.footer?.text?.includes(ticketId)
      );
      
      if (ticketMessage) {
        const isCompleted = status === 'selesai';
        const color = isCompleted ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.DANGER;
        const title = isCompleted ? '✅ ORDER REKBER/MC - SELESAI' : '❌ ORDER REKBER/MC - DIBATALKAN';
        
        const updatedEmbed = EmbedBuilder.from(ticketMessage.embeds[0])
          .setColor(color)
          .setTitle(title);
          
        await ticketMessage.edit({ embeds: [updatedEmbed], components: [] });
        Logger.success(`Ticket ${ticketId} status updated to ${status}`);
      }
    } catch (error) {
      Logger.error('Error updating ticket status', error);
    }
  }
}

// ============================================================================
// SLOWMODE HANDLER
// ============================================================================

class SlowmodeHandler {
  static async handle(message) {
    if (!CONFIG.CHANNELS.WARNING.includes(message.channel.id)) {
      return true;
    }

    const userId = message.author.id;
    const channelId = message.channel.id;
    
    const isDonatur = Utils.hasRole(message.member, CONFIG.DONATUR.ROLE_NAME);
    const slowmodeDuration = isDonatur 
      ? CONFIG.DONATUR.SLOWMODE_SECONDS 
      : CONFIG.NON_DONATUR.SLOWMODE_SECONDS;
    
    const remainingTime = slowmodeManager.getRemainingTime(userId, channelId, slowmodeDuration);
    
    if (remainingTime > 0) {
      try {
        await message.delete();
      } catch (error) {
        Logger.debug('Cannot delete user message - missing permissions');
      }
      
      const timeString = Utils.formatTime(remainingTime);
      const slowmodeWarning = await message.channel.send(
        `${message.author} **⏰ Slowmode aktif:** tunggu **${timeString}** sebelum kirim pesan lagi!\n` +
        `💡 Boost server untuk cooldown lebih cepat **(${CONFIG.DONATUR.SLOWMODE_SECONDS} detik)**!`
      );
      
      Utils.deleteMessageAfterDelay(slowmodeWarning, 5000);
      Logger.info(`Slowmode: ${message.author.tag} too fast in ${message.channel.name}`);
      
      return false;
    }
    
    slowmodeManager.setLastMessageTime(userId, channelId);
    Logger.debug(`Message allowed from ${message.author.tag} (${isDonatur ? 'Donatur' : 'Non-Donatur'})`);
    
    return true;
  }
}

// ============================================================================
// WARNING HANDLER
// ============================================================================

class WarningHandler {
  static async handle(message) {
    if (!CONFIG.CHANNELS.WARNING.includes(message.channel.id)) {
      return false;
    }

    try {
      const lastWarningId = slowmodeManager.getWarningMessage(message.channel.id);
      if (lastWarningId) {
        try {
          const oldWarning = await message.channel.messages.fetch(lastWarningId);
          await oldWarning.delete();
        } catch (error) {
          Logger.debug('Old warning already deleted');
        }
      }

      const warningEmbed = EmbedFactory.createWarningEmbed();
      const warningMessage = await message.channel.send({ embeds: [warningEmbed] });
      
      slowmodeManager.setWarningMessage(message.channel.id, warningMessage.id);
      Logger.info(`Auto-warning sent in ${message.channel.name}`);
      
      return true;
    } catch (error) {
      Logger.error('Error in warning handler', error);
      return false;
    }
  }
}

// ============================================================================
// PAYMENT PROOF HANDLER
// ============================================================================

class PaymentProofHandler {
  static async handle(message) {
    if (!message.channel.name || !message.channel.name.startsWith(CONFIG.TICKET.CHANNEL_PREFIX)) {
      return;
    }

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
      const replyEmbed = EmbedFactory.createPaymentProofEmbed(message.author.username);
      await message.reply({ embeds: [replyEmbed] });

      await this.notifyAdmin(message);
      
      Logger.success(`Payment proof received from ${message.author.tag} in ${message.channel.name}`);
      
    } catch (error) {
      Logger.error('Error handling payment proof', error);
    }
  }

  static async notifyAdmin(message) {
    const adminUser = Utils.findUserByUsername(message.guild, CONFIG.ADMIN.USERNAME);

    if (adminUser) {
      await message.channel.send(
        `🔔 **Notifikasi untuk ${adminUser}:**\n\n` +
        `${message.author} telah mengirim **bukti pembayaran**. Mohon segera dicek dan diverifikasi!\n` +
        `⏱️ *Waktu: ${new Date().toLocaleTimeString('id-ID')}*`
      );
      Logger.info(`Admin ${adminUser.user.tag} notified`);
    } else {
      const admins = Utils.getAdmins(message.guild);

      if (admins.size > 0) {
        const adminMentions = admins.map(admin => admin.user).join(' ');
        await message.channel.send(
          `🔔 **Notifikasi untuk Admin:**\n${adminMentions}\n\n` +
          `${message.author} telah mengirim **bukti pembayaran**. Mohon segera dicek dan diverifikasi!\n` +
          `⚠️ *User "${CONFIG.ADMIN.USERNAME}" tidak ditemukan.*`
        );
        Logger.warning(`Specific admin not found, notified all admins`);
      }
    }
  }
}

// ============================================================================
// COMMAND HANDLER
// ============================================================================

class CommandHandler {
  static async handle(message) {
    if (!message.content.startsWith(CONFIG.BOT.PREFIX)) {
      return;
    }

    const args = message.content.slice(CONFIG.BOT.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    switch (command) {
      case 'setup-ticket':
        await this.setupTicket(message);
        break;
      case 'help':
        await this.showHelp(message);
        break;
      default:
        break;
    }
  }

  static async setupTicket(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ **Error:** Hanya admin yang bisa menggunakan command ini!');
    }

    const embed = EmbedFactory.createSetupEmbed();
    const button = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('ORDER REKBER/MC')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

    await message.channel.send({ embeds: [embed], components: [button] });
    message.delete().catch(() => {});
    Logger.success(`Setup ticket executed by ${message.author.tag}`);
  }

  static async showHelp(message) {
    const helpEmbed = EmbedFactory.createHelpEmbed();
    await message.reply({ embeds: [helpEmbed] });
    Logger.info(`Help command used by ${message.author.tag}`);
  }
}

// ============================================================================
// INTERACTION HANDLER
// ============================================================================

class InteractionHandler {
  static async handleButton(interaction) {
    const { customId } = interaction;

    try {
      if (customId === 'create_ticket') {
        await this.showTicketModal(interaction);
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
    if (interaction.customId !== 'ticket_form') {
      return;
    }

    try {
      await interaction.deferReply({ flags: 64 });

      const buyer = interaction.fields.getTextInputValue('buyer_username');
      const seller = interaction.fields.getTextInputValue('seller_username');
      const item = interaction.fields.getTextInputValue('item');
      const nominalRaw = interaction.fields.getTextInputValue('nominal').replace(/\D/g, '');
      const nominal = parseInt(nominalRaw);
      const paymentMethod = interaction.fields.getTextInputValue('payment_method');

      if (isNaN(nominal) || nominal < CONFIG.TICKET.MIN_NOMINAL) {
        return interaction.editReply({ 
          content: `❌ **Error:** Nominal tidak valid! Minimal ${Utils.formatRupiah(CONFIG.TICKET.MIN_NOMINAL)}` 
        });
      }

      const fee = Utils.calculateFee(nominal);
      const total = nominal + fee;

      const ticketChannel = await this.createTicketChannel(interaction);

      if (!ticketChannel) {
        return interaction.editReply({ 
          content: '❌ **Error:** Gagal membuat channel ticket. Pastikan bot punya permission "Manage Channels".' 
        });
      }

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

      const ticketEmbed = EmbedFactory.createTicketEmbed(ticket);
      const buttons = this.createTicketButtons(ticket.id);

      await ticketChannel.send({ embeds: [ticketEmbed], components: [buttons] });

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

  static async createTicketChannel(interaction) {
    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: `${CONFIG.TICKET.CHANNEL_PREFIX}${ticketManager.counter}`,
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

  static async sendErrorResponse(interaction, message) {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: `❌ ${message}`, flags: 64 });
    } else {
      await interaction.reply({ content: `❌ ${message}`, flags: 64 });
    }
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

client.once('ready', async (c) => {
  Logger.success(`Bot ${c.user.tag} is online!`);
  Logger.info(`Connected to ${c.guilds.cache.size} server(s)`);
  Logger.info(`Version: ${CONFIG.BOT.VERSION}`);
  
  c.user.setActivity(CONFIG.BOT.ACTIVITY, { type: CONFIG.BOT.ACTIVITY_TYPE });
  
  if (CONFIG.CHANNELS.SETUP) {
    try {
      const channel = await c.channels.fetch(CONFIG.CHANNELS.SETUP);
      
      if (channel) {
        const embed = EmbedFactory.createSetupEmbed();
        const button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('create_ticket')
              .setLabel('ORDER REKBER/MC')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🎫')
          );

        await channel.send({ embeds: [embed], components: [button] });
        Logger.success(`Setup message sent to: ${channel.name}`);
      }
    } catch (error) {
      Logger.error('Failed to send setup message', error);
    }
  } else {
    Logger.warning('SETUP_CHANNEL_ID not configured');
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {
    const shouldProcess = await SlowmodeHandler.handle(message);
    if (!shouldProcess) return;

    const warningHandled = await WarningHandler.handle(message);
    if (warningHandled) return;

    await PaymentProofHandler.handle(message);
    await CommandHandler.handle(message);

  } catch (error) {
    Logger.error('Error in messageCreate event', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      await InteractionHandler.handleButton(interaction);
    } else if (interaction.isUserSelectMenu()) {
      await InteractionHandler.handleUserSelect(interaction);
    } else if (interaction.isModalSubmit()) {
      await InteractionHandler.handleModalSubmit(interaction);
    }
  } catch (error) {
    Logger.error('Error in interactionCreate event', error);
    
    const errorMessage = '❌ Terjadi kesalahan! Silakan coba lagi atau hubungi admin.';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, flags: 64 });
    } else {
      await interaction.reply({ content: errorMessage, flags: 64 });
    }
  }
});

// ============================================================================
// MEMBER JOIN EVENT (AUTO WELCOME WITH REACTION ROLES)
// ============================================================================

client.on('guildMemberAdd', async (member) => {
  try {
    Logger.info(`New member joined: ${member.user.tag} in ${member.guild.name}`);
    
    // Check if welcome channel is configured
    if (!CONFIG.CHANNELS.WELCOME) {
      Logger.warning('WELCOME_CHANNEL_ID not configured, skipping welcome message');
      // Still send DM even if no welcome channel
    } else {
      const welcomeChannel = await member.guild.channels.fetch(CONFIG.CHANNELS.WELCOME).catch(() => null);
      
      if (welcomeChannel) {
        // Simple welcome message in channel
        await welcomeChannel.send(
          `🎉 ${member} **bergabung dengan server!** Selamat datang di **${member.guild.name}**! 🎊`
        );
      }
    }
    
    // Send DM to new member with onboarding instructions
    try {
      const serverName = member.guild.name;
      
      await member.send(
        `🎉 **Selamat datang di ${serverName}!**\n\n` +
        `Hai ${member.user.username}! Terima kasih sudah bergabung dengan kami.\n\n` +
        `📝 **Jangan lupa:**\n` +
        `• Pilih topik minatmu di channel welcome dengan react emoji\n` +
        `• Baca rules dan peraturan server\n` +
        `• Kenalan dengan member lainnya!\n\n` +
        `Selamat menikmati server kami! 🎊`
      );
      
      Logger.success(`Welcome DM sent to ${member.user.tag}`);
    } catch (error) {
      Logger.debug(`Could not send DM to ${member.user.tag} - DMs might be closed`);
    }
    
    Logger.success(`Welcome process completed for ${member.user.tag}`);
    
  } catch (error) {
    Logger.error('Error in guildMemberAdd event', error);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }

    const messageId = reaction.message.id;
    const emoji = reaction.emoji.name || reaction.emoji.id;
    
    const roleId = reactionRoleManager.get(messageId, emoji);
    
    if (!roleId) return;

    const member = await reaction.message.guild.members.fetch(user.id);
    const role = reaction.message.guild.roles.cache.get(roleId);

    if (!role) {
      Logger.warning(`Role ${roleId} not found for reaction role`);
      return;
    }

    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(roleId);
      Logger.success(`Added role ${role.name} to ${user.tag} via reaction`);
      
      // Welcome DM with topic selection
      try {
        const emojiMap = {
          '🏆': 'Kompe Leaderboard',
          '⏱️': 'Kompe Best Time',
          '🎮': 'Nonstop Mancing',
          '💎': 'PvP Mining',
          '🗺️': 'Game Explorer'
        };
        
        const topicName = emojiMap[emoji] || role.name;
        
        await user.send(
          `✅ **Selamat! Role berhasil ditambahkan**\n\n` +
          `${emoji} Kamu sekarang adalah bagian dari **${topicName}**!\n` +
          `📍 Server: **${reaction.message.guild.name}**\n\n` +
          `🎉 Selamat bergabung dan nikmati konten yang sesuai dengan minatmu!`
        );
      } catch (error) {
        Logger.debug(`Could not send DM to ${user.tag}`);
      }
    }

  } catch (error) {
    Logger.error('Error in messageReactionAdd event', error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }

    const messageId = reaction.message.id;
    const emoji = reaction.emoji.name || reaction.emoji.id;
    
    const roleId = reactionRoleManager.get(messageId, emoji);
    
    if (!roleId) return;

    const member = await reaction.message.guild.members.fetch(user.id);
    const role = reaction.message.guild.roles.cache.get(roleId);

    if (!role) {
      Logger.warning(`Role ${roleId} not found for reaction role`);
      return;
    }

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      Logger.success(`Removed role ${role.name} from ${user.tag} via reaction`);
      
      try {
        const emojiMap = {
          '🏆': 'Kompe Leaderboard',
          '⏱️': 'Kompe Best Time',
          '🎮': 'Nonstop Mancing',
          '💎': 'PvP Mining',
          '🗺️': 'Game Explorer'
        };
        
        const topicName = emojiMap[emoji] || role.name;
        
        await user.send(
          `➖ **Role berhasil dihapus**\n\n` +
          `${emoji} Role **${topicName}** telah dihapus dari akunmu\n` +
          `📍 Server: **${reaction.message.guild.name}**\n\n` +
          `💡 Kamu bisa pilih lagi kapan saja dengan react emoji yang sama!`
        );
      } catch (error) {
        Logger.debug(`Could not send DM to ${user.tag}`);
      }
    }

  } catch (error) {
    Logger.error('Error in messageReactionRemove event', error);
  }
});

client.on('error', error => {
  Logger.error('Discord client error', error);
});

process.on('unhandledRejection', error => {
  Logger.error('Unhandled promise rejection', error);
});

process.on('uncaughtException', error => {
  Logger.error('Uncaught exception', error);
  process.exit(1);
});

// ============================================================================
// BOT LOGIN
// ============================================================================

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  Logger.error('Bot token not found! Please set TOKEN or DISCORD_TOKEN environment variable.');
  process.exit(1);
}

client.login(TOKEN)
  .then(() => {
    Logger.success('Bot login successful!');
  })
  .catch(error => {
    Logger.error('Failed to login', error);
    process.exit(1);
  });

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGINT', async () => {
  Logger.info('Shutting down bot...');
  await client.destroy();
  Logger.success('Bot shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.info('Shutting down bot...');
  await client.destroy();
  Logger.success('Bot shutdown complete');
  process.exit(0);
});