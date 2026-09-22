import { z } from 'zod';
import "zod-openapi/extend"
import { createApiResponse } from '../utils/sendResponse';

export const authTokenRequestSchema = z.object({
    code: z.string().min(1, 'TOTP code is required').openapi({
        description: 'The TOTP code for authentication',
        example: '123456',
    }),
});

export const authTokenResponseSchema = z.object({
    token: z.string().openapi({
        description: 'The JWT token for authentication',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
});

// API Response Schemas
export const getTokenSuccessResponseSchema = createApiResponse(authTokenResponseSchema);

// API Types
export type AuthTokenRequest = z.infer<typeof authTokenRequestSchema>;
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>; 