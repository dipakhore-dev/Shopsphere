import { Router } from 'express';
import * as ctrl from '../controllers/seller.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { requireApprovedSeller } from '../middleware/seller.js';
import { productImageUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.validator.js';
import { sellerListQuerySchema } from '../validators/product.validator.js';

const router = Router();

// Everything under /api/sellers requires an approved seller.
router.use(authenticate, authorize(ROLES.SELLER), requireApprovedSeller);

router.get('/products', validate({ query: sellerListQuerySchema }), ctrl.listMyProducts);
router.post('/products/images', uploadLimiter, productImageUpload, ctrl.uploadProductImages);
router.get('/products/:id', validate({ params: idParamSchema }), ctrl.getMyProduct);

// Phase 5 adds: /dashboard, /orders, /analytics, /earnings, /profile

export default router;
