import { z } from 'zod';
import { MAX_PRODUCT_IMAGES } from '../utils/constants.js';
import { isAllowedImageUrl } from '../services/imageStorage.service.js';
import { objectId, optionalQuery } from './common.validator.js';

const noAngleBrackets = (v) => !/[<>]/.test(v);
const paise = z.number({ invalid_type_error: 'Must be a number' }).int('Must be a whole number of paise').min(100, 'Minimum is 100 paise (Rs 1)').max(100_000_000, 'Maximum is Rs 10,00,000');

const image = z.object({
  url: z
    .string()
    .url()
    .max(500)
    .refine(isAllowedImageUrl, 'Images must be uploaded through ShopSphere'),
  publicId: z
    .string()
    .max(200)
    .regex(/^shopsphere\/products\/[a-f0-9]{24}\/[A-Za-z0-9_-]+$/, 'Invalid image id'),
});

const productBase = z.object({
  name: z.string().trim().min(3).max(150).refine(noAngleBrackets, 'Name cannot contain < or >'),
  description: z.string().trim().min(10).max(5000).refine(noAngleBrackets, 'Description cannot contain < or >'),
  category: objectId,
  brand: z.string().trim().min(1).max(60).refine(noAngleBrackets, 'Brand cannot contain < or >'),
  price: paise,
  discountPrice: paise.nullable(),
  stock: z.number().int().min(0).max(100_000),
  lowStockThreshold: z.number().int().min(0).max(1000),
  status: z.enum(['active', 'inactive']),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10),
  specifications: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(50),
        value: z.string().trim().min(1).max(200),
      }),
    )
    .max(20),
  images: z.array(image).min(1, 'Add at least one image').max(MAX_PRODUCT_IMAGES),
});

const discountBelowPrice = (v) => v.discountPrice == null || v.price == null || v.discountPrice < v.price;
const discountMessage = { message: 'Discount price must be lower than the price', path: ['discountPrice'] };

// Fields NOT listed here (seller, store, averageRating, soldCount, moderationStatus...) are stripped by Zod,
// so a seller can never set them. This is the protection against mass assignment.
export const createProductSchema = productBase
  .partial({ discountPrice: true, lowStockThreshold: true, status: true, tags: true, specifications: true })
  .refine(discountBelowPrice, discountMessage);

export const updateProductSchema = productBase.partial().refine(discountBelowPrice, discountMessage);

// ---------- query strings ----------

export const SORT_OPTIONS = ['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'popularity'];

export const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(12),
    q: optionalQuery(z.string().trim().min(1).max(100)),
    category: optionalQuery(z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(80)),
    minPrice: optionalQuery(z.coerce.number().int().min(0)),
    maxPrice: optionalQuery(z.coerce.number().int().min(0)),
    minRating: optionalQuery(z.coerce.number().min(0).max(5)),
    inStock: optionalQuery(z.enum(['true', 'false']).transform((v) => v === 'true')),
    sort: optionalQuery(z.enum(SORT_OPTIONS)),
  })
  .refine((v) => v.minPrice == null || v.maxPrice == null || v.minPrice <= v.maxPrice, {
    message: 'minPrice cannot be greater than maxPrice',
    path: ['maxPrice'],
  });

export const suggestionQuerySchema = z.object({
  q: z.string().trim().min(2).max(50),
});

export const sellerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: optionalQuery(z.string().trim().min(1).max(100)),
  status: optionalQuery(z.enum(['active', 'inactive', 'all'])),
});
