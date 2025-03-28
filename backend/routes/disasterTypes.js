const express = require('express');
const { getDisasterTypes } = require('../controllers/disasterTypesController');

const router = express.Router();

router.get('/', getDisasterTypes);

module.exports = router;
