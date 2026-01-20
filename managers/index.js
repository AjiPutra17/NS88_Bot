// ============================================================================
// MANAGERS EXPORT
// ============================================================================

const TicketManager = require('./TicketManager');
const SlowmodeManager = require('./SlowmodeManage');

// Initialize managers
const ticketManager = new TicketManager();
const slowmodeManager = new SlowmodeManager();

module.exports = {
  TicketManager,
  SlowmodeManager,
  ticketManager,
  slowmodeManager
};