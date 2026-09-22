/**
 * TOTP (Time-based One-Time Password) implementation
 * Compatible with Google Authenticator
 * Uses Web Crypto API for HMAC-SHA1
 */

// Convert base32 string to Uint8Array
function base32ToUint8Array(base32: string): Uint8Array {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = base32
        .toUpperCase()
        .replace(/[^A-Z2-7]/g, '')
        .split('')
        .map(char => base32Chars.indexOf(char).toString(2).padStart(5, '0'))
        .join('');
    
    const bytes = new Uint8Array(bits.length / 8);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
    }
    return bytes;
}

// Convert number to Uint8Array buffer
function intToBuffer(num: number): Uint8Array {
    const buffer = new Uint8Array(8);
    for (let i = buffer.length - 1; i >= 0; i--) {
        buffer[i] = num & 0xff;
        num = num >> 8;
    }
    return buffer;
}

/**
 * Generate a TOTP code
 * @param secret Base32 encoded secret
 * @param timeStep Time step in seconds (default: 30)
 * @param digits Number of digits in the code (default: 6)
 * @returns Promise<string> The TOTP code
 */
export async function generateTOTP(
    secret: string,
    timeStep: number = 30,
    digits: number = 6
): Promise<string> {
    // Get current time counter
    const counter = Math.floor(Date.now() / 1000 / timeStep);
    
    // Convert secret to Uint8Array
    const keyData = base32ToUint8Array(secret);
    
    // Import key for HMAC
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );
    
    // Generate HMAC
    const counterBuffer = intToBuffer(counter);
    const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
    
    // Get offset and truncate
    const signatureArray = new Uint8Array(signature);
    const offset = signatureArray[signatureArray.length - 1] & 0xf;
    
    let code = (
        ((signatureArray[offset] & 0x7f) << 24) |
        ((signatureArray[offset + 1] & 0xff) << 16) |
        ((signatureArray[offset + 2] & 0xff) << 8) |
        (signatureArray[offset + 3] & 0xff)
    ) % Math.pow(10, digits);
    
    return code.toString().padStart(digits, '0');
}

/**
 * Verify a TOTP code
 * @param code Code to verify
 * @param secret Base32 encoded secret
 * @param window Number of time steps to check before and after current time (default: 1)
 * @returns Promise<boolean> Whether the code is valid
 */
export async function verifyTOTP(
    code: string,
    secret: string,
    window: number = 1
): Promise<boolean> {
    const timeStep = 30; // Standard time step
    const currentCounter = Math.floor(Date.now() / 1000 / timeStep);
    const codeNum = parseInt(code, 10);
    
    // Check codes within the window
    for (let i = -window; i <= window; i++) {
        const counter = currentCounter + i;
        const keyData = base32ToUint8Array(secret);
        
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );
        
        const counterBuffer = intToBuffer(counter);
        const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
        
        const signatureArray = new Uint8Array(signature);
        const offset = signatureArray[signatureArray.length - 1] & 0xf;
        
        let generatedCode = (
            ((signatureArray[offset] & 0x7f) << 24) |
            ((signatureArray[offset + 1] & 0xff) << 16) |
            ((signatureArray[offset + 2] & 0xff) << 8) |
            (signatureArray[offset + 3] & 0xff)
        ) % Math.pow(10, 6);
        
        if (codeNum === generatedCode) {
            return true;
        }
    }
    
    return false;
}

/**
 * Generate a random TOTP secret
 * @returns string Base32 encoded secret
 */
export function generateTOTPSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        secret += base32Chars[byte & 31];
    }
    
    return secret;
} 