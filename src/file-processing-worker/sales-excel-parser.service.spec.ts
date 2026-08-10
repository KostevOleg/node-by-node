import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { SalesExcelParserService } from './sales-excel-parser.service';

async function createWorkbookBuffer(rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales');

  worksheet.addRows(rows);

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
}

describe('SalesExcelParserService', () => {
  const service = new SalesExcelParserService();

  it('calculates total quantity and total revenue', async () => {
    const buffer = await createWorkbookBuffer([
      ['quantity', 'unitPrice'],
      [2, 10],
      [3, 15.5],
    ]);

    await expect(service.parse(buffer)).resolves.toEqual({
      totalQuantity: 5,
      totalRevenue: '66.50',
    });
  });

  it('rejects files without required columns', async () => {
    const buffer = await createWorkbookBuffer([
      ['quantity', 'price'],
      [2, 10],
    ]);

    await expect(service.parse(buffer)).rejects.toThrow(BadRequestException);
  });
});
