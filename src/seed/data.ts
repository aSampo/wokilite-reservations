import { Restaurant, Sector, Table } from "../shared/types";

export const seedRestaurant: Restaurant = {
  id: "R1",
  name: "Bistro Central",
  timezone: "America/Argentina/Buenos_Aires",
  shifts: [
    { start: "12:00", end: "16:00" },
    { start: "20:00", end: "23:45" },
  ],
  createdAt: "2025-09-08T00:00:00-03:00",
  updatedAt: "2025-09-08T00:00:00-03:00",
};

export const seedSectors: Sector[] = [
  {
    id: "S1",
    restaurantId: "R1",
    name: "Main Hall",
    createdAt: "2025-09-08T00:00:00-03:00",
    updatedAt: "2025-09-08T00:00:00-03:00",
  },
  {
    id: "S2",
    restaurantId: "R1",
    name: "Terrace",
    createdAt: "2025-09-08T00:00:00-03:00",
    updatedAt: "2025-09-08T00:00:00-03:00",
  },
];

export const seedTables: Table[] = [
  {
    id: "T1",
    sectorId: "S1",
    name: "Table 1",
    minSize: 2,
    maxSize: 2,
    createdAt: "2025-09-08T00:00:00-03:00",
    updatedAt: "2025-09-08T00:00:00-03:00",
  },
  {
    id: "T2",
    sectorId: "S1",
    name: "Table 2",
    minSize: 2,
    maxSize: 4,
    createdAt: "2025-09-08T00:00:00-03:00",
    updatedAt: "2025-09-08T00:00:00-03:00",
  },
  {
    id: "T3",
    sectorId: "S1",
    name: "Table 3",
    minSize: 2,
    maxSize: 4,
    createdAt: "2025-09-08T00:00:00-03:00",
    updatedAt: "2025-09-08T00:00:00-03:00",
  },
  {
    id: "T4",
    sectorId: "S1",
    name: "Table 4",
    minSize: 4,
    maxSize: 6,
    createdAt: "2025-09-08T00:00:00-03:00",
    updatedAt: "2025-09-08T00:00:00-03:00",
  },
  {
    id: "T5",
    sectorId: "S2",
    name: "Table 5",
    minSize: 2,
    maxSize: 2,
    createdAt: "2025-09-08T00:00:00-03:00",
    updatedAt: "2025-09-08T00:00:00-03:00",
  },
];
