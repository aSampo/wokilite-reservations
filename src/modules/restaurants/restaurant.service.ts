import { Restaurant, Sector } from "../../shared/types/index.js";
import {
  restaurantRepository,
  sectorRepository,
} from "../../shared/repositories/index.js";

export interface RestaurantInfo {
  restaurant: Restaurant;
  sectors: Sector[];
}

class RestaurantService {
  async getRestaurantInfo(restaurantId: string): Promise<RestaurantInfo | null> {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      return null;
    }

    const sectors = await sectorRepository.findByRestaurantId(restaurantId);

    return {
      restaurant,
      sectors,
    };
  }
}

export const restaurantService = new RestaurantService();
