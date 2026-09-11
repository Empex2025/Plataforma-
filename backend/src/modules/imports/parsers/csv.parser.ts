import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import { parse } from 'csv-parse';
import { IImportParser, RawImportRow } from '../imports.types.js';

@Injectable()
export class CsvImportParser implements IImportParser {
  supports(format: string): boolean {
    return format === 'csv';
  }

  async *parse(stream: Readable): AsyncGenerator<RawImportRow, void, undefined> {
    const parser = stream.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }),
    );

    let lineNumber = 1; // header is line 1

    for await (const record of parser) {
      lineNumber++;
      yield {
        lineNumber,
        data: record as Record<string, string>,
      };
    }
  }
}
