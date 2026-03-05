const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

let pool;

async function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("No DATABASE_URL set");
    return;
  }
  console.log("Connecting to MySQL via DATABASE_URL...");
  pool = mysql.createPool(url);
  const [rows] = await pool.query("SELECT 1 AS ok");
  console.log("MySQL connected:", rows);
}

app.get("/", async (req, res) => {
  let dbStatus = "not configured";
  if (pool) {
    try {
      const [rows] = await pool.query("SELECT 1 AS ok");
      dbStatus = "connected";
    } catch (e) {
      dbStatus = "error: " + e.message;
    }
  }
  res.send("<h1>Embr MySQL Test</h1><p>Database: " + dbStatus + "</p>");
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

initDb()
  .then(() => app.listen(PORT, () => console.log("Server on port " + PORT)))
  .catch((e) => {
    console.error("DB init failed:", e.message);
    app.listen(PORT, () => console.log("Server on port " + PORT + " (no db)"));
  });
