/**
 * Generates a secure API key using Cloudflare's crypto APIs
 * Format: ew_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * @returns Promise<string>
 */
export const generateApiKey = async (): Promise<string> => {
    // Generate 32 random bytes
    const buffer = crypto.getRandomValues(new Uint8Array(32));
    
    // Convert to base64 and remove non-alphanumeric characters
    const randomString = btoa(String.fromCharCode(...buffer))
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 32);
    
    // Return formatted API key
    return `ew_live_${randomString}`;
}; 