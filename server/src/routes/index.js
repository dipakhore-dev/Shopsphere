import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import sellerRoutes from './seller.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/sellers', sellerRoutes);

// Later phases mount their modules here:
// router.use('/cart', cartRoutes);        // Phase 4
// router.use('/orders', orderRoutes);     // Phase 4
// router.use('/admin', adminRoutes);      // Phase 6
// router.use('/payments', paymentRoutes); // Phase 7

export default router;
