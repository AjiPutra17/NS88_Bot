// ============================================================================
// SESSION EMBEDS
// ============================================================================

const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

class SessionEmbeds {
  /**
   * Create session announcement embed
   */
  static createSessionEmbed(session) {
    return new EmbedBuilder()
      .setColor(config.COLORS.PRIMARY)
      .setTitle('🎯 BUKA SESI PENDAFTARAN!')
      .setDescription(
        `**${session.title}**\n\n` +
        `${session.description}\n\n` +
        `📋 **Informasi Sesi:**\n` +
        `📅 **Tanggal:** ${session.date}\n` +
        `⏰ **Waktu:** ${session.time}\n` +
        `👥 **Kuota:** ${session.maxSlots} orang\n` +
        `💰 **Biaya:** ${session.fee}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**📝 Cara Daftar:**\n` +
        `1️⃣ Klik tombol "📝 DAFTAR SEKARANG" dibawah\n` +
        `2️⃣ Isi formulir pendaftaran\n` +
        `3️⃣ Upload bukti pembayaran\n` +
        `4️⃣ Tunggu konfirmasi dari admin\n\n` +
        `⚡ **Buruan daftar sebelum kuota penuh!**`
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create registration form embed
   */
  static createRegistrationEmbed(registration, session) {
    return new EmbedBuilder()
      .setColor(config.COLORS.WARNING)
      .setTitle('📋 PENDAFTARAN SESI - MENUNGGU KONFIRMASI')
      .setDescription(
        `**Detail Pendaftaran:**\n\n` +
        `📌 **Sesi:** ${session.title}\n` +
        `👤 **Nama:** ${registration.name}\n` +
        `📱 **Kontak:** ${registration.contact}\n` +
        `📝 **Catatan:** ${registration.notes || '-'}\n\n` +
        `💰 **Biaya:** ${session.fee}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📸 **Bukti Pembayaran:**\n` +
        `Silakan upload bukti pembayaran di channel ini.\n\n` +
        `⏳ **Status:** Menunggu konfirmasi admin...`
      )
      .setFooter({ text: `${registration.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create payment proof received embed
   */
  static createPaymentReceivedEmbed(username) {
    return new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setTitle('✅ Bukti Pembayaran Diterima')
      .setDescription(
        `Terima kasih **${username}**!\n\n` +
        `✅ Bukti pembayaran Anda telah kami terima.\n` +
        `👨‍💼 Admin akan segera mengecek dan konfirmasi pendaftaran Anda.\n\n` +
        `⏳ Mohon tunggu sebentar...\n\n` +
        `💡 **Note:** Proses verifikasi biasanya memakan waktu 5-15 menit.`
      )
      .setFooter({ text: `${config.BOT.NAME} 🤖 - Auto Response` })
      .setTimestamp();
  }

  /**
   * Create confirmed registration embed
   */
  static createConfirmedEmbed(registration, session, confirmedBy) {
    return new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setTitle('✅ PENDAFTARAN DIKONFIRMASI!')
      .setDescription(
        `Selamat! Pendaftaran Anda telah dikonfirmasi.\n\n` +
        `**Detail Pendaftaran:**\n` +
        `📌 **Sesi:** ${session.title}\n` +
        `👤 **Nama:** ${registration.name}\n` +
        `📅 **Tanggal:** ${session.date}\n` +
        `⏰ **Waktu:** ${session.time}\n\n` +
        `✅ **Dikonfirmasi oleh:** ${confirmedBy}\n` +
        `📝 **Status:** TERDAFTAR\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎉 **Sampai jumpa di sesi!**\n` +
        `Silakan cek channel list untuk melihat daftar peserta.`
      )
      .setFooter({ text: `${registration.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create participant list embed
   */
  static createParticipantListEmbed(session, registrations) {
    const confirmedRegs = registrations.filter(r => r.status === 'confirmed');
    const participantList = confirmedRegs.map((reg, index) => 
      `${index + 1}. **${reg.name}** - ${reg.contact}`
    ).join('\n') || '*Belum ada peserta terdaftar*';

    return new EmbedBuilder()
      .setColor(config.COLORS.INFO)
      .setTitle(`📋 DAFTAR PESERTA: ${session.title}`)
      .setDescription(
        `**Informasi Sesi:**\n` +
        `📅 **Tanggal:** ${session.date}\n` +
        `⏰ **Waktu:** ${session.time}\n` +
        `💰 **Biaya:** ${session.fee}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👥 **Peserta Terdaftar (${confirmedRegs.length}/${session.maxSlots}):**\n\n` +
        participantList + '\n\n' +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${confirmedRegs.length >= session.maxSlots ? '❌ **KUOTA PENUH!**' : `✅ **Sisa Kuota: ${session.maxSlots - confirmedRegs.length} orang**`}`
      )
      .setFooter({ text: `${session.id} | Last Update: ${new Date().toLocaleString('id-ID')}` })
      .setTimestamp();
  }

  /**
   * Create archive embed for registration
   */
  static createRegistrationArchiveEmbed(registration, session) {
    return new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setTitle('📁 ARSIP PENDAFTARAN')
      .setDescription(
        `**${registration.id}**\n\n` +
        `📌 **Sesi:** ${session.title}\n` +
        `👤 **Nama:** ${registration.name}\n` +
        `📱 **Kontak:** ${registration.contact}\n` +
        `📝 **Catatan:** ${registration.notes || '-'}\n\n` +
        `💰 **Biaya:** ${session.fee}\n` +
        `✅ **Status:** TERKONFIRMASI\n` +
        `📅 **Tanggal Daftar:** ${registration.createdAt.toLocaleString('id-ID')}\n` +
        `✔️ **Dikonfirmasi:** ${registration.confirmedAt?.toLocaleString('id-ID')}`
      )
      .setFooter({ text: `${config.BOT.NAME} 🤖 - Arsip Pendaftaran` })
      .setTimestamp();
  }
}

module.exports = SessionEmbeds;