// ============================================================================
// NS88 DISCORD BOT - REKBER/MC SYSTEM
// Version: 2.0.0
// Description: Professional Discord bot for managing middleman/escrow tickets
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
    VERSION: '2.0.0',
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
  /**
   * Calculate fee based on nominal amount
   * @param {number} nominal - Transaction amount
   * @returns {number} - Calculated fee
   */
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

  /**
   * Format number to Rupiah currency
   * @param {number} amount - Amount to format
   * @returns {string} - Formatted currency string
   */
  static formatRupiah(amount) {
    return `Rp ${parseInt(amount).toLocaleString('id-ID')}`;
  }

  /**
   * Format seconds to readable time string
   * @param {number} seconds - Total seconds
   * @returns {string} - Formatted time string
   */
  static formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes} menit ${secs} detik`;
    }
    return `${secs} detik`;
  }

  /**
   * Get fee structure as formatted string
   * @returns {string} - Formatted fee structure
   */
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

  /**
   * Check if user has specific role
   * @param {GuildMember} member - Discord guild member
   * @param {string} roleName - Role name to check
   * @returns {boolean}
   */
  static hasRole(member, roleName) {
    return member.roles.cache.some(role => role.name === roleName);
  }

  /**
   * Find user by username (case insensitive)
   * @param {Guild} guild - Discord guild
   * @param {string} username - Username to find
   * @returns {GuildMember|null}
   */
  static findUserByUsername(guild, username) {
    return guild.members.cache.find(member => 
      member.user.username.toLowerCase() === username.toLowerCase() && 
      !member.user.bot
    );
  }

  /**
   * Get all admin members
   * @param {Guild} guild - Discord guild
   * @returns {Collection<GuildMember>}
   */
  static getAdmins(guild) {
    return guild.members.cache.filter(member => 
      member.permissions.has(PermissionFlagsBits.Administrator) && 
      !member.user.bot
    );
  }

  /**
   * Safely delete a message after delay
   * @param {Message} message - Discord message
   * @param {number} delay - Delay in milliseconds
   */
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
  /**
   * Create setup/welcome embed
   * @returns {EmbedBuilder}
   */
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

  /**
   * Create ticket information embed
   * @param {Object} ticketData - Ticket data
   * @returns {EmbedBuilder}
   */
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
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**🏦 INFORMASI PEMBAYARAN QRIS**\n` +
        `📱 **Atas Nama:** ${CONFIG.PAYMENT.ACCOUNT_NAME}\n` +
        `🔍 **NMID:** ${CONFIG.PAYMENT.QRIS_NMID}\n` +
        `⚡ **SCAN QR CODE DIBAWAH UNTUK TRANSFER**`
      )
      .setImage(CONFIG.PAYMENT.QRIS_IMAGE_URL)
      .setFooter({ text: `${ticketData.id} | ${CONFIG.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create archive embed
   * @param {Object} ticket - Ticket data
   * @param {string} status - Status (selesai/dibatalkan)
   * @returns {EmbedBuilder}
   */
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

  /**
   * Create warning embed for rekber/mc
   * @returns {EmbedBuilder}
   */
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

  /**
   * Create payment proof received embed
   * @param {string} username - User who sent proof
   * @returns {EmbedBuilder}
   */
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

  /**
   * Create help embed
   * @returns {EmbedBuilder}
   */
  static createHelpEmbed() {
    return new EmbedBuilder()
      .setColor(CONFIG.COLORS.INFO)
      .setTitle(`📖 ${CONFIG.BOT.NAME} Commands`)
      .setDescription('Daftar command yang tersedia untuk bot ini:')
      .addFields(
        { 
          name: `${CONFIG.BOT.PREFIX}setup-ticket`, 
          value: '🎫 Setup sistem ticket (Admin only)\nMenampilkan panel untuk membuat ticket rekber/MC',
          inline: false
        },
        { 
          name: `${CONFIG.BOT.PREFIX}help`, 
          value: '📚 Tampilkan pesan bantuan ini\nMenampilkan semua command yang tersedia',
          inline: false
        },
        {
          name: '📊 Status Bot',
          value: `Version: ${CONFIG.BOT.VERSION}\nPrefix: ${CONFIG.BOT.PREFIX}`,
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
    if (error) {
      console.error(error);
    }
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
  /**
   * Archive ticket and delete channel
   * @param {Object} ticket - Ticket data
   * @param {string} status - Status (selesai/dibatalkan)
   * @param {Guild} guild - Discord guild
   */
  static async archiveAndDelete(ticket, status, guild) {
    try {
      // Send to archive channel
      if (CONFIG.CHANNELS.ARCHIVE) {
        const archiveChannel = await guild.channels.fetch(CONFIG.CHANNELS.ARCHIVE);
        
        if (archiveChannel) {
          const archiveEmbed = EmbedFactory.createArchiveEmbed(ticket, status);
          await archiveChannel.send({ embeds: [archiveEmbed] });
          Logger.success(`Ticket ${ticket.id} archived`);
        }
      }
      
      // Delete channel after delay
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
      
      // Remove from ticket manager
      ticketManager.delete(ticket.id);
      
    } catch (error) {
      Logger.error('Error in archiveAndDelete', error);
    }
  }

  /**
   * Add user to ticket channel
   * @param {Object} ticket - Ticket data
   * @param {string} userId - User ID to add
   * @param {Guild} guild - Discord guild
   * @param {string} role - Role (buyer/seller)
   */
  static async addUserToTicket(ticket, userId, guild, role = 'buyer') {
    try {
      const selectedUser = await guild.members.fetch(userId);
      
      if (selectedUser.user.bot) {
        throw new Error('Cannot add bot as user');
      }

      const ticketChannel = await guild.channels.fetch(ticket.channelId);
      
      // Set permissions
      await ticketChannel.permissionOverwrites.create(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true
      });

      // Add to allowed users
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

  /**
   * Update ticket status
   * @param {string} ticketId - Ticket ID
   * @param {string} status - New status
   * @param {Channel} channel - Discord channel
   */
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
  /**
   * Check and handle slowmode
   * @param {Message} message - Discord message
   * @returns {boolean} - True if message should be processed
   */
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
      // User sent message too quickly
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
    
    // Update last message time
    slowmodeManager.setLastMessageTime(userId, channelId);
    Logger.debug(`Message allowed from ${message.author.tag} (${isDonatur ? 'Donatur' : 'Non-Donatur'})`);
    
    return true;
  }
}

// ============================================================================
// WARNING HANDLER
// ============================================================================

class WarningHandler {
  /**
   * Handle auto-warning in specified channels
   * @param {Message} message - Discord message
   * @returns {boolean} - True if warning was sent
   */
  static async handle(message) {
    if (!CONFIG.CHANNELS.WARNING.includes(message.channel.id)) {
      return false;
    }

    try {
      // Delete old warning
      const lastWarningId = slowmodeManager.getWarningMessage(message.channel.id);
      if (lastWarningId) {
        try {
          const oldWarning = await message.channel.messages.fetch(lastWarningId);
          await oldWarning.delete();
        } catch (error) {
          Logger.debug('Old warning already deleted');
        }
      }

      // Send new warning
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
  /**
   * Handle payment proof detection
   * @param {Message} message - Discord message
   */
  static async handle(message) {
    // Check if in ticket channel
    if (!message.channel.name || !message.channel.name.startsWith(CONFIG.TICKET.CHANNEL_PREFIX)) {
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
      const replyEmbed = EmbedFactory.createPaymentProofEmbed(message.author.username);
      await message.reply({ embeds: [replyEmbed] });

      // Notify admin
      await this.notifyAdmin(message);
      
      Logger.success(`Payment proof received from ${message.author.tag} in ${message.channel.name}`);
      
    } catch (error) {
      Logger.error('Error handling payment proof', error);
    }
  }

  /**
   * Notify admin about payment proof
   * @param {Message} message - Discord message
   */
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
      // Fallback: notify all admins
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
  /**
   * Handle text commands
   * @param {Message} message - Discord message
   */
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

  /**
   * Setup ticket command
   * @param {Message} message - Discord message
   */
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

  /**
   * Show help command
   * @param {Message} message - Discord message
   */
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
  /**
   * Handle button interactions
   * @param {Interaction} interaction - Discord interaction
   */
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

  /**
   * Show ticket creation modal
   * @param {Interaction} interaction - Discord interaction
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
   * @param {Interaction} interaction - Discord interaction
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
   * @param {Interaction} interaction - Discord interaction
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
   * @param {Interaction} interaction - Discord interaction
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
   * @param {Interaction} interaction - Discord interaction
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
   * @param {Interaction} interaction - Discord interaction
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
   * @param {Interaction} interaction - Discord interaction
   * @param {string} userId - User ID
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
   * @param {Interaction} interaction - Discord interaction
   * @param {string} userId - User ID
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

  /**
   * Handle modal submit
   * @param {Interaction} interaction - Discord interaction
   */
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

      // Validate nominal
      if (isNaN(nominal) || nominal < CONFIG.TICKET.MIN_NOMINAL) {
        return interaction.editReply({ 
          content: `❌ **Error:** Nominal tidak valid! Minimal ${Utils.formatRupiah(CONFIG.TICKET.MIN_NOMINAL)}` 
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
   * @param {Interaction} interaction - Discord interaction
   * @returns {Channel|null}
   */
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

  /**
   * Create ticket action buttons
   * @param {string} ticketId - Ticket ID
   * @returns {ActionRowBuilder}
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
   * @param {Interaction} interaction - Discord interaction
   * @param {string} message - Error message
   */
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

// Bot ready event
client.once('clientReady', async (c) => {
  Logger.success(`Bot ${c.user.tag} is online!`);
  Logger.info(`Connected to ${c.guilds.cache.size} server(s)`);
  Logger.info(`Version: ${CONFIG.BOT.VERSION}`);
  
  // Set bot activity
  c.user.setActivity(CONFIG.BOT.ACTIVITY, { type: CONFIG.BOT.ACTIVITY_TYPE });
  
  // Auto-setup in designated channel
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

// Message create event
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  try {
    // Check slowmode
    const shouldProcess = await SlowmodeHandler.handle(message);
    if (!shouldProcess) return;

    // Auto-warning system
    const warningHandled = await WarningHandler.handle(message);
    if (warningHandled) return;

    // Payment proof detection
    await PaymentProofHandler.handle(message);

    // Command handling
    await CommandHandler.handle(message);

  } catch (error) {
    Logger.error('Error in messageCreate event', error);
  }
});

// Interaction create event
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

// Error handling
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