export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  requestId?: string;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  location?: 'body' | 'query' | 'params' | 'headers';
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ApiErrorDetail[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: ApiErrorDetail[] = []
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface AuthenticatedUser {
  id: string;
  uid: string | null;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
}

export interface ApiKeyContext {
  id: string;
  ownerId: string;
  name: string;
  keyPrefix: string;
  dailyQuota: number;
  requestsUsed: number;
}
