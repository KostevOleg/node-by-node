import { Injectable } from '@nestjs/common';

@Injectable()
export class TextChunkerService {
  split(text: string): string[] {
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end).trim();

      if (chunk) {
        chunks.push(chunk);
      }

      if (end === text.length) {
        break;
      }

      start = end - overlap;
    }

    return chunks;
  }
}
