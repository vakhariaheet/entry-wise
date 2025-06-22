/**
 * Utilities for encrypting and decrypting sensitive data using Cloudflare's crypto APIs
 */

const ENCRYPTION_KEY_LENGTH = 32; // 256 bits
const NONCE_LENGTH = 12; // 96 bits for AES-GCM

/**
 * Converts a base64 string to a Uint8Array of exactly 32 bytes
 * @param base64Key Base64 encoded key
 * @returns Uint8Array
 */
const normalizeKey = async (base64Key: string): Promise<Uint8Array> => {
    // Hash the key using SHA-256 to get exactly 32 bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(base64Key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
};

/**
 * Encrypts a string using AES-GCM
 * @param text Text to encrypt
 * @param secretKey Base64 encoded key
 */
export const encrypt = async (text: string, secretKey: string): Promise<string> => {
    try {
        // Normalize the key to exactly 32 bytes
        const keyData = await normalizeKey(secretKey);
        
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        // Generate a random nonce
        const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
        
        // Encrypt the text
        const encodedText = new TextEncoder().encode(text);
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: nonce },
            key,
            encodedText
        );

        // Combine nonce and ciphertext and encode as base64
        const encryptedArray = new Uint8Array([...nonce, ...new Uint8Array(ciphertext)]);
        return btoa(String.fromCharCode(...encryptedArray));
    } catch (error) {
        console.error(error);
        throw new Error('Encryption failed');
    }
};

/**
 * Decrypts an encrypted string using AES-GCM
 * @param encryptedText Base64 encoded encrypted text
 * @param secretKey Base64 encoded key
 */
export const decrypt = async (encryptedText: string, secretKey: string): Promise<string> => {
    try {
        // Normalize the key to exactly 32 bytes
        const keyData = await normalizeKey(secretKey);
        
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // Decode the encrypted data
        const encryptedArray = new Uint8Array(
            atob(encryptedText).split('').map(c => c.charCodeAt(0))
        );

        // Extract nonce and ciphertext
        const nonce = encryptedArray.slice(0, NONCE_LENGTH);
        const ciphertext = encryptedArray.slice(NONCE_LENGTH);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: nonce },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error(error);
        throw new Error('Decryption failed');
    }
};

/**
 * Generates a new encryption key
 * @returns Base64 encoded 32-byte key
 */
export const generateEncryptionKey = (): string => {
    const key = crypto.getRandomValues(new Uint8Array(ENCRYPTION_KEY_LENGTH));
    return btoa(String.fromCharCode(...key));
}; 