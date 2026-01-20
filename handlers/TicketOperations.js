// ============================================================================
// TICKET OPERATIONS
// ============================================================================

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const EmbedFactory = require('../embeds/EmbedFactory');
const Logger = require('../utils/logger');
const { ticketManager } = require('../managers');

class TicketOperations {
  /**
   * Archive ticket and delete channel
   */
  static async archiveAndDelete(ticket, status, guild) {
    try {
      // Send to archive channel
      if (config.CHANNELS.ARCHIVE) {
        const archiveChannel = await guild.channels.fetch(config.CHANNELS.ARCHIVE);
        
        if (archiveChannel) {
          const archiveEmbed = EmbedFactory.createArchiveEmbed(ticket, status);
          await archiveChannel.send({ embeds: [archiveEmbed] });
          Logger.success(`Ticket ${ticket.id} archived`);
        }
      }
      
      // Delete channel after delay
      const ticketChannel = await guild.channels.fetch(ticket.channelId);
      if (ticketChannel) {
        await ticketChannel.send(`⏳ Channel ini akan dihapus dalam ${config.TICKET.DELETE_DELAY_MS / 1000} detik...`);
        
        setTimeout(async () => {
          try {
            await ticketChannel.delete();
            Logger.success(`Channel ${ticketChannel.name} deleted`);
          } catch (error) {
            Logger.error('Failed to delete channel', error);
          }
        }, config.TICKET.DELETE_DELAY_MS);
      }
      
      // Remove from ticket manager
      ticketManager.delete(ticket.id);
      
    } catch (error) {
      Logger.error('Error in archiveAndDelete', error);
    }
  }

  /**
   * Add user to ticket channel
   */
  static async addUserToTicket(ticket, userId, guild, role = 'buyer') {
    try {
      const selectedUser = await guild.members.fetch(userId);
      
      if (selectedUser.user.bot) {
        throw new Error('Cannot add bot as user');
      }

      const ticketChannel = await guild.channels.fetch(ticket.channelId);
      
      // Set permissions
      await ticketChannel.permissionOverwrites.create(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true
      });

      // Add to allowed users
      if (!ticket.allowedUsers.includes(userId)) {
        ticket.allowedUsers.push(userId);
        ticketManager.update(ticket.id, { allowedUsers: ticket.allowedUsers });
      }

      const roleEmoji = role === 'buyer' ? '👤' : '💼';
      const roleText = role === 'buyer' ? 'Buyer' : 'Seller';
      
      await ticketChannel.send(
        `${roleEmoji} **${selectedUser.user.tag}** telah ditambahkan sebagai **${roleText}**`
      );

      Logger.success(`User ${selectedUser.user.tag} added as ${roleText} to ${ticket.id}`);
      
      return selectedUser;
      
    } catch (error) {
      Logger.error('Error adding user to ticket', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  static async updateStatus(ticketId, status, channel) {
    try {
      const ticket = ticketManager.get(ticketId);
      if (!ticket) return;

      ticketManager.update(ticketId, { status });

      const messages = await channel.messages.fetch({ limit: 10 });
      const ticketMessage = messages.find(m => 
        m.embeds[0]?.footer?.text?.includes(ticketId)
      );
      
      if (ticketMessage) {
        const isCompleted = status === 'selesai';
        const color = isCompleted ? config.COLORS.SUCCESS : config.COLORS.DANGER;
        const title = isCompleted ? '✅ ORDER REKBER/MC - SELESAI' : '❌ ORDER REKBER/MC - DIBATALKAN';
        
        const updatedEmbed = EmbedBuilder.from(ticketMessage.embeds[0])
          .setColor(color)
          .setTitle(title);
          
        await ticketMessage.edit({ embeds: [updatedEmbed], components: [] });
        Logger.success(`Ticket ${ticketId} status updated to ${status}`);
      }
    } catch (error) {
      Logger.error('Error updating ticket status', error);
    }
  }
}

module.exports = TicketOperations;