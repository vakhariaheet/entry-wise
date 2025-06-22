export interface SubmissionData {
    [ key: string ]: any;
    fields: {
        [ key: string ]: string;
    }
}

export interface Submission {
    id: number;
    site_id: number;
    data: SubmissionData;
    created_at: string;
}

// Honeypot field names to check
export const HONEYPOT_FIELDS = [ '_gotcha', 'website', 'url', 'email_confirm' ]; 
export const VALID_FILE_TYPES = [ 'image/jpeg', 'image/png', 'application/pdf' ]; // Add more as needed
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit