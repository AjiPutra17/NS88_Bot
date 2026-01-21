// ============================================================================
// COMMANDS EXPORT
// ============================================================================

const setupTicket = require('./setup-ticket');
const help = require('./help');
const { setupRegistration } = require('./registration');

module.exports = {
  'setup-ticket': setupTicket,
  'help': help,
  'setup-registration': setupRegistration
};