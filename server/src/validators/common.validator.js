import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
export const idParamSchema = z.object({ id: objectId });

/** Query strings: treat "?q=" (empty) like "not provided". */
export const optionalQuery = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

export const productIdParamSchema = z.object({ productId: objectId });
