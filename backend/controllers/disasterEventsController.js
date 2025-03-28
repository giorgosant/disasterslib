const pool = require('../db/pool');
const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const { Readable } = require('stream');
const path = require('path');



const getDisasterEvents = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM disaster_event');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch disaster events' });
  }
};

const getPoints = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.elstatlektiko,
        dt.short_title AS disaster_type,
        TO_CHAR(e.eventdate, 'YYYY-MM-DD') AS eventdate,
        TO_CHAR(e.eventenddate, 'YYYY-MM-DD') AS eventenddate,
        TO_CHAR(e.alertstartdate, 'YYYY-MM-DD') AS alertstartdate,
        TO_CHAR(e.alertenddate, 'YYYY-MM-DD') AS alertenddate,
        ST_AsGeoJSON(ST_Transform(s.geom_point, 4326)) AS geojson
      FROM disaster_event e
      JOIN spatial_reference s ON e.spatialref_fk = s.id
      JOIN disaster_type dt ON e.disastertype_fk = dt.id;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spatial references of type point:', err);
    res.status(500).json({ error: 'Failed to fetch spatial references of type point' });
  }
};

const getFiltered = async (req, res) => {
  const {
    disasterType1,
    disasterType2,
    eventStartDate,
    eventEndDate,
    alertStartDate,
    alertEndDate,
    selectedLocation
  } = req.query;

  try {
    const result = await pool.query(`
      SELECT
          e.id,
          s.elstatlektiko,
          e.spatialref_source,
          dt.short_title AS disaster_type,
          dt.un_ref_title_en AS disaster_type_en,
          TO_CHAR(e.eventdate, 'YYYY-MM-DD') AS eventdate,
          TO_CHAR(e.eventenddate, 'YYYY-MM-DD') AS eventenddate,
          TO_CHAR(e.alertstartdate, 'YYYY-MM-DD') AS alertstartdate,
          TO_CHAR(e.alertenddate, 'YYYY-MM-DD') AS alertenddate,
          TO_CHAR(e.publishdate, 'YYYY-MM-DD') AS publishdate,
          e.index_n,
          e.index_from,
          e.ada,
          e.infosource,
          e.infosourcetype,
          e.infosourcepublisher,
          e.infosourcelink,
          e.infosourcenotes,
          e.notes,
          TO_CHAR(e.discoverydate, 'YYYY-MM-DD') AS discoverydate,
          e.discoverymethod,
          e.confidence,
          e.discoverytool,
          e.discoverylog,
          e.discoverynotes,
          ST_AsGeoJSON(ST_Transform(s.geom_point, 4326)) AS geojson
      FROM 
          disaster_event e
      JOIN 
          spatial_reference s ON e.spatialref_fk = s.id
      JOIN 
          disaster_type dt ON e.disastertype_fk = dt.id
      LEFT JOIN 
          spatial_reference l ON l.id = $7
      WHERE 
          ($1::text IS NULL OR dt.short_title = $1::text OR dt.short_title = $2::text)  
          AND ($4::date IS NULL OR eventdate <= $4::date)  
          AND ($3::date IS NULL OR eventdate >= $3::date)  
          AND ($5::date IS NULL OR alertstartdate >= $5::date)  
          AND ($6::date IS NULL OR alertenddate <= $6::date)  
          AND (
              $7 IS NULL  
              OR (CAST(l.admlevel AS INT) < 6 AND ST_Within(s.geom_point, l.geom_polygon))  
              OR (CAST(l.admlevel AS INT) = 6 AND s.id = l.id)  
          );  
      `, [
      disasterType1 || null,
      disasterType2 || null,
      eventStartDate || null,
      eventEndDate || null,
      alertStartDate || null,
      alertEndDate || null,
      selectedLocation || null
    ]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching filtered events:', err);
    res.status(500).json({ error: 'Failed to fetch filtered events' });
  }
};


// controllers/disasterEventsController.js

const getCompared = async (req, res) => {
  const {
    disasterType1,
    disasterType2,
    eventStartDate,
    eventEndDate,
    alertStartDate,
    alertEndDate,
    selectedLocation,
    selectedPointId  // New parameter for the selected point
  } = req.query;

  // Validate that selectedPointId is provided
  if (!selectedPointId) {
    return res.status(400).json({ error: 'selectedPointId is required for comparison.' });
  }

  try {
    // Fetch the geometry and event date of the selected point
    const selectedPointResult = await pool.query(
      `SELECT s.geom_point, e.eventdate
       FROM spatial_reference s
       JOIN disaster_event e ON e.spatialref_fk = s.id
       WHERE e.id = $1`,
      [selectedPointId]
    );

    if (selectedPointResult.rows.length === 0) {
      return res.status(404).json({ error: 'Selected point not found.' });
    }

    const selectedPointGeom = selectedPointResult.rows[0].geom_point;
    const selectedEventDate = selectedPointResult.rows[0].eventdate;

    // Now, perform the main query with distance and date differences
    const result = await pool.query(`
      WITH selected_point AS (
        SELECT ST_Transform(geom_point, 4326) AS geom, eventdate AS selected_eventdate
        FROM spatial_reference
        JOIN disaster_event ON disaster_event.spatialref_fk = spatial_reference.id
        WHERE disaster_event.id = $8
    )
    SELECT
        e.id,
        s.elstatlektiko,
        e.spatialref_source,
        dt.short_title AS disaster_type,
        dt.un_ref_title_en AS disaster_type_en,
        TO_CHAR(e.eventdate, 'YYYY-MM-DD') AS eventdate,
        TO_CHAR(e.eventenddate, 'YYYY-MM-DD') AS eventenddate,
        TO_CHAR(e.alertstartdate, 'YYYY-MM-DD') AS alertstartdate,
        TO_CHAR(e.alertenddate, 'YYYY-MM-DD') AS alertenddate,
        TO_CHAR(e.publishdate, 'YYYY-MM-DD') AS publishdate,
        e.index_n,
        e.index_from,
        e.ada,
        e.infosource,
        e.infosourcetype,
        e.infosourcepublisher,
        e.infosourcelink,
        e.infosourcenotes,
        e.notes,
        TO_CHAR(e.discoverydate, 'YYYY-MM-DD') AS discoverydate,
        e.discoverymethod,
        e.confidence,
        e.discoverytool,
        e.discoverylog,
        e.discoverynotes,
        ST_AsGeoJSON(ST_Transform(s.geom_point, 4326)) AS geojson,
        ST_Distance(
          ST_Transform(s.geom_point, 4326)::geography,
          selected_point.geom::geography
        ) AS distance_meters,
        eventdate - selected_point.selected_eventdate AS days_difference
    FROM 
        disaster_event e
    JOIN 
        spatial_reference s ON e.spatialref_fk = s.id
    JOIN 
        disaster_type dt ON e.disastertype_fk = dt.id
    LEFT JOIN 
        spatial_reference l ON l.id = $7
    CROSS JOIN 
        selected_point
    WHERE 
        ($1::text IS NULL OR dt.short_title = $1::text OR dt.short_title = $2::text)  
        AND ($4::date IS NULL OR eventdate <= $4::date)  
        AND ($3::date IS NULL OR eventdate >= $3::date)  
        AND ($5::date IS NULL OR alertstartdate >= $5::date)  
        AND ($6::date IS NULL OR alertenddate <= $6::date)  
        AND (
            $7 IS NULL  
            OR (CAST(l.admlevel AS INT) < 6 AND ST_Within(s.geom_point, l.geom_polygon))  
            OR (CAST(l.admlevel AS INT) = 6 AND s.id = l.id)  
        )
        AND e.id != $8  
    ORDER BY distance_meters ASC, days_difference ASC;
    `, [
      disasterType1 || null,
      disasterType2 || null,
      eventStartDate || null,
      eventEndDate || null,
      alertStartDate || null,
      alertEndDate || null,
      selectedLocation || null,
      selectedPointId
    ]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching compared events:', err);
    res.status(500).json({ error: 'Failed to fetch compared events' });
  }
};

// Utility function to parse CSV buffer
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Utility function to parse XLSX buffer using ExcelJS
const parseXLSX = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0]; // Assuming data is in the first sheet
  const data = [];

  worksheet.eachRow((row, rowNumber) => {
    // Skip header row (assuming first row is headers)
    if (rowNumber === 1) return;

    const rowData = {};
    row.eachCell((cell, colNumber) => {
      const header = worksheet.getRow(1).getCell(colNumber).value;
      rowData[header] = cell.value;
    });
    data.push(rowData);
  });

  return data;
};

