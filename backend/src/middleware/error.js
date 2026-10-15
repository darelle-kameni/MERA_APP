export const notFound = (req, res) => res.status(404).json({ error: 'not_found', path: req.originalUrl });

export const errorHandler = (err, req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  const status = err.status || 500;
  // En production, ne jamais divulguer err.message (détails internes, Prisma…).
  const body = { error: err.code || 'internal_error' };
  if (process.env.NODE_ENV !== 'production') {
    body.message = err.message || 'Something went wrong';
  }
  res.status(status).json(body);
};
