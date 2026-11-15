/**
 * validate({ body, query, params }) parses each part with its Zod schema and
 * REPLACES it with the parsed result. Unknown fields are stripped, so clients
 * cannot smuggle extra properties (e.g. role: "admin") into controllers.
 * Zod errors flow to the central error handler -> 400.
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    if (schemas.query) req.query = schemas.query.parse(req.query ?? {});
    if (schemas.params) req.params = schemas.params.parse(req.params ?? {});
    next();
  } catch (err) {
    next(err);
  }
};
