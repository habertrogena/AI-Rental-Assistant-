import { RentalEntry } from "../parser/excelParser";


let rentalData: RentalEntry[] = [];

export const setRentalData = (data: RentalEntry[]) => {
  rentalData = data;
};

export const getRentalData = () => rentalData;
