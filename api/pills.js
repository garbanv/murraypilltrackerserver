const { Pool } = require("pg")
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const result = await pool.query(
        "SELECT * FROM pills WHERE active = true ORDER BY created_at DESC",
      )
      res.status(200).json(result.rows)
    } catch (err) {
      console.error("Error fetching pills:", err)
      res.status(500).json({ error: "Failed to fetch pills" })
    }
  } else if (req.method === "POST") {
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
  } else {
    res.status(405).json({ error: "Method not allowed" })
  }
}
