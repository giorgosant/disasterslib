const express = require('express');
const { getspatialRef, getspatialRefByAdminLevel, getLocationPolygon } = require('../controllers/spatialRefController');

const router = express.Router();

router.get('/', getspatialRef);
router.get('/:adminLevel', getspatialRefByAdminLevel);
router.get('/locationPolygon/:locationId', getLocationPolygon)

module.exports = router;
