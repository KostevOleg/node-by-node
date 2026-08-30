import { BadRequestException, Injectable } from '@nestjs/common';
import { createRequire } from 'node:module';

type PdfParseResult = {
  text: string;
};

type PdfParse = (buffer: Buffer) => Promise<PdfParseResult>;

const nodeRequire = createRequire(__filename);
const pdfParse = nodeRequire('pdf-parse') as PdfParse;

@Injectable()
export class DocumentParserService {
  async parse(buffer: Buffer, extension: string): Promise<string> {
    if (extension === '.txt' || extension === '.md') {
      const text = buffer.toString('utf-8').trim();

      if (!text) {
        throw new BadRequestException('Document text is empty');
      }

      return text;
    }

    if (extension === '.pdf') {
      return this.parsePdf(buffer);
    }
    throw new BadRequestException('Unsupported document type');
  }
  private async parsePdf(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);

    return this.normalizeText(result.text);
  }

  private normalizeText(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();

    if (!normalized) {
      throw new BadRequestException('Document text is empty');
    }

    return normalized;
  }
}
