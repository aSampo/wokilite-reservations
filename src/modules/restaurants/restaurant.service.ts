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
  getRestaurantInfo(restaurantId: string): RestaurantInfo | null {
    const restaurant = restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      return null;
    }

    const sectors = sectorRepository.findByRestaurantId(restaurantId);

    return {
      restaurant,
      sectors,
    };
  }
}

export const restaurantService = new RestaurantService();
