import { Router } from 'express';
import * as ctrl from '../controllers/cart.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';
import { addCartItemSchema, updateCartItemSchema } from '../validators/cart.validator.js';
import { idParamSchema } from '../validators/common.validator.js';

const router = Router();

// Customers and sellers can shop (a seller still cannot buy their own products). Admins cannot.
router.use(authenticate, authorize(ROLES.CUSTOMER, ROLES.SELLER));

router.get('/', ctrl.getCart);
router.delete('/', ctrl.clearCart);
router.post('/items', validate({ body: addCartItemSchema }), ctrl.addItem);
// ":id" is the PRODUCT id (a cart holds each product once)
router.patch('/items/:id', validate({ params: idParamSchema, body: updateCartItemSchema }), ctrl.updateItem);
router.delete('/items/:id', validate({ params: idParamSchema }), ctrl.removeItem);

export default router;
