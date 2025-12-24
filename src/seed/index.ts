import {
  restaurantRepository,
  sectorRepository,
  tableRepository,
} from "../shared/repositories";
import { seedRestaurant, seedSectors, seedTables } from "./data";
import { logger } from "../shared/utils/logger";

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

