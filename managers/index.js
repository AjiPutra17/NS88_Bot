// ============================================================================
// MANAGERS EXPORT
// ============================================================================

const TicketManager = require('./TicketManager');
const SlowmodeManager = require('./SlowmodeManager');
const SessionManager = require('./SessionManager');

// Initialize managers
const ticketManager = new TicketManager();
const slowmodeManager = new SlowmodeManager();
const sessionManager = new SessionManager();

module.exports = {
  TicketManager,
  SlowmodeManager,
  SessionManager,
  ticketManager,
  slowmodeManager,
  sessionManager
};