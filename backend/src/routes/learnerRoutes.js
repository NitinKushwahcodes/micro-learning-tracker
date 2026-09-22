const express = require('express');
const router = express.Router();
const learnerController = require('../controllers/learnerController');

router.get('/', learnerController.getLearners);
router.get('/:id/progress', learnerController.getLearnerProgress);

module.exports = router;
