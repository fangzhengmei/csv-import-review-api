const STATUS = {
  PENDING: 'pending',
  PREVIEWED: 'previewed',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IMPORTED: 'imported'
};

const STATUS_TRANSITIONS = {
  [STATUS.PENDING]: {
    canTransitions: [STATUS.PREVIEWED],
    description: '初始状态，等待预览'
  },
  [STATUS.PREVIEWED]: {
    canTransitions: [STATUS.REVIEWING],
    description: '预览完成，可提交审核'
  },
  [STATUS.REVIEWING]: {
    canTransitions: [STATUS.APPROVED, STATUS.REJECTED],
    description: '审核中，可通过或拒绝'
  },
  [STATUS.APPROVED]: {
    canTransitions: [STATUS.IMPORTED],
    description: '审核通过，可确认导入'
  },
  [STATUS.REJECTED]: {
    canTransitions: [STATUS.PREVIEWED],
    description: '审核拒绝，可重新预览后提交'
  },
  [STATUS.IMPORTED]: {
    canTransitions: [],
    description: '已导入，最终状态'
  }
};

class StatusMachine {
  static get STATUS() {
    return STATUS;
  }

  static get TRANSITIONS() {
    return STATUS_TRANSITIONS;
  }

  static canTransition(fromStatus, toStatus) {
    const fromConfig = STATUS_TRANSITIONS[fromStatus];
    if (!fromConfig) {
      return false;
    }
    return fromConfig.canTransitions.includes(toStatus);
  }

  static getValidNextStatuses(currentStatus) {
    const config = STATUS_TRANSITIONS[currentStatus];
    if (!config) {
      return [];
    }
    return config.canTransitions;
  }

  static isTerminalStatus(status) {
    const config = STATUS_TRANSITIONS[status];
    if (!config) {
      return false;
    }
    return config.canTransitions.length === 0;
  }

  static validateTransition(fromStatus, toStatus) {
    if (!STATUS_TRANSITIONS[fromStatus]) {
      return { valid: false, message: `无效的状态: ${fromStatus}` };
    }
    
    if (!STATUS_TRANSITIONS[toStatus]) {
      return { valid: false, message: `无效的目标状态: ${toStatus}` };
    }

    if (!this.canTransition(fromStatus, toStatus)) {
      const nextStatuses = this.getValidNextStatuses(fromStatus);
      return {
        valid: false,
        message: `无法从 "${fromStatus}" 状态转换到 "${toStatus}" 状态。允许的目标状态: ${nextStatuses.join(', ') || '无'}`
      };
    }

    return { valid: true };
  }

  static getAllStatuses() {
    return Object.values(STATUS);
  }

  static isValidStatus(status) {
    return Object.values(STATUS).includes(status);
  }
}

module.exports = StatusMachine;
