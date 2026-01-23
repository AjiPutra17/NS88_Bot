// ============================================================================
// SESSION MANAGER
// ============================================================================

const config = require('../config/config');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> session data
    this.registrations = new Map(); // sessionId -> array of registrations
    this.counter = 1;
  }

  /**
   * Create new session
   */
  createSession(data) {
    const id = `SESSION-${this.counter++}`;
    const session = {
      id,
      ...data,
      status: 'open', // open, closed
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.sessions.set(id, session);
    this.registrations.set(id, []); // Initialize empty registrations array
    return session;
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
   * Close session
   */
  closeSession(id) {
    const session = this.sessions.get(id);
    if (session) {
      session.status = 'closed';
      session.closedAt = new Date();
      this.sessions.set(id, session);
    }
    return session;
  }

  /**
   * Add registration to session
   */
  addRegistration(sessionId, registration) {
    const registrationId = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const regData = {
      id: registrationId,
      sessionId,
      ...registration,
      status: 'pending', // pending, confirmed, rejected
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const registrations = this.registrations.get(sessionId) || [];
    registrations.push(regData);
    this.registrations.set(sessionId, registrations);
    
    return regData;
  }

  /**
   * Get all registrations for a session
   */
  getRegistrations(sessionId) {
    return this.registrations.get(sessionId) || [];
  }

  /**
   * Get registration by ID
   */
  getRegistration(registrationId) {
    for (const [sessionId, registrations] of this.registrations) {
      const registration = registrations.find(r => r.id === registrationId);
      if (registration) return registration;
    }
    return null;
  }

  /**
   * Update registration status
   */
  updateRegistrationStatus(registrationId, status, confirmedBy = null) {
    for (const [sessionId, registrations] of this.registrations) {
      const registration = registrations.find(r => r.id === registrationId);
      if (registration) {
        registration.status = status;
        registration.updatedAt = new Date();
        if (status === 'confirmed') {
          registration.confirmedBy = confirmedBy;
          registration.confirmedAt = new Date();
        }
        this.registrations.set(sessionId, registrations);
        return registration;
      }
    }
    return null;
  }

  /**
   * Get confirmed registrations count
   */
  getConfirmedCount(sessionId) {
    const registrations = this.registrations.get(sessionId) || [];
    return registrations.filter(r => r.status === 'confirmed').length;
  }

  /**
   * Get all sessions
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
}

module.exports = SessionManager;