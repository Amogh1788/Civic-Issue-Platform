const multer = require('multer');

// Wraps async route handlers so thrown errors reach the error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be smaller than 5 MB' : err.message;
    return res.status(400).json({ message });
  }

  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? 'Something went wrong on the server' : err.message });
}

// Throw this from routes for expected errors: throw httpError(400, 'Title is required')
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { asyncHandler, notFound, errorHandler, httpError };
