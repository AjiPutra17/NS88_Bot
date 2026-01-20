// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const { PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');
const Logger = require('./logger');

class Utils {
  /**
   * Calculate fee based on nominal amount
   */
  static calculateFee(nominal) {
    const amount = parseInt(nominal);
    
    for (const tier of config.FEE_STRUCTURE) {
      if (amount >= tier.min && amount <= tier.max) {
        return tier.percentage 
          ? Math.floor(amount * tier.percentage)
          : tier.fee;
      }
    }
    
    return 0;
  }

  /**
   * Format number to Rupiah currency
   */
  static formatRupiah(amount) {
    return `Rp ${parseInt(amount).toLocaleString('id-ID')}`;
  }

  /**
   * Format seconds to readable time string
   */
  static formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes} menit ${secs} detik`;
    }
    return `${secs} detik`;
  }

  /**
   * Get fee structure as formatted string
   */
  static getFeeStructureText() {
    let text = '';
    for (const tier of config.FEE_STRUCTURE) {
      if (tier.percentage) {
        text += `Nominal diatas ${this.formatRupiah(tier.min - 1)}, fee ${(tier.percentage * 100)}% dari nominal transaksi.\n`;
      } else {
        text += `${this.formatRupiah(tier.min)} — ${this.formatRupiah(tier.max)} : ${this.formatRupiah(tier.fee)}\n`;
      }
    }
    return text;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(member, roleName) {
    return member.roles.cache.some(role => role.name === roleName);
  }

  /**
   * Find user by username (case insensitive)
   */
  static findUserByUsername(guild, username) {
    return guild.members.cache.find(member => 
      member.user.username.toLowerCase() === username.toLowerCase() && 
      !member.user.bot
    );
  }

  /**
   * Get all admin members
   */
  static getAdmins(guild) {
    return guild.members.cache.filter(member => 
      member.permissions.has(PermissionFlagsBits.Administrator) && 
      !member.user.bot
    );
  }

  /**
   * Safely delete a message after delay
   */
  static async deleteMessageAfterDelay(message, delay = 5000) {
    setTimeout(async () => {
      try {
        await message.delete();
      } catch (error) {
        Logger.debug('Message already deleted or no permission');
      }
    }, delay);
  }
}

module.exports = Utils;