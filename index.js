// ============================================================================
// NS88 DISCORD BOT - MAIN ENTRY POINT
// Version: 2.1.0
// Description: Professional Discord bot for managing middleman/escrow tickets
// Author: NS88 Development Team
// License: MIT
// ============================================================================

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config/config');
const Logger = require('./utils/logger');
const { registerEvents } = require('./events');
const { ticketManager, slowmodeManager } = require('./managers');

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
// REGISTER EVENTS
// ============================================================================

registerEvents(client);

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

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

const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;

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

const shutdown = async (signal) => {
  Logger.info(`${signal} received, shutting down bot...`);
  await client.destroy();
  Logger.success('Bot shutdown complete');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Export for potential use in other files
module.exports = { client };