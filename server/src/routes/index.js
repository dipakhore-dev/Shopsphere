import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import sellerRoutes from './seller.routes.js';
import cartRoutes from './cart.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import addressRoutes from './address.routes.js';
import orderRoutes from './order.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/sellers', sellerRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/addresses', addressRoutes);
router.use('/orders', orderRoutes);

// Later phases mount their modules here:
// router.use('/admin', adminRoutes);      // Phase 6
// router.use('/payments', paymentRoutes); // Phase 7

export default router;
