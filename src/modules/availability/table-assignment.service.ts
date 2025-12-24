import { Table } from "../../shared/types";
import {
  tableRepository,
  reservationRepository,
} from "../../shared/repositories";
import { addMinutes, parseISO } from "date-fns";
import { config } from "../../config";
import { formatInTimezone } from "../../shared/utils/timezone";

export interface TableAssignmentResult {
  tableIds: string[];
  reason?: string;
}

export function findAvailableTable(
  sectorId: string,
  startISO: string,
  partySize: number,
  timezone: string
): TableAssignmentResult {
  const tables = tableRepository.findBySectorId(sectorId);

  if (tables.length === 0) {
    return { tableIds: [], reason: "no_tables_in_sector" };
  }

  const startDate = parseISO(startISO);
  const endDate = addMinutes(startDate, config.defaultDurationMinutes);
  const endISO = formatInTimezone(endDate, timezone);

  const suitableTables = tables.filter(
    (table) => table.minSize <= partySize && table.maxSize >= partySize
  );

  if (suitableTables.length === 0) {
    return { tableIds: [], reason: "no_suitable_capacity" };
  }

  suitableTables.sort((a, b) => {
    const wasteA = a.maxSize - partySize;
    const wasteB = b.maxSize - partySize;
    if (wasteA !== wasteB) return wasteA - wasteB;
    return a.maxSize - b.maxSize;
  });

  for (const table of suitableTables) {
    const overlapping = reservationRepository.findOverlapping(
      sectorId,
      startISO,
      endISO
    );

    const isTableOccupied = overlapping.some((reservation) =>
      reservation.tableIds.includes(table.id)
    );

    if (!isTableOccupied) {
      return { tableIds: [table.id] };
    }
  }

  return { tableIds: [], reason: "no_capacity" };
}

export function isTableAvailable(
  tableId: string,
  sectorId: string,
  startISO: string,
  endISO: string,
  excludeReservationId?: string
): boolean {
  const overlapping = reservationRepository.findOverlapping(
    sectorId,
    startISO,
    endISO,
    excludeReservationId
  );

  return !overlapping.some((reservation) =>
    reservation.tableIds.includes(tableId)
  );
}
