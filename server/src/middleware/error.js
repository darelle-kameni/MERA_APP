export const notFound = (req, res) => res.status(404).json({ error: 'not_found', path: req.originalUrl });

export const errorHandler = (err, req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({
    error: err.code || 'internal_error',
    message: err.message || 'Something went wrong',
  });
};
