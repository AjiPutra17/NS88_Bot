// ============================================================================
// PAYMENT PROOF HANDLER
// ============================================================================

const config = require('../config/config');
const EmbedFactory = require('../embeds/EmbedFactory');
const Utils = require('../utils');
const Logger = require('../utils/logger');

class PaymentProofHandler {
  /**
   * Handle payment proof detection
   * @param {Message} message - Discord message
   */
  static async handle(message) {
    // Check if in ticket channel
    if (!message.channel.name || !message.channel.name.startsWith(config.TICKET.CHANNEL_PREFIX)) {
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
    const adminUser = Utils.findUserByUsername(message.guild, config.ADMIN.USERNAME);

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
          `⚠️ *User "${config.ADMIN.USERNAME}" tidak ditemukan.*`
        );
        Logger.warning(`Specific admin not found, notified all admins`);
      }
    }
  }
}

module.exports = PaymentProofHandler;