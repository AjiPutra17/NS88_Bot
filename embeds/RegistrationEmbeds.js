// ============================================================================
// REGISTRATION EMBEDS
// ============================================================================

const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

class RegistrationEmbeds {
  /**
   * Create registration ticket embed (in private channel)
   */
  static createRegistrationTicketEmbed(session, registration, user, kenalanMember) {
    return new EmbedBuilder()
      .setColor(config.COLORS.WARNING)
      .setTitle(`📋 Tiket Pendaftaran - ${session.sessionName}`)
      .setDescription(
        `**Pendaftaran Baru!**\n\n` +
        `**👤 Peserta:**\n` +
        `• **User:** ${user.tag}\n` +
        `• **Username:** ${registration.username}\n` +
        `• **Display Name:** ${registration.displayName}\n\n` +
        `**👋 Kenalan dengan:**\n` +
        `• ${kenalanMember.user.tag} (${kenalanMember.displayName})\n\n` +
        `**💰 Informasi Pembayaran:**\n` +
        `• **Biaya:** Rp ${session.fee.toLocaleString('id-ID')}\n` +
        `• **Status:** ⏳ Menunggu Pembayaran\n\n` +
        `**📌 Ticket ID:** \`${registration.ticketId}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**📝 Instruksi:**\n` +
        `1️⃣ Transfer sesuai nominal\n` +
        `2️⃣ Upload bukti pembayaran di channel ini\n` +
        `3️⃣ Tunggu konfirmasi dari admin\n\n` +
        `💡 Admin akan mengecek dan konfirmasi pembayaran Anda.`
      )
      .setFooter({ text: `${registration.ticketId} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create session embed for main channel
   */
  static createSessionEmbed(session) {
    return new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setTitle(`📋 Pendaftaran ${session.sessionName}`)
      .setDescription(
        `**🟢 Status: DIBUKA**\n\n` +
        `💰 **Biaya Pendaftaran:** Rp ${session.fee.toLocaleString('id-ID')}\n` +
        `👥 **Peserta Terdaftar:** ${session.participants.length}\n\n` +
        `**📝 Cara Mendaftar:**\n` +
        `1️⃣ Klik tombol "📝 Daftar Sekarang"\n` +
        `2️⃣ Pilih member akamsiNS88 untuk kenalan\n` +
        `3️⃣ Isi form pendaftaran\n` +
        `4️⃣ Channel private akan dibuat untuk Anda\n` +
        `5️⃣ Upload bukti pembayaran\n` +
        `6️⃣ Tunggu konfirmasi admin\n\n` +
        `✨ Yuk daftar sekarang!`
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create registration success embed
   */
  static createRegistrationSuccessEmbed(session, userData) {
    return new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setTitle('✅ Pendaftaran Berhasil!')
      .setDescription(
        `Terima kasih telah mendaftar untuk **${session.eventName}**!\n\n` +
        `**📝 Data Pendaftaran Anda:**\n` +
        `• **Nama:** ${userData.name}\n` +
        `• **Kontak:** ${userData.contact}\n` +
        `• **Catatan:** ${userData.notes || '-'}\n\n` +
        `**📌 Nomor Pendaftaran:** \`${session.id}\`\n` +
        `**⏰ Waktu Pendaftar:** ${new Date().toLocaleString('id-ID')}\n\n` +
        `💡 **Simpan nomor pendaftaran ini untuk referensi!**`
      )
      .setFooter({ text: `${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create participant list embed
   */
  static createParticipantListEmbed(session, registrations, guild) {
    const embed = new EmbedBuilder()
      .setColor(config.COLORS.INFO)
      .setTitle(`👥 Daftar Peserta - ${session.eventName}`)
      .setDescription(
        `**Total Peserta:** ${registrations.length}/${session.maxParticipants || '∞'}\n` +
        `**Status:** ${session.status === 'open' ? '🟢 Terbuka' : '🔴 Ditutup'}\n\n`
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();

    if (registrations.length === 0) {
      embed.addFields({
        name: '📝 Peserta',
        value: '```Belum ada peserta yang mendaftar```',
        inline: false
      });
    } else {
      let participantList = '';
      registrations.forEach((reg, index) => {
        const member = guild.members.cache.get(reg.userId);
        const username = member ? member.user.tag : 'Unknown User';
        participantList += `${index + 1}. **${reg.name}** (@${username})\n`;
        participantList += `   • Kontak: ${reg.contact}\n`;
        if (reg.notes) {
          participantList += `   • Catatan: ${reg.notes}\n`;
        }
        participantList += '\n';
      });

      // Split into chunks if too long
      if (participantList.length > 1024) {
        const chunks = participantList.match(/[\s\S]{1,1024}/g) || [];
        chunks.forEach((chunk, i) => {
          embed.addFields({
            name: i === 0 ? '📝 Peserta' : '\u200B',
            value: chunk,
            inline: false
          });
        });
      } else {
        embed.addFields({
          name: '📝 Peserta',
          value: participantList || 'Tidak ada peserta',
          inline: false
        });
      }
    }

    return embed;
  }

  /**
   * Create session closed embed
   */
  static createSessionClosedEmbed(session) {
    return new EmbedBuilder()
      .setColor(config.COLORS.DANGER)
      .setTitle('🔴 Pendaftaran Ditutup')
      .setDescription(
        `Pendaftaran untuk **${session.eventName}** telah ditutup.\n\n` +
        `**Total Peserta:** ${session.participants.length}\n` +
        `**Ditutup pada:** ${new Date().toLocaleString('id-ID')}\n\n` +
        `Terima kasih kepada semua yang telah mendaftar! 🙏`
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create session opened embed
   */
  static createSessionOpenedEmbed(session) {
    return new EmbedBuilder()
      .setColor(config.COLORS.SUCCESS)
      .setTitle('🟢 Pendaftaran Dibuka Kembali')
      .setDescription(
        `Pendaftaran untuk **${session.eventName}** telah dibuka kembali!\n\n` +
        `**Slot Tersedia:** ${session.maxParticipants ? `${session.maxParticipants - session.participants.length} slot` : 'Unlimited'}\n` +
        `**Deadline:** ${session.registrationDeadline || 'Tidak dibatasi'}\n\n` +
        `Klik tombol **"Daftar"** untuk mendaftar! 📝`
      )
      .setFooter({ text: `${session.id} | ${config.BOT.NAME} 🤖` })
      .setTimestamp();
  }

  /**
   * Create all sessions list embed
   */
  static createSessionsListEmbed(sessions) {
    const embed = new EmbedBuilder()
      .setColor(config.COLORS.INFO)
      .setTitle('📋 Daftar Sesi Pendaftaran')
      .setFooter({ text: `${config.BOT.NAME} 🤖` })
      .setTimestamp();

    if (sessions.length === 0) {
      embed.setDescription('❌ Tidak ada sesi pendaftaran yang aktif.');
      return embed;
    }

    let description = '';
    sessions.forEach((session, index) => {
      const statusEmoji = session.status === 'open' ? '🟢' : '🔴';
      description += `**${index + 1}. ${session.eventName}** ${statusEmoji}\n`;
      description += `   • ID: \`${session.id}\`\n`;
      description += `   • Peserta: ${session.participants.length}/${session.maxParticipants || '∞'}\n`;
      description += `   • Status: ${session.status === 'open' ? 'Dibuka' : 'Ditutup'}\n\n`;
    });

    embed.setDescription(description);
    return embed;
  }
}

module.exports = RegistrationEmbeds;