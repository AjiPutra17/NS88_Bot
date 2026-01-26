// ============================================================================
// INTERACTION HANDLER
// ============================================================================

const Logger = require('../utils/logger');

class InteractionHandler {
  /**
   * Handle button interactions
   */
  static async handleButton(interaction) {
    try {
      const { customId } = interaction;
      Logger.info(`Button clicked: ${customId} by ${interaction.user.tag}`);

      // Route ke handler yang sesuai berdasarkan customId button
      if (customId.startsWith('ticket_')) {
        return await this.handleTicketButton(interaction);
      } 
      
      if (customId.startsWith('session_')) {
        return await this.handleSessionButton(interaction);
      }
      
      if (customId === 'open_ticket') {
        return await this.handleOpenTicket(interaction);
      }
      
      if (customId === 'close_ticket') {
        return await this.handleCloseTicket(interaction);
      }

      // Jika button tidak dikenali
      Logger.warning(`Unknown button customId: ${customId}`);
      return await interaction.reply({
        content: '❌ Button tidak dikenali!',
        ephemeral: true
      });
      
    } catch (error) {
      Logger.error('Error in handleButton', error);
      throw error;
    }
  }

  /**
   * Handle user select menu interactions
   */
  static async handleUserSelect(interaction) {
    try {
      const { customId, values } = interaction;
      Logger.info(`Select menu: ${customId} by ${interaction.user.tag}`);

      // Route berdasarkan customId select menu
      if (customId === 'select_member') {
        return await this.handleMemberSelection(interaction);
      }
      
      if (customId === 'select_category') {
        return await this.handleCategorySelection(interaction);
      }

      // Jika select menu tidak dikenali
      Logger.warning(`Unknown select menu customId: ${customId}`);
      return await interaction.reply({
        content: '❌ Select menu tidak dikenali!',
        ephemeral: true
      });
      
    } catch (error) {
      Logger.error('Error in handleUserSelect', error);
      throw error;
    }
  }

  /**
   * Handle string select menu interactions
   */
  static async handleStringSelect(interaction) {
    try {
      const { customId, values } = interaction;
      Logger.info(`String select: ${customId}, values: ${values.join(', ')}`);

      // Route berdasarkan customId
      if (customId === 'ticket_category') {
        return await this.handleTicketCategory(interaction);
      }

      // Default handler
      return await interaction.reply({
        content: `✅ Pilihan: ${values.join(', ')}`,
        ephemeral: true
      });
      
    } catch (error) {
      Logger.error('Error in handleStringSelect', error);
      throw error;
    }
  }

  /**
   * Handle modal submit interactions
   */
  static async handleModalSubmit(interaction) {
    try {
      const { customId } = interaction;
      Logger.info(`Modal submitted: ${customId} by ${interaction.user.tag}`);

      // Route berdasarkan customId modal
      if (customId === 'ticket_form') {
        return await this.handleTicketForm(interaction);
      }
      
      if (customId === 'session_form') {
        return await this.handleSessionForm(interaction);
      }

      // Jika modal tidak dikenali
      Logger.warning(`Unknown modal customId: ${customId}`);
      return await interaction.reply({
        content: '❌ Modal tidak dikenali!',
        ephemeral: true
      });
      
    } catch (error) {
      Logger.error('Error in handleModalSubmit', error);
      throw error;
    }
  }

  // =========================================================================
  // BUTTON HANDLERS - Implementasi sesuai kebutuhan bot Anda
  // =========================================================================

  static async handleTicketButton(interaction) {
    // TODO: Implementasi logic ticket button
    await interaction.reply({
      content: '🎫 Memproses ticket...',
      ephemeral: true
    });
  }

  static async handleSessionButton(interaction) {
    // TODO: Implementasi logic session button
    await interaction.reply({
      content: '📋 Memproses session...',
      ephemeral: true
    });
  }

  static async handleOpenTicket(interaction) {
    // TODO: Implementasi logic buka ticket
    await interaction.reply({
      content: '✅ Membuka ticket baru...',
      ephemeral: true
    });
  }

  static async handleCloseTicket(interaction) {
    // TODO: Implementasi logic tutup ticket
    await interaction.reply({
      content: '🔒 Menutup ticket...',
      ephemeral: true
    });
  }

  // =========================================================================
  // SELECT MENU HANDLERS
  // =========================================================================

  static async handleMemberSelection(interaction) {
    const selectedUsers = interaction.values;
    await interaction.reply({
      content: `✅ Member dipilih: <@${selectedUsers.join('>, <@')}>`,
      ephemeral: true
    });
  }

  static async handleCategorySelection(interaction) {
    const category = interaction.values[0];
    await interaction.reply({
      content: `✅ Kategori: ${category}`,
      ephemeral: true
    });
  }

  static async handleTicketCategory(interaction) {
    const category = interaction.values[0];
    await interaction.reply({
      content: `🎫 Kategori ticket: ${category}`,
      ephemeral: true
    });
  }

  // =========================================================================
  // MODAL HANDLERS
  // =========================================================================

  static async handleTicketForm(interaction) {
    // Ambil nilai dari form fields
    try {
      // Sesuaikan dengan field ID di modal Anda
      const subject = interaction.fields.getTextInputValue('ticket_subject');
      const description = interaction.fields.getTextInputValue('ticket_description');
      
      await interaction.reply({
        content: `✅ Ticket dibuat!\n**Subject:** ${subject}\n**Deskripsi:** ${description}`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: '✅ Form ticket diterima!',
        ephemeral: true
      });
    }
  }

  static async handleSessionForm(interaction) {
    await interaction.reply({
      content: '✅ Form session diterima!',
      ephemeral: true
    });
  }
}

module.exports = InteractionHandler;