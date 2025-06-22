import { Context } from "hono";
import { sendResponse } from "../../utils/sendResponse";
import { Env } from "../../types/env";
import { sign } from 'hono/jwt'
import { verifyTOTP } from "../../utils/totp";


const getAuthToken = async (c: Context<{ Bindings: Env }>) => { 
    const { code } = await c.req.json();
    if (!code) { 
        return sendResponse(c, 400, null, 'Code is required');
    }
    const adminSecret = c.env.ADMIN_SECRET;
    const isCodeValid = await verifyTOTP(code, adminSecret);
    if (!isCodeValid) { 
        return sendResponse(c, 401, null, 'Invalid code');
    }
    const payload = {
        signOn: Date.now(),
        exp: Date.now() + 1000 * 60 * 60,
    }
    const token = await sign(payload, c.env.JWT_SECRET);
    return sendResponse(c, 200, { token }, 'Token generated successfully');
}

export default getAuthToken;