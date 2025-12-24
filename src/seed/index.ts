import {
  restaurantRepository,
  sectorRepository,
  tableRepository,
} from "../shared/repositories/index.js";
import { seedRestaurant, seedSectors, seedTables } from "./data.js";
import { logger } from "../shared/utils/logger.js";

export function loadSeedData(): void {
  restaurantRepository.create(seedRestaurant);
  logger.info(`Loaded restaurant: ${seedRestaurant.name}`);

  seedSectors.forEach((sector) => {
    sectorRepository.create(sector);
  });
  logger.info(`Loaded ${seedSectors.length} sectors`);

  seedTables.forEach((table) => {
    tableRepository.create(table);
  });
  logger.info(`Loaded ${seedTables.length} tables`);

  logger.info("Seed data loaded successfully");
}

