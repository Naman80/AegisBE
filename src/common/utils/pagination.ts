export function clampLimit(limit: number | undefined, fallback = 25, max = 100) {
  if (!limit || Number.isNaN(limit)) {
    return fallback;
  }

  return Math.min(Math.max(limit, 1), max);
}

export function clampOffset(offset: number | undefined) {
  if (!offset || Number.isNaN(offset) || offset < 0) {
    return 0;
  }

  return offset;
}
