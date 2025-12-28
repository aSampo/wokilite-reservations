import { Restaurant } from "../types/index.js";
import { prisma } from "../db/prisma.js";

class RestaurantRepository {
  async create(restaurant: Restaurant): Promise<Restaurant> {
    const shiftsJson = restaurant.shifts
      ? JSON.stringify(restaurant.shifts)
      : null;

    await prisma.restaurant.create({
      data: {
        id: restaurant.id,
        name: restaurant.name,
        timezone: restaurant.timezone,
        shifts: shiftsJson,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
      },
    });

    return restaurant;
  }

  async findById(id: string): Promise<Restaurant | undefined> {
    const result = await prisma.restaurant.findUnique({
      where: { id },
    });

    if (!result) return undefined;

    return this.mapToDomain(result);
  }

  async findAll(): Promise<Restaurant[]> {
    const results = await prisma.restaurant.findMany();
    return results.map((r) => this.mapToDomain(r));
  }

  async update(
    id: string,
    restaurant: Restaurant
  ): Promise<Restaurant | undefined> {
    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) return undefined;

    const shiftsJson = restaurant.shifts
      ? JSON.stringify(restaurant.shifts)
      : null;

    await prisma.restaurant.update({
      where: { id },
      data: {
        name: restaurant.name,
        timezone: restaurant.timezone,
        shifts: shiftsJson,
        updatedAt: restaurant.updatedAt,
      },
    });

    return restaurant;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.restaurant.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await prisma.restaurant.deleteMany();
  }

  private mapToDomain(db: {
    id: string;
    name: string;
    timezone: string;
    shifts: string | null;
    createdAt: string;
    updatedAt: string;
  }): Restaurant {
    return {
      id: db.id,
      name: db.name,
      timezone: db.timezone,
      shifts: db.shifts ? JSON.parse(db.shifts) : undefined,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }
}

export const restaurantRepository = new RestaurantRepository();
