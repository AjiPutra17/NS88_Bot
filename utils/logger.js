// ============================================================================
// LOGGER UTILITY
// ============================================================================

class Logger {
  static log(message, type = 'INFO') {
    const timestamp = new Date().toLocaleString('id-ID');
    const prefix = {
      'INFO': '✅',
      'ERROR': '❌',
      'WARNING': '⚠️',
      'DEBUG': '🔍',
      'SUCCESS': '🎉'
    }[type] || '📝';
    
    console.log(`[${timestamp}] ${prefix} [${type}] ${message}`);
  }

  static info(message) {
    this.log(message, 'INFO');
  }

  static error(message, error = null) {
    this.log(message, 'ERROR');
    if (error) console.error(error);
  }

  static warning(message) {
    this.log(message, 'WARNING');
  }

  static debug(message) {
    this.log(message, 'DEBUG');
  }

  static success(message) {
    this.log(message, 'SUCCESS');
  }
}

module.exports = Logger;