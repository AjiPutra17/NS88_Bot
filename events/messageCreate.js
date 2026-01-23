// ============================================================================
// MESSAGE CREATE EVENT
// ============================================================================

const Logger = require('../utils/logger');
const {
  CommandHandler,
  SlowmodeHandler,
  WarningHandler,
  PaymentProofHandler,
  SessionHandler
} = require('../handlers');

async function messageCreate(message) {
  // Ignore bot messages
  if (message.author.bot) return;

  try {
    // Check slowmode
    const shouldProcess = await SlowmodeHandler.handle(message);
    if (!shouldProcess) return;

    // Auto-warning system
    const warningHandled = await WarningHandler.handle(message);
    if (warningHandled) return;

    // Payment proof detection for tickets
    await PaymentProofHandler.handle(message);

    // Payment proof detection for session registration
    await SessionHandler.handlePaymentProof(message);

    // Command handling
    await CommandHandler.handle(message);

  } catch (error) {
    Logger.error('Error in messageCreate event', error);
  }
}

module.exports = messageCreate;