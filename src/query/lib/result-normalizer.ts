export class ResultNormalizer {
  static normalize(rows: any[]): any[] {
    return rows.map(row => this.normalizeRow(row));
  }

  private static normalizeRow(row: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = this.normalizeValue(value);
    }
    return normalized;
  }

  private static normalizeValue(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (Buffer.isBuffer(value)) {
      return '0x' + value.toString('hex');
    }

    if (Array.isArray(value)) {
      return value.map(item => this.normalizeValue(item));
    }

    if (typeof value === 'object' && value !== null) {
      // Handle potential nested objects (JSON/JSONB columns)
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return String(value);
      }
    }

    return value;
  }
}
