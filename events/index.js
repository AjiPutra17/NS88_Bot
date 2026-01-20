// ============================================================================
// EVENTS REGISTRATION
// ============================================================================

const ready = require('./ready');
const messageCreate = require('./messageCreate');
const interactionCreate = require('./interactionCreate');
const guildMemberAdd = require('./guildMemberAdd');

/**
 * Register all events to the Discord client
 * @param {Client} client - Discord.js client
 */
function registerEvents(client) {
  client.once('ready', () => ready(client));
  client.on('messageCreate', messageCreate);
  client.on('interactionCreate', interactionCreate);
  client.on('guildMemberAdd', guildMemberAdd);
}

module.exports = { registerEvents };