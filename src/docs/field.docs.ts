import type { DescribeRouteOptions } from "hono-openapi";
import { resolver } from 'hono-openapi/zod';
import { 
    createApiSuccessResponseSchema, 
    deleteApiSuccessResponseSchema, 
    getAllApiSuccessResponseSchema, 
    getApiSuccessResponseSchema, 
    updateApiSuccessResponseSchema,
    bulkCreateApiSuccessResponseSchema
} from "../schemas/field.schema";
import { 
    badRequestError, 
    notFoundError, 
    serverError 
} from "../schemas/index.schema";

export const createFieldDocs: DescribeRouteOptions = {
    summary: 'Create a field',
    description: 'Create a new field for a site',
    tags: ['fields'],
    security: [{ apiKey: [] }],
    responses: {
        201: {
            description: 'Field created successfully',
            content: {
                'application/json': {
                    schema: resolver(createApiSuccessResponseSchema),
                },
            }
        },
        400: {
            description: 'Missing required fields or field name already exists',
            content: {
                'application/json': {
                    schema: resolver(badRequestError),
                },
            }
        },
        404: {
            description: 'Site not found',
            content: {
                'application/json': {
                    schema: resolver(notFoundError),
                },
            }
        },
        500: {
            description: 'Failed to create field',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
};

export const bulkCreateFieldDocs: DescribeRouteOptions = {
    summary: 'Create multiple fields',
    description: 'Create multiple fields for a site in a single request',
    tags: ['fields'],
    security: [{ apiKey: [] }],
    responses: {
        201: {
            description: 'Fields created successfully',
            content: {
                'application/json': {
                    schema: resolver(bulkCreateApiSuccessResponseSchema),
                },
            }
        },
        400: {
            description: 'Missing required fields, invalid field types, or duplicate field names',
            content: {
                'application/json': {
                    schema: resolver(badRequestError),
                },
            }
        },
        404: {
            description: 'Site not found',
            content: {
                'application/json': {
                    schema: resolver(notFoundError),
                },
            }
        },
        500: {
            description: 'Failed to create fields',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
};

export const getFieldsDocs: DescribeRouteOptions = {
    summary: 'Get all fields',
    description: 'Get all fields, optionally filtered by site_id',
    tags: ['fields'],
    security: [{ apiKey: [] }],
    responses: {
        200: {
            description: 'Fields fetched successfully',
            content: {
                'application/json': {
                    schema: resolver(getAllApiSuccessResponseSchema),
                },
            }
        },
        500: {
            description: 'Failed to get fields',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
};

export const getFieldDocs: DescribeRouteOptions = {
    summary: 'Get a field',
    description: 'Get a field by ID',
    tags: ['fields'],
    security: [{ apiKey: [] }],
    responses: {
        200: {
            description: 'Field fetched successfully',
            content: {
                'application/json': {
                    schema: resolver(getApiSuccessResponseSchema),
                },
            }
        },
        404: {
            description: 'Field not found',
            content: {
                'application/json': {
                    schema: resolver(notFoundError),
                },
            }
        },
        500: {
            description: 'Failed to get field',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
};

export const updateFieldDocs: DescribeRouteOptions = {
    summary: 'Update a field',
    description: 'Update a field by ID',
    tags: ['fields'],
    security: [{ apiKey: [] }],
    responses: {
        200: {
            description: 'Field updated successfully',
            content: {
                'application/json': {
                    schema: resolver(updateApiSuccessResponseSchema),
                },
            }
        },
        400: {
            description: 'Invalid update data or field name already exists',
            content: {
                'application/json': {
                    schema: resolver(badRequestError),
                },
            }
        },
        404: {
            description: 'Field not found',
            content: {
                'application/json': {
                    schema: resolver(notFoundError),
                },
            }
        },
        500: {
            description: 'Failed to update field',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
};

export const deleteFieldDocs: DescribeRouteOptions = {
    summary: 'Delete a field',
    description: 'Delete a field by ID',
    tags: ['fields'],
    security: [{ apiKey: [] }],
    responses: {
        200: {
            description: 'Field deleted successfully',
            content: {
                'application/json': {
                    schema: resolver(deleteApiSuccessResponseSchema),
                },
            }
        },
        404: {
            description: 'Field not found',
            content: {
                'application/json': {
                    schema: resolver(notFoundError),
                },
            }
        },
        500: {
            description: 'Failed to delete field',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
}; 