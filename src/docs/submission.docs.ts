import type { DescribeRouteOptions } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { problemDetailsSchema } from '../schemas/problemDetails.schema';
import {
  paginatedSubmissionsResponseSchema,
  submissionRecordSchema,
} from '../schemas/submission.schema';

export const submitFormDocs: DescribeRouteOptions = {
  summary: 'Submit form data',
  description: 'Public endpoint to submit form data via JSON, multipart/form-data, or urlencoded.',
  tags: ['Submissions'],
  security: [{ apiKey: [] }],
  responses: {
    200: {
      description: 'Form submission received successfully',
    },
    303: {
      description: 'Redirect to _redirect / _next URL for HTML form submissions',
    },
    422: {
      description: 'Validation failed or bot challenge failed (RFC 7807 Problem Details)',
      content: {
        'application/problem+json': {
          schema: resolver(problemDetailsSchema),
        },
      },
    },
    429: {
      description: 'Rate limit exceeded (RFC 7807 Problem Details)',
      content: {
        'application/problem+json': {
          schema: resolver(problemDetailsSchema),
        },
      },
    },
  },
};

export const listSubmissionsDocs: DescribeRouteOptions = {
  summary: 'List site submissions',
  description:
    'Retrieve a paginated list of submissions for a site with optional status and search filtering.',
  tags: ['Submissions'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Paginated list of submissions',
      content: {
        'application/json': {
          schema: resolver(paginatedSubmissionsResponseSchema),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/problem+json': {
          schema: resolver(problemDetailsSchema),
        },
      },
    },
  },
};

export const getSubmissionDocs: DescribeRouteOptions = {
  summary: 'Get submission details',
  description: 'Retrieve details of a single submission by ID.',
  tags: ['Submissions'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Submission details',
      content: {
        'application/json': {
          schema: resolver(submissionRecordSchema),
        },
      },
    },
    404: {
      description: 'Submission not found',
      content: {
        'application/problem+json': {
          schema: resolver(problemDetailsSchema),
        },
      },
    },
  },
};

export const patchSubmissionDocs: DescribeRouteOptions = {
  summary: 'Update submission status',
  description:
    'Update the processing status of a submission (e.g. mark as read, archived, or spam).',
  tags: ['Submissions'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Submission updated',
      content: {
        'application/json': {
          schema: resolver(submissionRecordSchema),
        },
      },
    },
  },
};

export const deleteSubmissionDocs: DescribeRouteOptions = {
  summary: 'Delete submission',
  description: 'Delete a submission record permanently.',
  tags: ['Submissions'],
  security: [{ bearerAuth: [] }],
  responses: {
    204: {
      description: 'Submission deleted successfully (No Content)',
    },
  },
};

export const exportSubmissionsDocs: DescribeRouteOptions = {
  summary: 'Export site submissions',
  description: 'Export all site submissions as an RFC 4180 CSV spreadsheet or JSON file.',
  tags: ['Submissions'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Export file attachment (CSV or JSON)',
    },
  },
};
