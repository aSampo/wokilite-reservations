import { Sector } from "../types";

class SectorRepository {
  private sectors: Map<string, Sector> = new Map();

  create(sector: Sector): Sector {
    this.sectors.set(sector.id, sector);
    return sector;
  }

  findById(id: string): Sector | undefined {
    return this.sectors.get(id);
  }

  findAll(): Sector[] {
    return Array.from(this.sectors.values());
  }

  findByRestaurantId(restaurantId: string): Sector[] {
    return Array.from(this.sectors.values()).filter(
      (sector) => sector.restaurantId === restaurantId
    );
  }

  update(id: string, sector: Sector): Sector | undefined {
    if (!this.sectors.has(id)) {
      return undefined;
    }
    this.sectors.set(id, sector);
    return sector;
  }

  delete(id: string): boolean {
    return this.sectors.delete(id);
  }

  clear(): void {
    this.sectors.clear();
  }
}

export const sectorRepository = new SectorRepository();

