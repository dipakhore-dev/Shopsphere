import { Router } from 'express';
import * as ctrl from '../controllers/address.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator.js';
import { idParamSchema } from '../validators/common.validator.js';

const router = Router();
router.use(authenticate, authorize(ROLES.CUSTOMER, ROLES.SELLER));

router.get('/', ctrl.listAddresses);
router.post('/', validate({ body: createAddressSchema }), ctrl.createAddress);
router.patch('/:id', validate({ params: idParamSchema, body: updateAddressSchema }), ctrl.updateAddress);
router.delete('/:id', validate({ params: idParamSchema }), ctrl.deleteAddress);

export default router;
