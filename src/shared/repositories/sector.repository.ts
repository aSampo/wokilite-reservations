import { Sector } from "../types/index.js";
import { prisma } from "../db/prisma.js";

class SectorRepository {
  async create(sector: Sector): Promise<Sector> {
    await prisma.sector.create({
      data: {
        id: sector.id,
        restaurantId: sector.restaurantId,
        name: sector.name,
        createdAt: sector.createdAt,
        updatedAt: sector.updatedAt,
      },
    });

    return sector;
  }

  async findById(id: string): Promise<Sector | undefined> {
    const result = await prisma.sector.findUnique({
      where: { id },
    });

    if (!result) return undefined;

    return this.mapToDomain(result);
  }

  async findAll(): Promise<Sector[]> {
    const results = await prisma.sector.findMany();
    return results.map((s) => this.mapToDomain(s));
  }

  async findByRestaurantId(restaurantId: string): Promise<Sector[]> {
    const results = await prisma.sector.findMany({
      where: { restaurantId },
    });
    return results.map((s) => this.mapToDomain(s));
  }

  async update(id: string, sector: Sector): Promise<Sector | undefined> {
    const existing = await prisma.sector.findUnique({ where: { id } });
    if (!existing) return undefined;

    await prisma.sector.update({
      where: { id },
      data: {
        name: sector.name,
        updatedAt: sector.updatedAt,
      },
    });

    return sector;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.sector.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await prisma.sector.deleteMany();
  }

  private mapToDomain(db: {
    id: string;
    restaurantId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  }): Sector {
    return {
      id: db.id,
      restaurantId: db.restaurantId,
      name: db.name,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }
}

export const sectorRepository = new SectorRepository();

