/** An expected problem that is reported to the user without a stack trace. */
export class BreaklogError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BreaklogError';
  }
}
