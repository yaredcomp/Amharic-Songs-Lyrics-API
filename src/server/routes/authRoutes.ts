import { Router } from 'express';
import { authController } from '../controllers/authController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';
import { methodNotAllowedHandler } from '../middleware/errorHandler.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.ts';
import { validate } from '../middleware/validate.ts';
import {
  bootstrapAdminSchema,
  googleLoginSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/schemas.ts';

export const authRouter = Router();

authRouter
  .route('/google/config')
  .get(authController.googleConfig)
  .all(methodNotAllowedHandler(['GET']));

authRouter
  .route('/google')
  .post(validate({ body: googleLoginSchema }), authController.googleLogin)
  .all(methodNotAllowedHandler(['POST']));

authRouter
  .route('/register')
  .post(idempotencyMiddleware, validate({ body: registerSchema }), authController.register)
  .all(methodNotAllowedHandler(['POST']));

authRouter
  .route('/login')
  .post(validate({ body: loginSchema }), authController.login)
  .all(methodNotAllowedHandler(['POST']));

authRouter
  .route('/refresh')
  .post(validate({ body: refreshTokenSchema }), authController.refresh)
  .all(methodNotAllowedHandler(['POST']));

authRouter
  .route('/logout')
  .post(authController.logout)
  .all(methodNotAllowedHandler(['POST']));

authRouter
  .route('/me')
  .get(requireAuth, authController.me)
  .patch(requireAuth, validate({ body: updateProfileSchema }), authController.updateMe)
  .all(methodNotAllowedHandler(['GET', 'PATCH']));

authRouter
  .route('/bootstrap-status')
  .get(authController.bootstrapStatus)
  .all(methodNotAllowedHandler(['GET']));

authRouter
  .route('/bootstrap-admin')
  .post(validate({ body: bootstrapAdminSchema }), authController.bootstrapAdmin)
  .all(methodNotAllowedHandler(['POST']));
