const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');

router.post('/:id/complete', lessonController.completeLesson);

module.exports = router;
