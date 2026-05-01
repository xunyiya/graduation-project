import { parse } from 'csv-parse/sync';

import type { TableMatrix } from './tableDiff.service.js';

export function parseCsvText(text: string): TableMatrix {
  const records = parse(text, {
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: false
  }) as unknown[][];

  return records.map((row) => row.map((cell) => String(cell ?? '')));
}
