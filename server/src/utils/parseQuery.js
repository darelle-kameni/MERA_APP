// Translate Base44-style list/filter args to Prisma options.
// Frontend calls: list("-created_date", 50)  →  orderBy desc, take 50
//                 list("created_date", 10)   →  orderBy asc, take 10
//                 filter({status: "x"}, "-created_date", 20)
export const parseListQuery = (req) => {
  const orderRaw = req.query.order;
  const limitRaw = req.query.limit;
  const filterRaw = req.query.filter;

  const opts = {};

  if (orderRaw) {
    const desc = orderRaw.startsWith('-');
    const field = desc ? orderRaw.slice(1) : orderRaw;
    opts.orderBy = { [field]: desc ? 'desc' : 'asc' };
  }

  if (limitRaw) {
    const n = parseInt(limitRaw, 10);
    if (Number.isFinite(n) && n > 0) opts.take = n;
  }

  if (filterRaw) {
    try {
      const parsed = typeof filterRaw === 'string' ? JSON.parse(filterRaw) : filterRaw;
      if (parsed && typeof parsed === 'object') opts.where = parsed;
    } catch {
      // ignore malformed filter
    }
  }

  return opts;
};
