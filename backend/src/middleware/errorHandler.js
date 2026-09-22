function errorHandler(err, req, res, next) {
  console.error(err.stack || err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    error: message
  });
}

module.exports = errorHandler;
