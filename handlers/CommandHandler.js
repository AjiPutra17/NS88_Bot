// ============================================================================
// COMMAND HANDLER
// ============================================================================

const config = require('../config/config');
const commands = require('../commands');

class CommandHandler {
  static async handle(message) {
    // Check if message starts with prefix
    if (!message.content.startsWith(config.BOT.PREFIX)) {
      return;
    }

    // Parse command and arguments
    const args = message.content.slice(config.BOT.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Get command function
    const command = commands[commandName];

    // Execute command if exists
    if (command) {
      try {
        await command(message, args);
      } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        message.reply('❌ Terjadi kesalahan saat menjalankan command!').catch(() => {});
      }
    }
  }
}

module.exports = CommandHandler;