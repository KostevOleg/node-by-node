export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_FILE_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
  '.txt',
  '.xlsx',
  '.md',
]);

export const ALLOWED_FILE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/markdown',
]);

export const FILE_EXTENSION_MIME_TYPES = new Map<string, string[]>([
  ['.pdf', ['application/pdf']],
  ['.doc', ['application/msword']],
  [
    '.docx',
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ],
  [
    '.xlsx',
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ],
  ['.png', ['image/png']],
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.txt', ['text/plain']],
  ['.md', ['text/plain', 'text/markdown']],
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
