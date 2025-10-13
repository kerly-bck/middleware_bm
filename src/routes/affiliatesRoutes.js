const express = require('express');
const router = express.Router();
const affiliatesController = require('../controllers/affiliatesController');

router.post('/check', affiliatesController.checkAffiliate); // principal
router.post('/force-register', affiliatesController.forceRegister); // opcional: forzar registro manual

module.exports = router;
