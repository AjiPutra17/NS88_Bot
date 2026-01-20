// ============================================================================
// MANAGERS EXPORT
// ============================================================================

const TicketManager = require('./TicketManager');
const SlowmodeManager = require('./SlowmodeManager');

// Initialize managers
const ticketManager = new TicketManager();
const slowmodeManager = new SlowmodeManager();

module.exports = {
  TicketManager,
  SlowmodeManager,
  ticketManager,
  slowmodeManager
};