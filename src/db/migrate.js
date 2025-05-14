const fs = require("fs");
const path = require("path");
const db = require("../config/database");

async function migrate() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, "migrations.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    await db.query(migrationSQL);
    console.log("Database migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
