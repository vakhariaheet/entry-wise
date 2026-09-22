import { z } from "zod";

export type serverError = z.infer<typeof serverError>;
export type notFoundError = z.infer<typeof notFoundError>;
export type unauthorizedError = z.infer<typeof unauthorizedError>;
export type toManyRequestsError = z.infer<typeof toManyRequestsError>;
export type badRequestError = z.infer<typeof badRequestError>;

export const serverError = z.object({
    isSuccess: z.literal(false).openapi({
        description: 'Whether the request was successful',
        example: false,
        const: false
    }),
    status: z.literal(500).openapi({
        description: 'The HTTP status code',
        example: 500,
        const: false
    }),
    message: z.string().openapi({
        description: 'The message of the response',
        example: 'Internal server error',
        const: false
    }),
})

export const notFoundError = z.object({
    isSuccess: z.literal(false).openapi({
        description: 'Whether the request was successful',
        example: false,
     
    }),
    status: z.literal(404).openapi({
        description: 'The HTTP status code',
        example: 404,
        const: false
    }),
    message: z.string().openapi({
        description: 'The message of the response',
        example: 'Not found',
        const: false
    }),
})

export const unauthorizedError = z.object({
    isSuccess: z.literal(false).openapi({
        description: 'Whether the request was successful',
        example: false,
        const: false
    }),
    status: z.literal(401).openapi({
        description: 'The HTTP status code',
        example: 401,
        const: false
    }),
    message: z.string().openapi({
        description: 'The message of the response',
        example: 'Unauthorized',
    }),
})

export const toManyRequestsError = z.object({
    isSuccess: z.literal(false).openapi({
        description: 'Whether the request was successful',
        example: false,
        const: false
    }),
    status: z.literal(429).openapi({
        description: 'The HTTP status code',
        example: 429,
        const: false
    }),
    message: z.string().openapi({
        description: 'The message of the response',
        example: 'Too many requests',
    }),
})

export const badRequestError = z.object({
    isSuccess: z.literal(false).openapi({
        description: 'Whether the request was successful',
        example: false,
        const: false
    }),
    status: z.literal(400).openapi({
        description: 'The HTTP status code',
        example: 400,
        const: false
    }),
    message: z.string().openapi({
        description: 'The message of the response',
        example: 'Bad request',
    }),
})