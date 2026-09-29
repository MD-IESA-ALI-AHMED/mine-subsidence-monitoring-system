/**
 * Validates and replaces req.body / req.query / req.params with the parsed zod output.
 * Usage: validate({ query: schema, body: schema })
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      for (const part of ['params', 'query', 'body']) {
        if (!schemas[part]) continue;
        const parsed = schemas[part].parse(req[part] ?? {});
        // req.query is a getter in Express 5; define it so this also works there.
        Object.defineProperty(req, part, { value: parsed, writable: true, configurable: true });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
