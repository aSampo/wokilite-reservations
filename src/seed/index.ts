import { seedRestaurant, seedSectors, seedTables } from "./data.js";
import { logger } from "../shared/utils/logger.js";
import { prisma } from "../shared/db/prisma.js";

export async function loadSeedData(): Promise<void> {
  try {
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: seedRestaurant.id },
    });

    if (!existingRestaurant) {
      const shiftsJson = seedRestaurant.shifts
        ? JSON.stringify(seedRestaurant.shifts)
        : null;

      await prisma.restaurant.create({
        data: {
          id: seedRestaurant.id,
          name: seedRestaurant.name,
          timezone: seedRestaurant.timezone,
          shifts: shiftsJson,
          createdAt: seedRestaurant.createdAt,
          updatedAt: seedRestaurant.updatedAt,
        },
      });
      logger.info(`Loaded restaurant: ${seedRestaurant.name}`);
    } else {
      logger.info(`Restaurant ${seedRestaurant.name} already exists`);
    }

    for (const sector of seedSectors) {
      const existing = await prisma.sector.findUnique({
        where: { id: sector.id },
      });
      if (!existing) {
        await prisma.sector.create({
          data: {
            id: sector.id,
            restaurantId: sector.restaurantId,
            name: sector.name,
            createdAt: sector.createdAt,
            updatedAt: sector.updatedAt,
          },
        });
      }
    }
    logger.info(`Loaded ${seedSectors.length} sectors`);

    for (const table of seedTables) {
      const existing = await prisma.table.findUnique({
        where: { id: table.id },
      });
      if (!existing) {
        await prisma.table.create({
          data: {
            id: table.id,
            sectorId: table.sectorId,
            name: table.name,
            minSize: table.minSize,
            maxSize: table.maxSize,
            createdAt: table.createdAt,
            updatedAt: table.updatedAt,
          },
        });
      }
    }
    logger.info(`Loaded ${seedTables.length} tables`);

    logger.info("Seed data loaded successfully");
  } catch (error) {
    logger.error({ error }, "Failed to load seed data");
    throw error;
  }
}
