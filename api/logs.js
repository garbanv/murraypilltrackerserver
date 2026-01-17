const { Pool } = require("pg")
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

module.exports = async (req, res) => {
  if (req.method === "GET") {
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
      res.status(200).json(result.rows)
    } catch (err) {
      console.error("Error fetching logs:", err)
      res.status(500).json({ error: "Failed to fetch logs" })
    }
  } else if (req.method === "POST") {
    const { pillId, date, givenBy } = req.body

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
  } else {
    res.status(405).json({ error: "Method not allowed" })
  }
}
