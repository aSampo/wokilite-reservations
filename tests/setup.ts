import { execSync } from "child_process";

export async function setup() {
  try {
    execSync("npx prisma migrate deploy", {
      stdio: "pipe",
      cwd: process.cwd(),
    });
  } catch (error) {
    console.warn("Migrations may have already been applied, continuing...");
  }
}
