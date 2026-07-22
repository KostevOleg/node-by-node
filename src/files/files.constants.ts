export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_FILE_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
  '.txt',
]);

export const ALLOWED_FILE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

export const DANGEROUS_FILE_EXTENSIONS = new Set([
  '.php',
  '.exe',
  '.js',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.html',
  '.svg',
]);
