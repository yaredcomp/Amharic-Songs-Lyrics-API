import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

export const docsRouter = Router();

const openApiPath = path.resolve(process.cwd(), 'openapi.yaml');
const postmanPath = path.resolve(process.cwd(), 'postman_collection.json');

function loadOpenApiSpec(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(openApiPath, 'utf8');
    return YAML.parse(raw) as Record<string, unknown>;
  } catch {
    return {
      openapi: '3.1.0',
      info: { title: 'Amharic Lyrics API Platform', version: '1.0.0' },
      paths: {},
    };
  }
}

docsRouter.get('/openapi.yaml', (_req, res) => {
  if (!fs.existsSync(openApiPath)) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'OpenAPI spec not found', details: [] },
    });
  }
  res.setHeader('Content-Type', 'application/yaml; charset=utf-8');
  return res.sendFile(openApiPath);
});

docsRouter.get('/openapi.json', (_req, res) => {
  return res.json(loadOpenApiSpec());
});

docsRouter.get('/postman-collection.json', (_req, res) => {
  if (!fs.existsSync(postmanPath)) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Postman collection not found', details: [] },
    });
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="amharic-lyrics-api.postman_collection.json"');
  return res.sendFile(postmanPath);
});

const openApiSpec = loadOpenApiSpec();

docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Amharic Lyrics API — Swagger UI',
    swaggerOptions: {
      url: '',
      validatorUrl: null,
      persistAuthorization: true,
    },
  })
);
