const pool = require('../db/pool');

const getDisasterTypes = async (req, res) => {
  try {
    const result = await pool.query('SELECT short_title FROM disaster_type');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching disaster types:', err);
    res.status(500).json({ error: 'Failed to fetch disaster types' });
  }
};

module.exports = {
  getDisasterTypes,
};
