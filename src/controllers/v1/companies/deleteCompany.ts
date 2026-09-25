import { Context } from 'hono';
import { Env } from '../../../types/env';
import { sendNoContent, sendProblemDetails } from '../../../utils/sendResponse';

export const deleteCompany = async (c: Context<{ Bindings: Env }>) => {
    try {
        const id = c.req.param('id');
        if (!id) {
            return sendProblemDetails(c, 400, 'Company ID path parameter is required');
        }

        if (id === 'comp_default') {
            return sendProblemDetails(c, 403, 'The default workspace cannot be deleted');
        }

        const jwtPayload = c.get('jwtPayload') as any;
        let checkSql = `SELECT id FROM companies WHERE id = ?`;
        const params: any[] = [id];

        if (jwtPayload?.role === 'clerk_user' && jwtPayload?.user_id) {
            checkSql += ` AND user_id = ?`;
            params.push(jwtPayload.user_id);
        }

        const { results } = await c.env.DB.prepare(checkSql).bind(...params).all();

        if (!results?.length) {
            return sendProblemDetails(c, 404, `Workspace with ID '${id}' not found or access denied`);
        }

        const { success } = await c.env.DB.prepare(`
            DELETE FROM companies WHERE id = ?
        `).bind(id).run();

        if (!success) {
            return sendProblemDetails(c, 500, 'Failed to delete workspace');
        }

        return sendNoContent(c);
    } catch (error) {
        console.error('Delete company error:', error);
        return sendProblemDetails(c, 500, 'Internal server error while deleting workspace');
    }
};
