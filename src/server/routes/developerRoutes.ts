import { Router } from 'express';
import { developerController } from '../controllers/developerController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';
import { methodNotAllowedHandler } from '../middleware/errorHandler.ts';
import { idempotencyMiddleware } from '../middleware/idempotency.ts';
import { validate } from '../middleware/validate.ts';
import {
  createApiKeySchema,
  updateApiKeySchema,
  uuidParamSchema,
} from '../validators/schemas.ts';

export const developerRouter = Router();

developerRouter.use(requireAuth);

developerRouter
  .route('/api-keys')
  .get(developerController.listKeys)
  .post(
    idempotencyMiddleware,
    validate({ body: createApiKeySchema }),
    developerController.createKey
  )
  .all(methodNotAllowedHandler(['GET', 'POST']));

developerRouter
  .route('/api-keys/:id')
  .patch(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema, body: updateApiKeySchema }),
    developerController.updateKey
  )
  .delete(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema }),
    developerController.revokeKey
  )
  .all(methodNotAllowedHandler(['PATCH', 'DELETE']));

developerRouter
  .route('/api-keys/:id/regenerate')
  .post(
    idempotencyMiddleware,
    validate({ params: uuidParamSchema }),
    developerController.regenerateKey
  )
  .all(methodNotAllowedHandler(['POST']));

developerRouter
  .route('/analytics')
  .get(developerController.getAnalytics)
  .all(methodNotAllowedHandler(['GET']));
