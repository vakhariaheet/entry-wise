import type { Context } from 'hono';
import { sign } from 'hono/jwt';
import type { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { verifyTOTP } from '../../utils/totp';

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
  // JWT `exp`/`iat` are seconds since epoch (RFC 7519). Previously these were emitted in
  // milliseconds, so a spec-compliant verifier read the token as expiring in the year ~58000.
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iat: nowSec,
    signOn: nowSec,
    exp: nowSec + 60 * 60, // 1 hour
  };
  const token = await sign(payload, c.env.JWT_SECRET);
  return sendResponse(c, 200, { token }, 'Token generated successfully');
};

export default getAuthToken;
