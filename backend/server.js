const express = require('express');
const cors = require('cors');
require('dotenv').config();

const learnerRoutes = require('./src/routes/learnerRoutes');
const courseRoutes = require('./src/routes/courseRoutes');
const enrollRoutes = require('./src/routes/enrollRoutes');
const lessonRoutes = require('./src/routes/lessonRoutes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Micro-Learning Progress Tracker API is running'
  });
});

app.use('/api/learners', learnerRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/lessons', lessonRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
