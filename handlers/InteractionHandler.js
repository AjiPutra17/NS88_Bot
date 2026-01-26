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
      
      if (customId === 'open_session_panel') {
        return await this.handleOpenSessionPanel(interaction);
      }
      
      if (customId === 'open_ticket') {
        return await this.handleOpenTicket(interaction);
      }
      
      if (customId === 'close_ticket') {
        return await this.handleCloseTicket(interaction);
      }

      if (customId === 'create_ticket') {
        return await this.handleCreateTicket(interaction);
      }

      // Jika button tidak dikenali
      Logger.warning(`Unknown button customId: ${customId}`);
      return await interaction.reply({
        content: '❌ Button tidak dikenali!',
        flags: 64
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

      if (customId === 'select_user') {
        return await this.handleUserSelection(interaction);
      }

      // Jika select menu tidak dikenali
      Logger.warning(`Unknown select menu customId: ${customId}`);
      return await interaction.reply({
        content: '❌ Select menu tidak dikenali!',
        flags: 64
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

      if (customId === 'session_category') {
        return await this.handleSessionCategory(interaction);
      }

      // Default handler
      Logger.warning(`Unknown string select customId: ${customId}`);
      return await interaction.reply({
        content: `✅ Pilihan: ${values.join(', ')}`,
        flags: 64
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

      if (customId === 'ticket_modal') {
        return await this.handleTicketModal(interaction);
      }

      if (customId === 'session_modal') {
        return await this.handleSessionModal(interaction);
      }

      // Jika modal tidak dikenali
      Logger.warning(`Unknown modal customId: ${customId}`);
      return await interaction.reply({
        content: '❌ Modal tidak dikenali!',
        flags: 64
      });
      
    } catch (error) {
      Logger.error('Error in handleModalSubmit', error);
      throw error;
    }
  }

  // =========================================================================
  // BUTTON HANDLERS - Implementasi sesuai kebutuhan bot Anda
  // =========================================================================

  static async handleOpenSessionPanel(interaction) {
    try {
      // TODO: Implementasi logic untuk open session panel
      // Contoh: buka modal, kirim embed, atau apapun yang dibutuhkan
      
      await interaction.reply({
        content: '📋 Membuka panel session...\n\nSilakan pilih opsi yang tersedia.',
        flags: 64
      });
      
      Logger.success(`Session panel opened by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error in handleOpenSessionPanel', error);
      throw error;
    }
  }

  static async handleTicketButton(interaction) {
    try {
      const { customId } = interaction;
      
      await interaction.reply({
        content: `🎫 Memproses ticket button: ${customId}`,
        flags: 64
      });
      
      Logger.success(`Ticket button processed: ${customId}`);
    } catch (error) {
      Logger.error('Error in handleTicketButton', error);
      throw error;
    }
  }

  static async handleSessionButton(interaction) {
    try {
      const { customId } = interaction;
      
      await interaction.reply({
        content: `📋 Memproses session button: ${customId}`,
        flags: 64
      });
      
      Logger.success(`Session button processed: ${customId}`);
    } catch (error) {
      Logger.error('Error in handleSessionButton', error);
      throw error;
    }
  }

  static async handleOpenTicket(interaction) {
    try {
      await interaction.reply({
        content: '✅ Membuka ticket baru...\n\nMohon tunggu sebentar.',
        flags: 64
      });
      
      Logger.success(`Ticket opened by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error in handleOpenTicket', error);
      throw error;
    }
  }

  static async handleCloseTicket(interaction) {
    try {
      await interaction.reply({
        content: '🔒 Menutup ticket...\n\nTicket akan segera ditutup.',
        flags: 64
      });
      
      Logger.success(`Ticket closed by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error in handleCloseTicket', error);
      throw error;
    }
  }

  static async handleCreateTicket(interaction) {
    try {
      await interaction.reply({
        content: '🎫 Membuat ticket baru...\n\nTicket sedang diproses.',
        flags: 64
      });
      
      Logger.success(`Ticket created by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error in handleCreateTicket', error);
      throw error;
    }
  }

  // =========================================================================
  // SELECT MENU HANDLERS
  // =========================================================================

  static async handleMemberSelection(interaction) {
    try {
      const selectedUsers = interaction.values;
      
      await interaction.reply({
        content: `✅ Member dipilih: <@${selectedUsers.join('>, <@')}>`,
        flags: 64
      });
      
      Logger.success(`Members selected: ${selectedUsers.join(', ')}`);
    } catch (error) {
      Logger.error('Error in handleMemberSelection', error);
      throw error;
    }
  }

  static async handleCategorySelection(interaction) {
    try {
      const category = interaction.values[0];
      
      await interaction.reply({
        content: `✅ Kategori dipilih: **${category}**`,
        flags: 64
      });
      
      Logger.success(`Category selected: ${category}`);
    } catch (error) {
      Logger.error('Error in handleCategorySelection', error);
      throw error;
    }
  }

  static async handleUserSelection(interaction) {
    try {
      const selectedUsers = interaction.values;
      
      await interaction.reply({
        content: `✅ User dipilih: <@${selectedUsers.join('>, <@')}>`,
        flags: 64
      });
      
      Logger.success(`Users selected: ${selectedUsers.join(', ')}`);
    } catch (error) {
      Logger.error('Error in handleUserSelection', error);
      throw error;
    }
  }

  static async handleTicketCategory(interaction) {
    try {
      const category = interaction.values[0];
      
      await interaction.reply({
        content: `🎫 Kategori ticket dipilih: **${category}**\n\nSilakan lanjutkan proses ticket.`,
        flags: 64
      });
      
      Logger.success(`Ticket category selected: ${category}`);
    } catch (error) {
      Logger.error('Error in handleTicketCategory', error);
      throw error;
    }
  }

  static async handleSessionCategory(interaction) {
    try {
      const category = interaction.values[0];
      
      await interaction.reply({
        content: `📋 Kategori session dipilih: **${category}**\n\nSession akan dimulai.`,
        flags: 64
      });
      
      Logger.success(`Session category selected: ${category}`);
    } catch (error) {
      Logger.error('Error in handleSessionCategory', error);
      throw error;
    }
  }

  // =========================================================================
  // MODAL HANDLERS
  // =========================================================================

  static async handleTicketForm(interaction) {
    try {
      // Ambil nilai dari form fields
      // Sesuaikan dengan field ID di modal Anda
      let subject = 'N/A';
      let description = 'N/A';
      
      try {
        subject = interaction.fields.getTextInputValue('ticket_subject');
      } catch (e) {
        Logger.warning('ticket_subject field not found');
      }
      
      try {
        description = interaction.fields.getTextInputValue('ticket_description');
      } catch (e) {
        Logger.warning('ticket_description field not found');
      }
      
      await interaction.reply({
        content: `✅ Ticket berhasil dibuat!\n\n**Subject:** ${subject}\n**Deskripsi:** ${description}`,
        flags: 64
      });
      
      Logger.success(`Ticket form submitted by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error in handleTicketForm', error);
      throw error;
    }
  }

  static async handleSessionForm(interaction) {
    try {
      await interaction.reply({
        content: '✅ Form session berhasil dikirim!\n\nSession akan segera diproses.',
        flags: 64
      });
      
      Logger.success(`Session form submitted by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error in handleSessionForm', error);
      throw error;
    }
  }

  static async handleTicketModal(interaction) {
    try {
      await interaction.reply({
        content: '✅ Modal ticket berhasil disubmit!',
        flags: 64
      });
      
      Logger.success(`Ticket modal submitted by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error in handleTicketModal', error);
      throw error;
    }
  }

  static async handleSessionModal(interaction) {
    try {
      await interaction.reply({
        content: '✅ Modal session berhasil disubmit!',
        flags: 64
      });
      
      Logger.success(`Session modal submitted by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error in handleSessionModal', error);
      throw error;
    }
  }
}

module.exports = InteractionHandler;