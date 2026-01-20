// ============================================================================
// SLOWMODE MANAGER
// ============================================================================

class SlowmodeManage {
  constructor() {
    this.userLastMessageTime = new Map();
    this.lastWarningMessages = new Map();
  }

  getKey(userId, channelId) {
    return `${userId}-${channelId}`;
  }

  setLastMessageTime(userId, channelId, time = Date.now()) {
    const key = this.getKey(userId, channelId);
    this.userLastMessageTime.set(key, time);
  }

  getLastMessageTime(userId, channelId) {
    const key = this.getKey(userId, channelId);
    return this.userLastMessageTime.get(key);
  }

  getRemainingTime(userId, channelId, duration) {
    const lastTime = this.getLastMessageTime(userId, channelId);
    if (!lastTime) return 0;
    
    const elapsed = (Date.now() - lastTime) / 1000;
    return Math.max(0, duration - elapsed);
  }

  setWarningMessage(channelId, messageId) {
    this.lastWarningMessages.set(channelId, messageId);
  }

  getWarningMessage(channelId) {
    return this.lastWarningMessages.get(channelId);
  }
}

module.exports = SlowmodeManage;