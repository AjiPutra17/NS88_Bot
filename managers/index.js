// ============================================================================
// MANAGERS EXPORT
// ============================================================================

const TicketManager = require('./TicketManager');
const SlowmodeManager = require('./SlowmodeManager');
const RegistrationManager = require('./RegistrationManager');

// Initialize managers
const ticketManager = new TicketManager();
const slowmodeManager = new SlowmodeManager();
const registrationManager = new RegistrationManager();

module.exports = {
  TicketManager,
  SlowmodeManager,
  RegistrationManager,
  ticketManager,
  slowmodeManager,
  registrationManager
};