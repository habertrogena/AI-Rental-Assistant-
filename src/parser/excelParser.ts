import * as xlsx from "xlsx";

export interface RentalRecord {
  estate: string;
  unit: string;
  rent: number;
  paid: number;
  balance: number;
}

const TARGET_SHEET = "REHOBOTH";

// Handles variations in header naming
const UNIT_KEYS = [
  "Hse No",
  "HOUSE NO",
  "House No",
  "Unit No",
  "Unit",
  "House",
];
const RENT_KEYS = ["Rent", "RENT"];
const PAID_KEYS = ["Paid", "PAID"];
const BALANCE_KEYS = ["Balance", "BALANCE"];

function getColumnValue(row: any, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return undefined;
}

export async function parseRentalExcel(
  filePath: string
): Promise<RentalRecord[]> {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames.find(
    (name) => name.trim().toUpperCase() === TARGET_SHEET
  );

  if (!sheetName) {
    console.warn(`❌ Sheet "${TARGET_SHEET}" not found.`);
    return [];
  }

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json<any>(worksheet, { defval: "" });

  const allRecords: RentalRecord[] = [];

  for (const row of jsonData) {
    const unit = getColumnValue(row, UNIT_KEYS);
    const rent = parseFloat(getColumnValue(row, RENT_KEYS) || "0");
    const paid = parseFloat(getColumnValue(row, PAID_KEYS) || "0");
    const balance = parseFloat(getColumnValue(row, BALANCE_KEYS) || "0");

    if (!unit || (rent === 0 && paid === 0 && balance === 0)) continue;

    allRecords.push({
      estate: TARGET_SHEET,
      unit: String(unit).trim(),
      rent,
      paid,
      balance,
    });
  }

  return allRecords;
}
