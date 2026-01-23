// ============================================================================
// EMBED FACTORY
// ============================================================================

const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Utils = require('../utils');

class EmbedFactory {
  /**
   * Create setup/welcome embed
   */
  static createSetupEmbed() {
    return new EmbedBuilder()
      .setColor(config.COLORS.PRIMARY)
      .setTitle('🎫 Welcome To Ticket Section')
      .setDescription('Silakan pilih dibawah sesuai kebutuhanmu.')
      .addFields({
        name: '📋 LIST FEE MC BACA YA!',
        value: '```\n' + Utils.getFeeStructureText() + '```'
      })
      .setFooter({ text: `${config.BOT.NAME} 🤖 v${config.BOT.VERSION}` })
      .setTimestamp();
  }

  /**
   * Create ticket information embed
   */
  static createTicketEmbed(ticketData) {
    return new EmbedBuilder()
      .setColor(config.COLORS.WARNING)
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
        `📱 **Atas Nama:** ${config.PAYMENT.ACCOUNT_NAME}\n` +
        `📍 **NMID:** ${config.PAYMENT.QRIS_NMID}\n` +
        `⚡ **SCAN QR CODE DIBAWAH UNTUK TRANSFER**`
      )
      .setImage(config.PAYMENT.QRIS_IMAGE_URL)
      .setFooter({ text: `${ticketData.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create archive embed
   */
  static createArchiveEmbed(ticket, status) {
    const isCompleted = status === 'selesai';
    const color = isCompleted ? config.COLORS.SUCCESS : config.COLORS.DANGER;
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
      .setFooter({ text: `${config.BOT.NAME} 🤖 - Arsip Ticket` })
      .setTimestamp();
  }

  /**
   * Create warning embed for rekber/mc
   */
  static createWarningEmbed() {
    return new EmbedBuilder()
      .setColor(config.COLORS.DANGER)
      .setTitle('⚠️ PERINGATAN: Gunakan Rekber/MC Resmi!')
      .setDescription(
        `**🔒 Jangan lupa menggunakan rekber/mc/mm di** <#${config.CHANNELS.TICKET}> **agar tidak terkena scam!**\n\n` +
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
      .setFooter({ text: `${config.BOT.NAME} 🤖 - Auto Warning System` })
      .setTimestamp();
  }

  /**
   * Create payment proof received embed
   */
  static createPaymentProofEmbed(username) {
    return new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setTitle('✅ Bukti Pembayaran Diterima')
      .setDescription(
        `Terima kasih **${username}**!\n\n` +
        `✅ Bukti pembayaran Anda telah kami terima.\n` +
        `👨‍💼 Admin/MC akan segera mengecek dan memverifikasi pembayaran Anda.\n\n` +
        `⏳ Mohon tunggu sebentar...\n\n` +
        `💡 **Note:** Proses verifikasi biasanya memakan waktu 5-15 menit.`
      )
      .setFooter({ text: `${config.BOT.NAME} 🤖 - Auto Response` })
      .setTimestamp();
  }

  /**
   * Create help embed
   */
  static createHelpEmbed() {
    return new EmbedBuilder()
      .setColor(config.COLORS.INFO)
      .setTitle(`📖 ${config.BOT.NAME} Commands`)
      .setDescription('Daftar command yang tersedia untuk bot ini:')
      .addFields(
        { 
          name: '🎫 TICKET SYSTEM', 
          value: `\`${config.BOT.PREFIX}setup-ticket\` - Setup panel ticket (Admin)\n` +
                 `Menampilkan panel untuk membuat ticket rekber/MC`,
          inline: false
        },
        { 
          name: '🎯 SESSION SYSTEM', 
          value: `\`${config.BOT.PREFIX}open-session\` - Buka sesi pendaftaran (Admin)\n` +
                 `\`${config.BOT.PREFIX}close-session <sessionId>\` - Tutup sesi (Admin)`,
          inline: false
        },
        { 
          name: '📚 GENERAL', 
          value: `\`${config.BOT.PREFIX}help\` - Tampilkan pesan bantuan ini`,
          inline: false
        },
        {
          name: '📊 STATUS',
          value: `Version: ${config.BOT.VERSION} | Prefix: ${config.BOT.PREFIX}`,
          inline: false
        }
      )
      .setFooter({ text: `${config.BOT.NAME} 🤖 v${config.BOT.VERSION}` })
      .setTimestamp();
  }
}

module.exports = EmbedFactory;