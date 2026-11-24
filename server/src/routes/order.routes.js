import { Router } from 'express';
import * as ctrl from '../controllers/order.controller.js';
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.js';
import { requireIdempotencyKey } from '../middleware/idempotency.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.validator.js';
import { cancelOrderSchema, createOrderSchema, listOrdersQuerySchema, previewSchema } from '../validators/order.validator.js';

const router = Router();
router.use(authenticate, authorize(ROLES.CUSTOMER, ROLES.SELLER));

router.post('/preview', validate({ body: previewSchema }), ctrl.previewCheckout);
router.post('/', orderLimiter, requireVerifiedEmail, requireIdempotencyKey, validate({ body: createOrderSchema }), ctrl.createOrder);
router.get('/my', validate({ query: listOrdersQuerySchema }), ctrl.listMyOrders); // before /:id
router.get('/:id', validate({ params: idParamSchema }), ctrl.getMyOrder);
router.patch('/:id/cancel', validate({ params: idParamSchema, body: cancelOrderSchema }), ctrl.cancelOrder);

export default router;
