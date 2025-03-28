const pool = require('../db/pool');

const getspatialRef = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM spatial_reference');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch spatialRef' });
  }
};

const getspatialRefByAdminLevel = async (req, res) => {
  const { adminLevel } = req.params;
  try {
    const result = await pool.query('SELECT id, elstatlektiko FROM spatial_reference WHERE admlevel = $1', [adminLevel]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spatialRef by admin level:', err);
    res.status(500).json({ error: 'Failed to fetch spatialRef' });
  }
};

// Route to get the selected location's polygon (or point for level 6)
const getLocationPolygon = async (req, res) => {
  const { locationId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.elstatlektiko,
        CASE 
          WHEN CAST(s.admlevel AS INT) < 6 THEN ST_AsGeoJSON(ST_Transform(s.geom_polygon, 4326))  -- Return polygon for levels 1-5
          ELSE ST_AsGeoJSON(ST_Transform(s.geom_point, 4326))  -- Return point for level 6
        END AS geojson
      FROM 
        spatial_reference s
      WHERE 
        s.id = $1::int
    `, [locationId]);

    res.json(result.rows[0]);  // Return the polygon or point
  } catch (err) {
    console.error('Error fetching location polygon:', err);
    res.status(500).json({ error: 'Failed to fetch location polygon' });
  }
};


module.exports = {
  getspatialRef,
  getspatialRefByAdminLevel,
  getLocationPolygon
};
