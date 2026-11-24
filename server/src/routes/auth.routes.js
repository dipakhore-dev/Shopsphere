import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { authLimiter, emailLimiter, refreshLimiter, resendIpLimiter, resendUserLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.get('/csrf', ctrl.getCsrfToken);

router.post('/register', authLimiter, validate({ body: registerSchema }), ctrl.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/refresh', refreshLimiter, ctrl.refresh);
router.get('/me', authenticate, ctrl.me);

router.post('/forgot-password', emailLimiter, validate({ body: forgotPasswordSchema }), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), ctrl.resetPassword);
router.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), ctrl.verifyEmail);
// Works logged in ({}) and logged out ({ email }); the logged-out answer never reveals whether the account exists.
router.post(
  '/resend-verification',
  optionalAuthenticate,
  resendIpLimiter,
  resendUserLimiter,
  validate({ body: resendVerificationSchema }),
  ctrl.resendVerification,
);
router.get('/verification-status', authenticate, ctrl.verificationStatus);

export default router;
