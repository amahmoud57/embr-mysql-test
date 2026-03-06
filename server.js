const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

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

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", async (req, res) => {
  let dbStatus = "not configured";
  if (pool) {
    try {
      await pool.query("SELECT 1 AS ok");
      dbStatus = "connected";
    } catch (e) {
      dbStatus = "error: " + e.message;
    }
  }
  res.json({ status: "ok", database: dbStatus, engine: "mysql" });
});

// Todo CRUD
app.get("/api/todos", async (req, res) => {
  if (!pool) return res.json([]);
  const [rows] = await pool.query("SELECT * FROM todos ORDER BY created_at DESC");
  res.json(rows);
});

app.post("/api/todos", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const [result] = await pool.query("INSERT INTO todos (title) VALUES (?)", [title]);
  const [rows] = await pool.query("SELECT * FROM todos WHERE id = ?", [result.insertId]);
  res.status(201).json(rows[0]);
});

app.delete("/api/todos/:id", async (req, res) => {
  await pool.query("DELETE FROM todos WHERE id = ?", [parseInt(req.params.id)]);
  res.status(204).send();
});

// DB info endpoint
app.get("/api/db/info", async (req, res) => {
  if (!pool) return res.json({ status: "no database" });
  try {
    const [todos] = await pool.query("SELECT COUNT(*) AS count FROM todos");
    const [users] = await pool.query("SELECT COUNT(*) AS count FROM users");
    res.json({
      engine: "mysql",
      tables: { todos: todos[0].count, users: users[0].count },
      databaseUrl: process.env.DATABASE_URL ? "(set)" : "(not set)",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDb()
  .then(() => app.listen(PORT, "0.0.0.0", () => console.log("Server on port " + PORT)))
  .catch((e) => {
    console.error("DB init failed:", e.message);
    app.listen(PORT, "0.0.0.0", () => console.log("Server on port " + PORT + " (no db)"));
  });
