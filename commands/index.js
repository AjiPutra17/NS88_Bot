// ============================================================================
// COMMANDS EXPORT
// ============================================================================

const setupTicket = require('./setup-ticket');
const help = require('./help');
const openSession = require('./open-session');
const closeSession = require('./close-session');

module.exports = {
  'setup-ticket': setupTicket,
  'help': help,
  'open-session': openSession,
  'close-session': closeSession
};