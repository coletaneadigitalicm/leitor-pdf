export function isValidPdfUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:';
  } catch {
    return false;
  }
}
