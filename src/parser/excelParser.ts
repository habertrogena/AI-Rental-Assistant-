import ExcelJS from "exceljs";

export interface RentalEntry {
  source: string; // Sheet name
  sheetType: "summary" | "detailed";
  unit: string;
  tenant?: string; // Optional (if available in detailed sheets later)
  month: string; // e.g. "JAN"
  expectedRent: number;
  amountPaid: number;
  balance: number;
  water?: number; // Only for detailed sheets
}

export async function parseRentalExcel(
  filePath: string
): Promise<RentalEntry[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const allData: RentalEntry[] = [];

  for (const sheet of workbook.worksheets) {
    const name = sheet.name.trim().toUpperCase();

    // Skip sheets that are too small
    if (sheet.rowCount < 5) continue;

    // === 1. Monthly Summary Sheets ===
    if (
      name.startsWith("JAN") ||
      name.startsWith("FEB") ||
      name.startsWith("MAR") ||
      name.startsWith("APR") ||
      name.startsWith("MAY")
    ) {
      const headerRow = sheet.getRow(3); // Expect headers around row 3
      const headers: string[] = [];

      if (Array.isArray(headerRow.values)) {
        for (const cell of headerRow.values) {
          if (typeof cell === "string") {
            headers.push(cell.toLowerCase().trim());
          } else if (typeof cell === "number") {
            headers.push(cell.toString());
          } else {
            headers.push("");
          }
        }
      } else {
        console.warn("⚠️ headerRow.values is not an array");
      }


      const unitIdx = headers.findIndex((h) => h.includes("house"));
      const rentIdx = headers.findIndex((h) => h.includes("rent"));
      const paidIdx = headers.findIndex((h) => h.includes("paid"));
      const balanceIdx = headers.findIndex((h) => h.includes("balance"));

      if ([unitIdx, rentIdx, paidIdx, balanceIdx].some((i) => i < 1)) {
        console.warn(`⚠️ Skipping summary sheet "${name}" — missing headers.`);
        continue;
      }

      sheet.eachRow((row, rowIndex) => {
        if (rowIndex <= 3) return; // Skip headers

        const unit = row.getCell(unitIdx).text.trim();
        const rent = parseFloat(row.getCell(rentIdx).text || "0");
        const paid = parseFloat(row.getCell(paidIdx).text || "0");
        const balance = parseFloat(row.getCell(balanceIdx).text || "0");

        if (unit) {
          allData.push({
            source: name,
            sheetType: "summary",
            unit,
            month: name.split(" ")[0],
            expectedRent: isNaN(rent) ? 0 : rent,
            amountPaid: isNaN(paid) ? 0 : paid,
            balance: isNaN(balance) ? 0 : balance,
          });
        }
      });

      // === 2. Detailed Per-Property Sheets ===
    } else if (sheet.columnCount > 10) {
      const headerRow = sheet.getRow(6); // Headers are on row 6 (index 6)
      const monthHeaders = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY"];

      const monthPositions: { [month: string]: number } = {};
      headerRow.eachCell((cell, colNumber) => {
        const value = String(cell.value || "")
          .toUpperCase()
          .trim();
        if (monthHeaders.includes(value)) {
          monthPositions[value] = colNumber;
        }
      });

      for (let rowIndex = 7; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        const unit = row.getCell(3).text.trim();
        const tenant = row.getCell(4)?.text?.trim?.(); // optional

        if (!unit) continue;

        for (const [month, startCol] of Object.entries(monthPositions)) {
          try {
            const payable = parseFloat(row.getCell(startCol + 1).text || "0");
            const paid = parseFloat(row.getCell(startCol + 2).text || "0");
            const rent = parseFloat(row.getCell(startCol + 3).text || "0");
            const water = parseFloat(row.getCell(startCol + 4).text || "0");
            const balance = parseFloat(row.getCell(startCol + 5).text || "0");

            if (!isNaN(paid) || !isNaN(rent)) {
              allData.push({
                source: name,
                sheetType: "detailed",
                unit,
                tenant,
                month: month.slice(0, 3).toUpperCase(),
                expectedRent: isNaN(rent) ? 0 : rent,
                amountPaid: isNaN(paid) ? 0 : paid,
                water: isNaN(water) ? 0 : water,
                balance: isNaN(balance) ? 0 : balance,
              });
            }
          } catch (err) {
            console.warn(`⚠️ Skipping malformed row in ${name}:`, err);
          }
        }
      }
    } else {
      console.warn(`⚠️ Skipping unknown or unsupported sheet: "${name}"`);
    }
  }

  return allData;
}
