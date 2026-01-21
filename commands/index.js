// ============================================================================
// COMMANDS EXPORT
// ============================================================================

const setupTicket = require('./setup-ticket');
const help = require('./help');
const {
  createRegistration,
  openRegistration,
  closeRegistration,
  listParticipants,
  listRegistrations,
  deleteRegistration
} = require('./registration');

module.exports = {
  'setup-ticket': setupTicket,
  'help': help,
  'create-registration': createRegistration,
  'open-registration': openRegistration,
  'close-registration': closeRegistration,
  'list-participants': listParticipants,
  'list-registrations': listRegistrations,
  'delete-registration': deleteRegistration
};