// ============================================================================
// GUILD MEMBER ADD EVENT
// ============================================================================

const Logger = require('../utils/logger');

async function guildMemberAdd(member) {
  try {
    Logger.info(`New member joined: ${member.user.tag} in ${member.guild.name}`);
    
    // Send DM to new member
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
      Logger.warning(`Could not send DM to ${member.user.tag} - DMs might be closed`);
    }
    
  } catch (error) {
    Logger.error('Error in guildMemberAdd event', error);
  }
}

module.exports = guildMemberAdd;