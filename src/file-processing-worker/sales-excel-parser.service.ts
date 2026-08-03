import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

export type SalesExcelParseResult = {
  totalQuantity: number;
  totalRevenue: string;
};

const REQUIRED_COLUMNS = {
  quantity: 'quantity',
  unitPrice: 'unitPrice',
} as const;

@Injectable()
export class SalesExcelParserService {
  async parse(buffer: Buffer): Promise<SalesExcelParseResult> {
    const workbook = new ExcelJS.Workbook();
    const workbookBuffer = buffer as unknown as Parameters<
      typeof workbook.xlsx.load
    >[0];

    await workbook.xlsx.load(workbookBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException(
        'Excel file must contain at least one sheet',
      );
    }

    const headerMap = this.getHeaderMap(worksheet.getRow(1));
    const quantityColumn = this.getRequiredColumnIndex(
      headerMap,
      REQUIRED_COLUMNS.quantity,
    );
    const unitPriceColumn = this.getRequiredColumnIndex(
      headerMap,
      REQUIRED_COLUMNS.unitPrice,
    );

    let totalQuantity = 0;
    let totalRevenue = 0;
    let rowsProcessed = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || this.isEmptyRow(row)) {
        return;
      }

      const quantity = this.getNumberCellValue(
        row.getCell(quantityColumn),
        rowNumber,
        REQUIRED_COLUMNS.quantity,
      );
      const unitPrice = this.getNumberCellValue(
        row.getCell(unitPriceColumn),
        rowNumber,
        REQUIRED_COLUMNS.unitPrice,
      );

      totalQuantity += quantity;
      totalRevenue += quantity * unitPrice;
      rowsProcessed += 1;
    });

    if (rowsProcessed === 0) {
      throw new BadRequestException('Excel file must contain sales rows');
    }

    return {
      totalQuantity,
      totalRevenue: totalRevenue.toFixed(2),
    };
  }

  private getHeaderMap(row: ExcelJS.Row): Map<string, number> {
    const headers = new Map<string, number>();

    row.eachCell((cell, columnNumber) => {
      const header = this.normalizeHeader(cell.value);

      if (header) {
        headers.set(header, columnNumber);
      }
    });

    return headers;
  }

  private getRequiredColumnIndex(
    headerMap: Map<string, number>,
    columnName: string,
  ): number {
    const columnIndex = headerMap.get(columnName.toLowerCase());

    if (!columnIndex) {
      throw new BadRequestException(
        `Excel file is missing required column: ${columnName}`,
      );
    }

    return columnIndex;
  }

  private getNumberCellValue(
    cell: ExcelJS.Cell,
    rowNumber: number,
    columnName: string,
  ): number {
    const value = this.unwrapCellValue(cell.value);
    const numberValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value.trim())
          : Number.NaN;

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new BadRequestException(
        `Invalid ${columnName} value at row ${rowNumber}`,
      );
    }

    return numberValue;
  }

  private normalizeHeader(value: ExcelJS.CellValue): string {
    const unwrapped = this.unwrapCellValue(value);

    if (
      typeof unwrapped !== 'string' &&
      typeof unwrapped !== 'number' &&
      typeof unwrapped !== 'boolean'
    ) {
      return '';
    }

    return String(unwrapped).trim().toLowerCase();
  }

  private unwrapCellValue(value: ExcelJS.CellValue): unknown {
    if (value && typeof value === 'object') {
      if ('result' in value) {
        return value.result;
      }

      if ('text' in value) {
        return value.text;
      }

      if ('richText' in value) {
        return value.richText.map((part) => part.text).join('');
      }
    }

    return value;
  }

  private isEmptyRow(row: ExcelJS.Row): boolean {
    let hasValue = false;

    row.eachCell((cell) => {
      if (this.normalizeHeader(cell.value) !== '') {
        hasValue = true;
      }
    });

    return !hasValue;
  }
}
