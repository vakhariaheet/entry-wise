import type { DescribeRouteOptions } from "hono-openapi";
import { resolver } from 'hono-openapi/zod';
import { 
    submitFormSuccessResponseSchema,
    formSubmissionSchema 
} from "../schemas/public.schema";
import { 
    badRequestError, 
    toManyRequestsError,
    serverError 
} from "../schemas/index.schema";

export const submitFormDocs: DescribeRouteOptions = {
    summary: 'Submit form data',
    description: 'Submit form data for a site',
    tags: ['public'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Form submitted successfully',
            content: {
                'application/json': {
                    schema: resolver(submitFormSuccessResponseSchema),
                },
            }
        },
        400: {
            description: 'Invalid form data or missing required fields',
            content: {
                'application/json': {
                    schema: resolver(badRequestError),
                },
            }
        },
        429: {
            description: 'Too many requests',
            content: {
                'application/json': {
                    schema: resolver(toManyRequestsError),
                },
            }
        },
        500: {
            description: 'Failed to submit form',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
}; 