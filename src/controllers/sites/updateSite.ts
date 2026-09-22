import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { UpdateSiteBody } from '../../types/site';

export const updateSite = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json<UpdateSiteBody>();
        const companyId = c.req.param('company_id');
        if (!companyId) {
            return sendResponse(c, 400, null, 'Company ID is required');
        }
        if (!id) {
            return sendResponse(c, 400, null, 'Site ID is required');
        }

        // Check if site exists
        const { results: siteExists } = await c.env.DB.prepare(`
            SELECT id FROM sites WHERE id = ? AND company_id = ?
        `).bind(id, companyId).all();

        if (!siteExists?.length) {
            return sendResponse(c, 404, null, 'Site not found');
        }

        // If domain is being updated, check if it already exists
        if (body.domain) {
            const { results: domainExists } = await c.env.DB.prepare(`
                SELECT id FROM sites WHERE domain = ? AND id != ? AND company_id = ?
            `).bind(body.domain, id, companyId).all();

            if (domainExists?.length) {
                return sendResponse(c, 400, null, 'Domain already exists');
            }
        }

        // Build update query dynamically based on provided fields
        const updateFields = Object.entries(body)
            .filter(([_, value]) => value !== undefined)
            .map(([key]) => `${key} = ?`)
            .join(', ');
        
        const updateValues = Object.entries(body)
            .filter(([_, value]) => value !== undefined)
            .map(([_, value]) => value);

        if (!updateFields) {
            return sendResponse(c, 400, null, 'No fields to update');
        }

        const { success } = await c.env.DB.prepare(`
            UPDATE sites 
            SET ${updateFields}
            WHERE id = ?
        `).bind(...updateValues, id).run();

        if (!success) {
            return sendResponse(c, 500, null, 'Failed to update site');
        }

        return sendResponse(c, 200, body, 'Site updated successfully');
    } catch (error) {
        console.error('Error updating site:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
}; 