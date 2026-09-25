import { z } from 'zod';
import 'zod-openapi/extend';

export const invalidParamSchema = z.object({
  name: z.string().openapi({
    description: 'The parameter or field that caused the error',
    example: 'email',
  }),
  reason: z.string().openapi({
    description: 'Explanation of why the parameter is invalid',
    example: 'Invalid email address format',
  }),
});

export const problemDetailsSchema = z.object({
  type: z.string().openapi({
    description: 'URI reference that identifies the problem type',
    example: 'https://entrywise.webbound.in/problems/unprocessable-entity',
  }),
  title: z.string().openapi({
    description: 'Short, human-readable summary of the problem',
    example: 'Unprocessable Entity',
  }),
  status: z.number().openapi({
    description: 'The HTTP status code',
    example: 422,
  }),
  detail: z.string().openapi({
    description: 'Human-readable explanation specific to this occurrence of the problem',
    example: 'Form submission validation failed for one or more fields.',
  }),
  instance: z.string().optional().openapi({
    description: 'URI reference that identifies the specific occurrence of the problem',
    example: '/v1/submissions/req_12345',
  }),
  invalid_params: z.array(invalidParamSchema).optional().openapi({
    description: 'List of specific validation errors',
  }),
});

export type InvalidParam = z.infer<typeof invalidParamSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
