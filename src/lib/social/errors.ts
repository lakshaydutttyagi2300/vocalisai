// How an agent tells the orchestrator what to do with a failure.
export class TransientError extends Error {} // retry later with back-off (network, 429, 5xx)
export class PermanentError extends Error {} // retrying cannot help (bad token, rejected content)
export class BlockedError extends Error { // not a failure: wait (kill switch, budget, mode)
  constructor(message: string, public until?: Date) { super(message); }
}
