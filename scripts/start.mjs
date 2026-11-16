// Production entry point (used by `npm start` and IIS web.config).
// Applies pending database migrations, then starts Next.js in this same process.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runMigrations } from "./migrate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  // Migrations aren't in git: each PC creates its own from schema.prisma.
  // Safe changes (new tables/columns) are applied automatically. A change that
  // can lose data is refused here (no one is there to confirm it).
  await runMigrations({ autoCreate: true });
} catch (err) {
  console.error(`[migrate] ${err.message}`);
  process.exit(1);
}

// Hand over to `next start` (reads PORT from the environment, as before).
process.chdir(root);
process.argv = [process.argv[0], "next", "start", ...process.argv.slice(2)];
await import(pathToFileURL(path.join(root, "node_modules", "next", "dist", "bin", "next")).href);
