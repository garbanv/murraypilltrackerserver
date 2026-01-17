require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Error connecting to the database", err)
  } else {
    console.log("Database connected successfully")
  }
})

// ============================================
// PILLS ENDPOINTS
// ============================================

// Get all active pills
app.get("/api/pills", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pills WHERE active = true ORDER BY created_at DESC",
    )
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching pills:", err)
    res.status(500).json({ error: "Failed to fetch pills" })
  }
})

// Create new pill
app.post("/api/pills", async (req, res) => {
  const { name } = req.body

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Pill name is required" })
  }

  try {
    const result = await pool.query(
      "INSERT INTO pills (name, active) VALUES ($1, true) RETURNING *",
      [name.trim()],
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating pill:", err)
    res.status(500).json({ error: "Failed to create pill" })
  }
})

// Update pill (deactivate)
app.put("/api/pills/:id", async (req, res) => {
  const { id } = req.params
  const { active } = req.body

  try {
    const result = await pool.query(
      "UPDATE pills SET active = $1 WHERE id = $2 RETURNING *",
      [active, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pill not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error("Error updating pill:", err)
    res.status(500).json({ error: "Failed to update pill" })
  }
})

// ============================================
// PILL LOGS ENDPOINTS
// ============================================

// Get pill logs for a date range
app.get("/api/logs", async (req, res) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: "Start date and end date are required" })
  }

  try {
    const result = await pool.query(
      `SELECT pl.id, pl.pill_id, 
              TO_CHAR(pl.date, 'YYYY-MM-DD') as date,
              pl.given_by, pl.timestamp, 
              p.name as pill_name 
       FROM pill_logs pl 
       JOIN pills p ON pl.pill_id = p.id 
       WHERE pl.date >= $1 AND pl.date <= $2 
       ORDER BY pl.date DESC`,
      [startDate, endDate],
    )
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching logs:", err)
    res.status(500).json({ error: "Failed to fetch logs" })
  }
})

// Create pill log (mark as given)
app.post("/api/logs", async (req, res) => {
  const { pillId, date, givenBy } = req.body
  console.log(pillId, date, givenBy)
  if (!pillId || !date) {
    return res.status(400).json({ error: "Pill ID and date are required" })
  }

  try {
    const result = await pool.query(
      `INSERT INTO pill_logs (pill_id, date, given_by) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (pill_id, date) DO NOTHING 
       RETURNING *`,
      [pillId, date, givenBy || "User"],
    )

    if (result.rows.length === 0) {
      return res
        .status(409)
        .json({ error: "Log already exists for this pill on this date" })
    }

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error("Error creating log:", err)
    res.status(500).json({ error: "Failed to create log" })
  }
})

// Delete pill log (unmark as given)
app.delete("/api/logs/:pillId/:date", async (req, res) => {
  const { pillId, date } = req.params

  try {
    const result = await pool.query(
      "DELETE FROM pill_logs WHERE pill_id = $1 AND date = $2 RETURNING *",
      [pillId, date],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Log not found" })
    }

    res.json({ message: "Log deleted successfully", log: result.rows[0] })
  } catch (err) {
    console.error("Error deleting log:", err)
    res.status(500).json({ error: "Failed to delete log" })
  }
})

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
