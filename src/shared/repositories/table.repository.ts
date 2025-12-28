import { Table } from "../types/index.js";
import { prisma } from "../db/prisma.js";

class TableRepository {
  async create(table: Table): Promise<Table> {
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

    return table;
  }

  async findById(id: string): Promise<Table | undefined> {
    const result = await prisma.table.findUnique({
      where: { id },
    });

    if (!result) return undefined;

    return this.mapToDomain(result);
  }

  async findAll(): Promise<Table[]> {
    const results = await prisma.table.findMany();
    return results.map((t) => this.mapToDomain(t));
  }

  async findBySectorId(sectorId: string): Promise<Table[]> {
    const results = await prisma.table.findMany({
      where: { sectorId },
    });
    return results.map((t) => this.mapToDomain(t));
  }

  async findByIds(ids: string[]): Promise<Table[]> {
    const results = await prisma.table.findMany({
      where: { id: { in: ids } },
    });
    return results.map((t) => this.mapToDomain(t));
  }

  async update(id: string, table: Table): Promise<Table | undefined> {
    const existing = await prisma.table.findUnique({ where: { id } });
    if (!existing) return undefined;

    await prisma.table.update({
      where: { id },
      data: {
        name: table.name,
        minSize: table.minSize,
        maxSize: table.maxSize,
        updatedAt: table.updatedAt,
      },
    });

    return table;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.table.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await prisma.table.deleteMany();
  }

  private mapToDomain(db: {
    id: string;
    sectorId: string;
    name: string;
    minSize: number;
    maxSize: number;
    createdAt: string;
    updatedAt: string;
  }): Table {
    return {
      id: db.id,
      sectorId: db.sectorId,
      name: db.name,
      minSize: db.minSize,
      maxSize: db.maxSize,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }
}

export const tableRepository = new TableRepository();
