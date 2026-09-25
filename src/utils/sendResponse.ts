import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { InvalidParam, ProblemDetails } from '../schemas/problemDetails.schema';

// HTTP Status codes type
export type HttpStatus =
  | 200
  | 201
  | 204 // Success
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 429 // Client Errors
  | 500
  | 502
  | 503; // Server Errors

export const createApiResponse = <T extends z.ZodTypeAny>(data: T) => {
  return z.object({
    isSuccess: z.boolean().openapi({
      description: 'Whether the request was successful',
      example: true,
    }),
    status: z.number().openapi({
      description: 'The HTTP status code',
      example: 200,
      format: 'int32',
      minimum: 100,
      maximum: 599,
    }),
    data: data,
    message: z.string().openapi({
      description: 'The message of the response',
      example: 'Success',
      format: 'text',
    }),
  });
};

export const createPaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) => {
  return z.object({
    items: z.array(itemSchema).openapi({
      description: 'List of items for the current page',
    }),
    total_count: z.number().openapi({
      description: 'Total number of items matching the query',
      example: 42,
      format: 'int32',
      minimum: 0,
    }),
    limit: z.number().openapi({
      description: 'Maximum number of items per page',
      example: 20,
      format: 'int32',
      minimum: 1,
      maximum: 100,
    }),
    offset: z.number().openapi({
      description: 'Offset of the first item on this page',
      example: 0,
      format: 'int32',
      minimum: 0,
    }),
  });
};

// Response interface for legacy endpoints
interface ApiResponse<T = any> {
  isSuccess: boolean;
  status: HttpStatus;
  data: T;
  message: string;
}

const statusMessages: Record<number, string> = {
  200: 'Success',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

const problemTypeSlugs: Record<number, string> = {
  400: 'bad-request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  422: 'unprocessable-entity',
  429: 'too-many-requests',
  500: 'internal-server-error',
};

/**
 * Zalando RESTful Guideline (Rule 176): Return RFC 7807 Problem Details
 */
export const sendProblemDetails = (
  c: Context,
  status: HttpStatus,
  detail: string,
  options?: {
    title?: string;
    type?: string;
    invalidParams?: InvalidParam[];
    instance?: string;
    retryAfter?: number;
  }
): Response => {
  const title = options?.title || statusMessages[status] || 'Error';
  const type =
    options?.type ||
    `https://entrywise.webbound.in/problems/${problemTypeSlugs[status] || 'error'}`;

  const problem: ProblemDetails = {
    type,
    title,
    status,
    detail,
    ...(options?.instance ? { instance: options.instance } : {}),
    ...(options?.invalidParams && options.invalidParams.length > 0
      ? { invalid_params: options.invalidParams }
      : {}),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/problem+json',
  };

  if (status === 429 && options?.retryAfter) {
    headers['Retry-After'] = options.retryAfter.toString();
  }

  return new Response(JSON.stringify(problem), {
    status,
    headers,
  });
};

/**
 * Zalando RESTful Guideline: 201 Created with Location header
 */
export const sendCreated = <T = any>(c: Context, data: T, location?: string): Response => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (location) {
    headers['Location'] = location;
  }
  return new Response(JSON.stringify(data), {
    status: 201,
    headers,
  });
};

/**
 * Zalando RESTful Guideline: 204 No Content for successful deletion
 */
export const sendNoContent = (c: Context): Response => {
  return new Response(null, { status: 204 });
};

/**
 * Zalando RESTful Guideline (Rule 159): Paginated Envelope Response
 */
export const sendPaginated = <T = any>(
  c: Context,
  items: T[],
  totalCount: number,
  limit: number,
  offset: number
): Response => {
  return c.json({
    items,
    total_count: totalCount,
    limit,
    offset,
  });
};

/**
 * Standard 200 OK JSON response
 */
export const sendOk = (c: Context, data: any): Response => {
  return c.json(data, 200);
};

// Legacy uniform response helper preserved for backwards-compatibility
export const sendResponse = <T = any>(
  ctx: Context,
  status: HttpStatus,
  data: T = null as T,
  message?: string
): any => {
  const defaultMessage = statusMessages[status] || 'Success';
  const isSuccess = [200, 201, 204].includes(status);

  if (status >= 400 && status !== 204) {
    throw new HTTPException(status as any, {
      message: message ?? defaultMessage,
      cause: {
        isSuccess: false,
        status,
        data,
        message: message ?? defaultMessage,
      },
      res: new Response(
        JSON.stringify({
          isSuccess: false,
          status,
          data,
          message: message ?? defaultMessage,
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    });
  }

  const response: ApiResponse<T> = {
    isSuccess,
    status,
    data,
    message: message ?? defaultMessage,
  };

  return ctx.json(response);
};
