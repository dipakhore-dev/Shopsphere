import { Router } from 'express';
import * as ctrl from '../controllers/wishlist.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';
import { productIdParamSchema } from '../validators/common.validator.js';

const router = Router();
router.use(authenticate, authorize(ROLES.CUSTOMER, ROLES.SELLER));

router.get('/', ctrl.getWishlist);
router.get('/ids', ctrl.getWishlistIds);
router.post('/:productId', validate({ params: productIdParamSchema }), ctrl.addToWishlist);
router.delete('/:productId', validate({ params: productIdParamSchema }), ctrl.removeFromWishlist);

export default router;
