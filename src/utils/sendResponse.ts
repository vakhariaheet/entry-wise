import { Context } from "hono";
import { HTTPException } from 'hono/http-exception'
import { z } from "zod";
// HTTP Status codes type
type HttpStatus =
  | 200 | 201 | 204  // Success
  | 400 | 401 | 403 | 404 | 422 | 429  // Client Errors
  | 500 | 502 | 503; // Server Errors

export const createApiResponse = <T extends z.ZodTypeAny>(data: T) => {
  return z.object({
    isSuccess: z.boolean().openapi({
      description: 'Whether the request was successful',
      example: true,
    }),
    status: z.number().openapi({
      description: 'The HTTP status code',
      example: 200,
    }),
    data: data,
    message: z.string().openapi({
      description: 'The message of the response',
      example: 'Success',
    }),
  })
}
// Response interface
interface ApiResponse<T = any> {
  isSuccess: boolean;
  status: HttpStatus;
  data: T;
  message: string;
}
const statusMessages = {
  200: 'Success',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
}

// Default values based on status code
const getDefaultValues = (status: HttpStatus): Pick<ApiResponse, 'isSuccess' | 'message'> => {
  const successCodes = [ 200, 201, 204 ];
  return {
    isSuccess: successCodes.includes(status),
    message: statusMessages[ status ]
  };
};

/**
 * Send a uniform response
 * @param ctx Koa Context
 * @param status HTTP Status Code
 * @param data Response data (optional)
 * @param message Custom message (optional)
 */
export const sendResponse = <T = any>(
  ctx: Context,
  status: HttpStatus,
  data: T = null as T,
  message?: string
): any => {
  const defaults = getDefaultValues(status);
  if (status >= 400 && status !== 204) {
    throw new HTTPException(status, {
      message: message ?? defaults.message,

      cause: {
        isSuccess: false,
        status,
        data,
        message: message ?? defaults.message
      },
      res: new Response(JSON.stringify({
        isSuccess: defaults.isSuccess,
        status,
        data,
        message: message ?? defaults.message
      }))
    })
  }
  const response: ApiResponse<T> = {
    isSuccess: defaults.isSuccess,
    status,
    data,
    message: message ?? defaults.message
  };

  return ctx.json(response);
};
