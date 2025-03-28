const express = require('express');
const upload = require('../middleware/upload');
const { getDisasterEvents, getPoints, getFiltered, getCompared,importDisasterEvents } = require('../controllers/disasterEventsController');

const router = express.Router();

router.get('/', getDisasterEvents);
router.get('/points', getPoints);
router.get('/filtered', getFiltered);
router.get('/compared',getCompared);
router.post('/import', upload.single('file'), importDisasterEvents);

module.exports = router;
