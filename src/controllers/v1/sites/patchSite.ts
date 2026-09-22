import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendOk, sendProblemDetails } from '../../../utils/sendResponse';
import { UpdateSiteBody, Site } from '../../../types/site';

export const patchSite = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('site_id') || c.req.param('id');
        if (!id) {
            return sendProblemDetails(c, 400, 'Site ID path parameter is required');
        }

        const body = (await c.req.json()) as UpdateSiteBody;

        // Check if site exists
        const { results: existingSites } = await c.env.DB.prepare(`
            SELECT * FROM sites WHERE id = ?
        `).bind(id).all<any>();

        if (!existingSites?.length) {
            return sendProblemDetails(c, 404, `Site with ID '${id}' not found`);
        }

        // If domain is being updated, check uniqueness
        if (body.domain) {
            const cleanDomain = body.domain.toLowerCase().trim();
            const { results: domainExists } = await c.env.DB.prepare(`
                SELECT id FROM sites WHERE domain = ? AND id != ?
            `).bind(cleanDomain, id).all();

            if (domainExists?.length) {
                return sendProblemDetails(c, 409, `A site with domain '${cleanDomain}' already exists`);
            }
            body.domain = cleanDomain;
        }

        const updateBody: Record<string, any> = { ...body };
        if (typeof updateBody.auto_responder_enabled === 'boolean') {
            updateBody.auto_responder_enabled = updateBody.auto_responder_enabled ? 1 : 0;
        }

        const updateFields = Object.entries(updateBody)
            .filter(([_, value]) => value !== undefined)
            .map(([key]) => `${key} = ?`)
            .join(', ');

        const updateValues = Object.entries(updateBody)
            .filter(([_, value]) => value !== undefined)
            .map(([_, value]) => value);

        if (!updateFields) {
            return sendProblemDetails(c, 400, 'At least one field must be provided to patch');
        }

        const { success } = await c.env.DB.prepare(`
            UPDATE sites SET ${updateFields} WHERE id = ?
        `).bind(...updateValues, id).run();

        if (!success) {
            return sendProblemDetails(c, 500, 'Failed to update site in database');
        }

        const { results: updated } = await c.env.DB.prepare(`
            SELECT * FROM sites WHERE id = ?
        `).bind(id).all<any>();

        const site = updated[0];
        const formattedSite: Site = {
            ...site,
            auto_responder_enabled: site.auto_responder_enabled === 1,
        };

        return sendOk(c, formattedSite);
    } catch (error) {
        console.error('Patch site error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while patching site');
    }
};
