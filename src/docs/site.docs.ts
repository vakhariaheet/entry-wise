import type { DescribeRouteOptions } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import {
  badRequestError,
  notFoundError,
  serverError,
  unauthorizedError,
} from '../schemas/index.schema';
import {
  createApiSuccessResponseSchema,
  deleteApiSuccessResponseSchema,
  getAllApiSuccessResponseSchema,
  getApiSuccessResponseSchema,
  updateApiSuccessResponseSchema,
} from '../schemas/site.schema';

export const createSiteDocs: DescribeRouteOptions = {
  summary: 'Create a site',
  description: 'Create a new site for a company',
  tags: ['sites'],
  security: [{ bearerAuth: [] }],

  responses: {
    201: {
      description: 'Site created successfully',
      content: {
        'application/json': {
          schema: resolver(createApiSuccessResponseSchema),
        },
      },
    },
    400: {
      description: 'Missing required fields or domain already exists',
      content: {
        'application/json': {
          schema: resolver(badRequestError),
        },
      },
    },
    404: {
      description: 'Company not found',
      content: {
        'application/json': {
          schema: resolver(notFoundError),
        },
      },
    },
    500: {
      description: 'Failed to create site',
      content: {
        'application/json': {
          schema: resolver(serverError),
        },
      },
    },
  },
};

export const getSitesDocs: DescribeRouteOptions = {
  summary: 'Get all sites',
  description: 'Get all sites, optionally filtered by company_id',
  tags: ['sites'],
  security: [{ bearerAuth: [] }],

  responses: {
    200: {
      description: 'Sites fetched successfully',
      content: {
        'application/json': {
          schema: resolver(getAllApiSuccessResponseSchema),
        },
      },
    },
    500: {
      description: 'Failed to get sites',
      content: {
        'application/json': {
          schema: resolver(serverError),
        },
      },
    },
  },
};

export const getSiteDocs: DescribeRouteOptions = {
  summary: 'Get a site',
  description: 'Get a site by ID',
  tags: ['sites'],
  security: [{ bearerAuth: [] }],

  responses: {
    200: {
      description: 'Site fetched successfully',
      content: {
        'application/json': {
          schema: resolver(getApiSuccessResponseSchema),
        },
      },
    },
    404: {
      description: 'Site not found',
      content: {
        'application/json': {
          schema: resolver(notFoundError),
        },
      },
    },
    500: {
      description: 'Failed to get site',
      content: {
        'application/json': {
          schema: resolver(serverError),
        },
      },
    },
  },
};

export const updateSiteDocs: DescribeRouteOptions = {
  summary: 'Update a site',
  description: 'Update a site by ID',
  tags: ['sites'],
  security: [{ bearerAuth: [] }],

  responses: {
    200: {
      description: 'Site updated successfully',
      content: {
        'application/json': {
          schema: resolver(updateApiSuccessResponseSchema),
        },
      },
    },
    400: {
      description: 'Invalid update data or domain already exists',
      content: {
        'application/json': {
          schema: resolver(badRequestError),
        },
      },
    },
    404: {
      description: 'Site not found',
      content: {
        'application/json': {
          schema: resolver(notFoundError),
        },
      },
    },
    500: {
      description: 'Failed to update site',
      content: {
        'application/json': {
          schema: resolver(serverError),
        },
      },
    },
  },
};

export const deleteSiteDocs: DescribeRouteOptions = {
  summary: 'Delete a site',
  description: 'Delete a site by ID',
  tags: ['sites'],
  security: [{ bearerAuth: [] }],

  responses: {
    200: {
      description: 'Site deleted successfully',
      content: {
        'application/json': {
          schema: resolver(deleteApiSuccessResponseSchema),
        },
      },
    },
    404: {
      description: 'Site not found',
      content: {
        'application/json': {
          schema: resolver(notFoundError),
        },
      },
    },
    500: {
      description: 'Failed to delete site',
      content: {
        'application/json': {
          schema: resolver(serverError),
        },
      },
    },
  },
};

export const testSubmissionDocs: DescribeRouteOptions = {
  summary: 'Simulate mock form submission and test pipeline',
  description:
    'Fires an end-to-end test submission through edge storage, queue worker, email notification, and connected webhooks',
  tags: ['Sites'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Test submission executed and diagnostic pipeline report returned',
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: resolver(badRequestError),
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: resolver(unauthorizedError),
        },
      },
    },
    404: {
      description: 'Site not found',
      content: {
        'application/json': {
          schema: resolver(notFoundError),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: resolver(serverError),
        },
      },
    },
  },
};

export const clearTestSubmissionsDocs: DescribeRouteOptions = {
  summary: 'Purge mock test submissions',
  description: 'Deletes all submissions flagged as is_test=1 for this site',
  tags: ['Sites'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Test submissions deleted successfully' },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: resolver(unauthorizedError),
        },
      },
    },
    404: {
      description: 'Site not found',
      content: {
        'application/json': {
          schema: resolver(notFoundError),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: resolver(serverError),
        },
      },
    },
  },
};
