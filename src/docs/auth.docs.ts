import type { DescribeRouteOptions } from "hono-openapi";
import { resolver } from 'hono-openapi/zod';
import { 
    getTokenSuccessResponseSchema,
} from "../schemas/auth.schema";
import { 
    badRequestError, 
    unauthorizedError,
    serverError 
} from "../schemas/index.schema";

export const getTokenDocs: DescribeRouteOptions = {
    summary: 'Get authentication token',
    description: 'Get a JWT token using TOTP code',
    tags: ['auth'],
    responses: {
        200: {
            description: 'Token generated successfully',
            content: {
                'application/json': {
                    schema: resolver(getTokenSuccessResponseSchema),
                },
            }
        },
        400: {
            description: 'Missing or invalid TOTP code',
            content: {
                'application/json': {
                    schema: resolver(badRequestError),
                },
            }
        },
        401: {
            description: 'Invalid TOTP code',
            content: {
                'application/json': {
                    schema: resolver(unauthorizedError),
                },
            }
        },
        500: {
            description: 'Failed to generate token',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
}; 