// ============================================================================
// CONFIGURATION
// ============================================================================

const { ActivityType } = require('discord.js');

const CONFIG = {
  // Bot Settings
  BOT: {
    NAME: 'NS88 BOT',
    VERSION: '2.1.0',
    ACTIVITY: 'Rekber/MC System',
    ACTIVITY_TYPE: ActivityType.Watching,
    PREFIX: '!'
  },

  // Channel IDs (from environment variables)
  CHANNELS: {
    SETUP: process.env.SETUP_CHANNEL_ID || null,
    ARCHIVE: process.env.ARCHIVE_CHANNEL_ID || null,
    TICKET: process.env.TICKET_CHANNEL || null,
    WARNING: (process.env.WARNING_CHANNEL_IDS || '').split(',').filter(Boolean)
  },

  // Admin Settings
  ADMIN: {
    USERNAME: process.env.ADMIN_USERNAME || 'crzdrn',
    ROLE_NAME: process.env.ADMIN_ROLE_NAME || 'Admin'
  },

  // Donatur/Booster Settings
  DONATUR: {
    ROLE_NAME: process.env.DONATUR_ROLE_NAME || 'Donatur NS88',
    SLOWMODE_SECONDS: parseInt(process.env.SLOWMODE_DONATUR) || 600,
  },

  // Non-Donatur Settings
  NON_DONATUR: {
    SLOWMODE_SECONDS: parseInt(process.env.SLOWMODE_NON_DONATUR) || 1800,
  },

  // Payment Information
  PAYMENT: {
    QRIS_IMAGE_URL: process.env.QRIS_IMAGE_URL || 'https://cdn.discordapp.com/attachments/1453015494650232842/1458349144963022910/1767753033603.png',
    QRIS_NMID: process.env.QRIS_NMID || 'ID1025461592426',
    ACCOUNT_NAME: process.env.PAYMENT_ACCOUNT_NAME || 'NONSTOP88, GAMER'
  },

  // Ticket Settings
  TICKET: {
    DELETE_DELAY_MS: 5000,
    MIN_NOMINAL: 1000,
    PREFIX: 'TICKET',
    CHANNEL_PREFIX: 'ticket-'
  },

  // Colors (Hex)
  COLORS: {
    PRIMARY: '#5865F2',
    SUCCESS: '#00FF00',
    DANGER: '#FF0000',
    WARNING: '#FFA500',
    INFO: '#00BFFF'
  },

  // Fee Structure (in IDR)
  FEE_STRUCTURE: [
    { min: 1000, max: 9000, fee: 2000 },
    { min: 10000, max: 49000, fee: 3000 },
    { min: 50000, max: 99000, fee: 4000 },
    { min: 100000, max: 150000, fee: 7000 },
    { min: 150000, max: 300000, fee: 10000 },
    { min: 300001, max: Infinity, percentage: 0.05 }
  ]
};

module.exports = CONFIG;