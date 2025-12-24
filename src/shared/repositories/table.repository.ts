import { Table } from "../types";

class TableRepository {
  private tables: Map<string, Table> = new Map();

  create(table: Table): Table {
    this.tables.set(table.id, table);
    return table;
  }

  findById(id: string): Table | undefined {
    return this.tables.get(id);
  }

  findAll(): Table[] {
    return Array.from(this.tables.values());
  }

  findBySectorId(sectorId: string): Table[] {
    return Array.from(this.tables.values()).filter(
      (table) => table.sectorId === sectorId
    );
  }

  findByIds(ids: string[]): Table[] {
    return ids
      .map((id) => this.tables.get(id))
      .filter((table): table is Table => table !== undefined);
  }

  update(id: string, table: Table): Table | undefined {
    if (!this.tables.has(id)) {
      return undefined;
    }
    this.tables.set(id, table);
    return table;
  }

  delete(id: string): boolean {
    return this.tables.delete(id);
  }

  clear(): void {
    this.tables.clear();
  }
}

export const tableRepository = new TableRepository();
