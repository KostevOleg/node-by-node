import { BadRequestException, Injectable } from '@nestjs/common';
import { createRequire } from 'node:module';

type PdfParseResult = {
  text: string;
};

type PdfParseConstructor = new (params: { data: Buffer }) => {
  getText: () => Promise<PdfParseResult>;
  destroy: () => Promise<void>;
};

const nodeRequire = createRequire(__filename);
const { PDFParse } = nodeRequire('pdf-parse') as {
  PDFParse: PdfParseConstructor;
};

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
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();

      return this.normalizeText(result.text);
    } finally {
      await parser.destroy();
    }
  }

  private normalizeText(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();

    if (!normalized) {
      throw new BadRequestException('Document text is empty');
    }

    return normalized;
  }
}
