import { randomUUID } from "crypto";

export function generateId(prefix: string): string {
  const uuid = randomUUID().split("-")[0];
  return `${prefix}_${uuid}`;
}
