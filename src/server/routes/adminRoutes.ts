import { Router } from 'express';
import { adminController } from '../controllers/adminController.ts';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.ts';
import { methodNotAllowedHandler } from '../middleware/errorHandler.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.ts';
import { validate } from '../middleware/validate.ts';
import {
  auditLogsQuerySchema,
  createApiKeySchema,
  createLyricsSchema,
  lyricsQuerySchema,
  patchLyricsSchema,
  updateApiKeySchema,
  updateLyricsSchema,
  uuidParamSchema,
} from '../validators/schemas.ts';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter
  .route('/lyrics')
  .get(validate({ query: lyricsQuerySchema }), adminController.listLyrics)
  .post(
    idempotencyMiddleware,
    validate({ body: createLyricsSchema }),
    adminController.createLyrics
  )
  .all(methodNotAllowedHandler(['GET', 'POST']));

adminRouter
  .route('/lyrics/:id')
  .put(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema, body: updateLyricsSchema }),
    adminController.updateLyrics
  )
  .patch(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema, body: patchLyricsSchema }),
    adminController.updateLyrics
  )
  .delete(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema }),
    adminController.deleteLyrics
  )
  .all(methodNotAllowedHandler(['PUT', 'PATCH', 'DELETE']));

adminRouter
  .route('/stats')
  .get(adminController.getStats)
  .all(methodNotAllowedHandler(['GET']));

adminRouter
  .route('/api-keys')
  .get(adminController.listApiKeys)
  .post(
    idempotencyMiddleware,
    validate({ body: createApiKeySchema }),
    adminController.createApiKey
  )
  .all(methodNotAllowedHandler(['GET', 'POST']));

adminRouter
  .route('/api-keys/:id')
  .patch(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema, body: updateApiKeySchema }),
    adminController.updateApiKey
  )
  .delete(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema }),
    adminController.deleteApiKey
  )
  .all(methodNotAllowedHandler(['PATCH', 'DELETE']));

adminRouter
  .route('/api-keys/:id/regenerate')
  .post(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema }),
    adminController.regenerateApiKey
  )
  .all(methodNotAllowedHandler(['POST']));

adminRouter
  .route('/audit-logs')
  .get(validate({ query: auditLogsQuerySchema }), adminController.listAuditLogs)
  .all(methodNotAllowedHandler(['GET']));
