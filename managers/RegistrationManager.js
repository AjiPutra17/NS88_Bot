// ============================================================================
// REGISTRATION MANAGER
// ============================================================================

const config = require('../config/config');

class RegistrationManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> session data
    this.registrations = new Map(); // sessionId -> Map(userId -> registration data)
    this.counter = 1;
    this.ticketCounter = 1;
  }

  /**
   * Create new registration session
   */
  createSession(data) {
    try {
      const id = data.sessionName || `SESI-${this.counter++}`;
      
      const session = {
        id,
        sessionName: data.sessionName,
        fee: data.fee,
        status: 'open', // open, closed
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: data.creatorId,
        participants: [],
        channelId: data.channelId // Main registration channel
      };
      
      this.sessions.set(id, session);
      this.registrations.set(id, new Map());
      
      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  getSession(id) {
    return this.sessions.get(id);
  }

  /**
   * Update session
   */
  updateSession(id, data) {
    const session = this.sessions.get(id);
    if (session) {
      Object.assign(session, data, { updatedAt: new Date() });
      this.sessions.set(id, session);
    }
    return session;
  }

  /**
   * Open session
   */
  openSession(id) {
    return this.updateSession(id, { status: 'open' });
  }

  /**
   * Close session
   */
  closeSession(id) {
    return this.updateSession(id, { status: 'closed' });
  }

  /**
   * Delete session
   */
  deleteSession(id) {
    this.registrations.delete(id);
    return this.sessions.delete(id);
  }

  /**
   * Add registration to session
   */
  addRegistration(sessionId, userId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const registrations = this.registrations.get(sessionId);
    
    const ticketId = `${session.id}-${this.ticketCounter++}`;
    
    const registration = {
      userId,
      ticketId,
      ...data,
      registeredAt: new Date(),
      status: 'pending', // pending, approved, rejected
      paid: false
    };
    
    registrations.set(userId, registration);
    
    // Add to participants list
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
      this.updateSession(sessionId, { participants: session.participants });
    }
    
    return registration;
  }

  /**
   * Get registration
   */
  getRegistration(sessionId, userId) {
    const registrations = this.registrations.get(sessionId);
    if (!registrations) return null;
    return registrations.get(userId);
  }

  /**
   * Update registration
   */
  updateRegistration(sessionId, userId, data) {
    const registrations = this.registrations.get(sessionId);
    if (!registrations) return null;
    
    const registration = registrations.get(userId);
    if (registration) {
      Object.assign(registration, data);
      registrations.set(userId, registration);
    }
    return registration;
  }

  /**
   * Remove registration
   */
  removeRegistration(sessionId, userId) {
    const registrations = this.registrations.get(sessionId);
    if (!registrations) return false;
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.participants = session.participants.filter(id => id !== userId);
      this.updateSession(sessionId, { participants: session.participants });
    }
    
    return registrations.delete(userId);
  }

  /**
   * Get all registrations for a session
   */
  getSessionRegistrations(sessionId) {
    const registrations = this.registrations.get(sessionId);
    if (!registrations) return [];
    return Array.from(registrations.values());
  }

  /**
   * Get all active sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Get open sessions
   */
  getOpenSessions() {
    return Array.from(this.sessions.values()).filter(s => s.status === 'open');
  }

  /**
   * Check if user is registered
   */
  isRegistered(sessionId, userId) {
    const registrations = this.registrations.get(sessionId);
    if (!registrations) return false;
    return registrations.has(userId);
  }

  /**
   * Get participant count
   */
  getParticipantCount(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    return session.participants.length;
  }
}

module.exports = RegistrationManager;