import { Table } from "../types/index.js";
import { tableRepository, reservationRepository } from "../repositories/index.js";
import { addMinutes, parseISO } from "date-fns";
import { config } from "../../config/index.js";
import { formatInTimezone } from "../utils/timezone.js";

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
  // Step 1: Get all tables in this sector
  const tables = tableRepository.findBySectorId(sectorId);

  if (tables.length === 0) {
    return { tableIds: [], reason: "no_tables_in_sector" };
  }

  // Step 2: Calculate reservation end time
  const startDate = parseISO(startISO);
  const endDate = addMinutes(startDate, config.defaultDurationMinutes);
  const endISO = formatInTimezone(endDate, timezone);

  // Step 3: Find all overlapping reservations (single query - O(R))
  const overlappingReservations = reservationRepository.findOverlapping(
    sectorId,
    startISO,
    endISO
  );

  // Step 4: Build a Set of occupied table IDs for O(1) lookups
  const occupiedTableIds = new Set(
    overlappingReservations.flatMap((r) => r.tableIds)
  );

  // Step 5: Filter tables that fit party size and are not occupied
  const availableTables = tables.filter(
    (table) =>
      table.minSize <= partySize &&
      table.maxSize >= partySize &&
      !occupiedTableIds.has(table.id)
  );

  if (availableTables.length === 0) {
    return { tableIds: [], reason: "no_capacity" };
  }

  // Step 6: Sort by best-fit (minimize wasted capacity)
  availableTables.sort((a, b) => {
    const wasteA = a.maxSize - partySize;
    const wasteB = b.maxSize - partySize;
    // Primary: prefer table with least waste
    if (wasteA !== wasteB) return wasteA - wasteB;
    // Tiebreaker: prefer smaller table
    return a.maxSize - b.maxSize;
  });

  // Step 7: Return the best-fit table
  return { tableIds: [availableTables[0].id] };
}
