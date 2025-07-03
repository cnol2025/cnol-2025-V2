import fs from 'fs';
import { parse } from 'csv-parse/sync';

export default function handler(req, res) {
  try {
    const csvContent = fs.readFileSync('data/a_traiter.csv', 'utf8');
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true });
    res.status(200).json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 