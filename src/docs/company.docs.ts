import type { DescribeRouteOptions } from "hono-openapi";
import { resolver } from 'hono-openapi/zod';
import { createApiSuccessResponseSchema, deleteApiSuccessResponseSchema, getAllApiSuccessResponseSchema, getApiSuccessResponseSchema, updateApiSuccessResponseSchema } from "../schemas/company.schema";
import { badRequestError, notFoundError, serverError } from "../schemas/index.schema";
export const createCompanyDocs: DescribeRouteOptions = {
    summary: 'Create a company',
    description: 'Create a company',
    tags: [ 'companies' ],
    security: [{ bearerAuth: [] }],
    responses: {
        201: {
            description: 'Company created successfully',
            content: {
                'application/json': {
                    schema: resolver(createApiSuccessResponseSchema),
                },
            }
        },
        400: {
            description: 'Missing required fields',
            content: {
                'application/json': {
                    schema: resolver(badRequestError),
                },
            }
        },
        500: {
            description: 'Failed to create company',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }       
    }
}

export const getCompaniesDocs: DescribeRouteOptions = {
    summary: 'Get all companies',
    description: 'Get all companies',
    tags: [ 'companies' ],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Companies fetched successfully',
            content: {
                'application/json': {
                    schema: resolver(getAllApiSuccessResponseSchema),
                },
            }
        },
        500: {
            description: 'Failed to get companies',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
}

export const getCompanyDocs: DescribeRouteOptions = {
    summary: 'Get a company',
    description: 'Get a company',
    tags: [ 'companies' ],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Company fetched successfully',
            content: {
                'application/json': {
                    schema: resolver(getApiSuccessResponseSchema),
                },
            }
        },
        404: {
            description: 'Company not found',
            content: {
                'application/json': {
                    schema: resolver(notFoundError),
                },
            }
        },
        500: {
            description: 'Failed to get company',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        
        }
    }
}

export const updateCompanyDocs: DescribeRouteOptions = {
    summary: 'Update a company',
    description: 'Update a company',
    tags: [ 'companies' ],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Company updated successfully',
            content: {
                'application/json': {
                    schema: resolver(updateApiSuccessResponseSchema),
                },
            }
        },
        400: {
            description: 'Missing required fields',
            content: {
                'application/json': {
                    schema: resolver(badRequestError),
                },
            }
        },
        404: {
            description: 'Company not found',
            content: {
                'application/json': {
                    schema: resolver(notFoundError),
                },
            }
        },
        500: {
            description: 'Failed to update company',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
}

export const deleteCompanyDocs: DescribeRouteOptions = {
    summary: 'Delete a company',
    description: 'Delete a company',
    tags: [ 'companies' ],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Company deleted successfully',
            content: {
                'application/json': {
                    schema: resolver(deleteApiSuccessResponseSchema),
                },
            }
        },
        404: {
            description: 'Company not found',
            content: {
                'application/json': {
                    schema: resolver(notFoundError),
                },
            }
        },
        500: {
            description: 'Failed to delete company',
            content: {
                'application/json': {
                    schema: resolver(serverError),
                },
            }
        }
    }
}