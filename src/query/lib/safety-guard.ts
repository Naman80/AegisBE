import { ForbiddenQueryException } from '../exceptions/forbidden-query.exception.js';

const BLOCKED_PATTERNS = [
  /^\s*DROP\s/i,
  /^\s*TRUNCATE\s/i,
  /^\s*ALTER\s/i,
  /^\s*DELETE\s+FROM\s+(?!.*\bWHERE\b)/i, // DELETE without WHERE (simplified)
];

export class SafetyGuard {
  static validate(query: string, options?: { allowDangerous?: boolean }): void {
    if (options?.allowDangerous) return;

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(query)) {
        throw new ForbiddenQueryException(query);
      }
    }
  }
}
