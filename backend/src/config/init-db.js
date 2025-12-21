const mysql = require("mysql2/promise");
const sequelize = require("./db");
const db = require("../models");

async function initDB() {
  try {
    console.log("🔍 Checking if database exists...");

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    console.log(`Database '${process.env.DB_NAME}' is ready.`);

    await connection.end();

    console.log("Syncing Sequelize models...");
    await sequelize.sync({ alter: true });

    console.log("Database initialized and synced successfully!");
    
  } catch (error) {
    console.error("DB initialization failed:", error);
    process.exit(1);
  }
}

module.exports = { initDB };
