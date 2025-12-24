import { Restaurant } from "../types";

class RestaurantRepository {
  private restaurants: Map<string, Restaurant> = new Map();

  create(restaurant: Restaurant): Restaurant {
    this.restaurants.set(restaurant.id, restaurant);
    return restaurant;
  }

  findById(id: string): Restaurant | undefined {
    return this.restaurants.get(id);
  }

  findAll(): Restaurant[] {
    return Array.from(this.restaurants.values());
  }

  update(id: string, restaurant: Restaurant): Restaurant | undefined {
    if (!this.restaurants.has(id)) {
      return undefined;
    }
    this.restaurants.set(id, restaurant);
    return restaurant;
  }

  delete(id: string): boolean {
    return this.restaurants.delete(id);
  }

  clear(): void {
    this.restaurants.clear();
  }
}

export const restaurantRepository = new RestaurantRepository();