// Controller function to handle import
const importDisasterEvents = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const file = req.file;
  let data = [];

  try {
    // Determine file type and parse accordingly
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === '.csv') {
      data = await parseCSV(file.buffer);
    } else if (ext === '.xlsx') {
      data = await parseXLSX(file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload CSV or XLSX files.' });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'File is empty or improperly formatted.' });
    }

    // Validate required fields (all non-nullable fields must be present)
    const requiredFields = [
      'spatialref_fk',
      'disastertype_fk',
      'eventdate',
      'publishdate',
      'index_n',
      'index_from',
      'ada',
      'infosource',
      'infosourcetype',
      'infosourcepublisher',
      'infosourcelink',
      'discoverydate',
      'discoverymethod',
      'confidence',
    ];

    for (let field of requiredFields) {
      if (!data[0].hasOwnProperty(field)) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Extract unique foreign key IDs
      const spatialrefIds = [...new Set(data.map((row) => parseInt(row.spatialref_fk, 10)))];
      const disastertypeIds = [...new Set(data.map((row) => parseInt(row.disastertype_fk, 10)))];

      // Validate spatialref_fk
      const spatialrefResult = await client.query(
        'SELECT id FROM spatial_reference WHERE id = ANY($1::int[])',
        [spatialrefIds]
      );
      const validSpatialrefIds = spatialrefResult.rows.map((row) => row.id);

      const invalidSpatialrefIds = spatialrefIds.filter((id) => !validSpatialrefIds.includes(id));
      if (invalidSpatialrefIds.length > 0) {
        throw new Error(`Invalid spatialref_fk IDs found: ${invalidSpatialrefIds.join(', ')}`);
      }

      // Validate disastertype_fk
      const disastertypeResult = await client.query(
        'SELECT id FROM disaster_type WHERE id = ANY($1::int[])',
        [disastertypeIds]
      );
      const validDisastertypeIds = disastertypeResult.rows.map((row) => row.id);

      const invalidDisastertypeIds = disastertypeIds.filter((id) => !validDisastertypeIds.includes(id));
      if (invalidDisastertypeIds.length > 0) {
        throw new Error(`Invalid disastertype_fk IDs found: ${invalidDisastertypeIds.join(', ')}`);
      }

      // Prepare insert query
      const insertText = `
        INSERT INTO disaster_event 
          (spatialref_fk, disastertype_fk, spatialref_source, disastertype_source, 
           eventdate, eventenddate, alertstartdate, alertenddate, publishdate, 
           index_n, index_from, ada, infosource, infosourcetype, infosourcepublisher, 
           infosourcelink, infosourcenotes, notes, discoverydate, discoverymethod, 
           confidence, discoverytool, discoverylog, discoverynotes)
        VALUES 
          ($1, $2, $3, $4, 
          TO_DATE($5, 'DD/MM/YYYY'), TO_DATE($6, 'DD/MM/YYYY'), TO_DATE($7, 'DD/MM/YYYY'), 
          TO_DATE($8, 'DD/MM/YYYY'), TO_DATE($9, 'DD/MM/YYYY'), 
          $10, $11, $12, $13, $14, $15, $16, $17, $18, TO_DATE($19, 'DD/MM/YYYY'), $20, $21, $22, $23, $24)
      `;

      for (let row of data) {
        // Validate each row's required fields
        requiredFields.forEach((field) => {
          if (!row[field]) {
            throw new Error(`Missing required field '${field}' in row with eventdate: ${row.eventdate}`);
          }
        });

        console.log(insertText)

        await client.query(insertText, [
          parseInt(row.spatialref_fk, 10),
          parseInt(row.disastertype_fk, 10),
          row.spatialref_source || null,
          row.disastertype_source || null,
          row.eventdate,
          row.eventenddate || null,
          row.alertstartdate || null,
          row.alertenddate || null,
          row.publishdate,
          row.index_n,
          row.index_from,
          row.ada,
          row.infosource,
          row.infosourcetype,
          row.infosourcepublisher,
          row.infosourcelink,
          row.infosourcenotes || null,
          row.notes || null,
          row.discoverydate,
          row.discoverymethod,
          row.confidence,
          row.discoverytool || null,
          row.discoverylog || null,
          row.discoverynotes || null,
        ]);
      }

      // Commit transaction
      await client.query('COMMIT');
      res.json({ message: 'Import successful.' });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Import error:', error.message);
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing import:', error.message);
    res.status(500).json({ error: 'Failed to process import.' });
  }
};




module.exports = {
  getDisasterEvents,
  getPoints,
  getFiltered,
  getCompared,
  importDisasterEvents
};
