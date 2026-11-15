import { Router } from 'express';
import * as ctrl from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireApprovedSeller } from '../middleware/seller.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  createProductSchema,
  listQuerySchema,
  suggestionQuerySchema,
  updateProductSchema,
} from '../validators/product.validator.js';

const router = Router();

// ----- public -----
router.get('/', validate({ query: listQuerySchema }), ctrl.listProducts);
router.get('/suggestions', validate({ query: suggestionQuerySchema }), ctrl.suggestProducts); // must be before /:id
router.get('/:id', validate({ params: idParamSchema }), ctrl.getProduct);

// ----- seller: manage OWN products -----
const sellerOnly = [authenticate, authorize(ROLES.SELLER), requireApprovedSeller];

router.post('/', ...sellerOnly, validate({ body: createProductSchema }), ctrl.createProduct);
router.patch('/:id', ...sellerOnly, validate({ params: idParamSchema, body: updateProductSchema }), ctrl.updateProduct);
router.delete('/:id', ...sellerOnly, validate({ params: idParamSchema }), ctrl.deleteProduct);

export default router;
