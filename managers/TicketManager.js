// ============================================================================
// TICKET MANAGER
// ============================================================================

const config = require('../config/config');

class TicketManager {
  constructor() {
    this.tickets = new Map();
    this.counter = 1;
  }

  create(data) {
    const id = `${config.TICKET.PREFIX}-${this.counter++}`;
    const ticket = {
      id,
      ...data,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  get(id) {
    return this.tickets.get(id);
  }

  update(id, data) {
    const ticket = this.tickets.get(id);
    if (ticket) {
      Object.assign(ticket, data, { updatedAt: new Date() });
      this.tickets.set(id, ticket);
    }
    return ticket;
  }

  delete(id) {
    return this.tickets.delete(id);
  }

  getAll() {
    return Array.from(this.tickets.values());
  }
}

module.exports = TicketManager;