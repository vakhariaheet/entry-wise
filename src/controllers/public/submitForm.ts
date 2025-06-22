import { Context } from 'hono';
import { Env } from '../../types/env';
import { sendResponse } from '../../utils/sendResponse';
import { SubmissionData, HONEYPOT_FIELDS, MAX_FILE_SIZE, VALID_FILE_TYPES } from '../../types/submission';
import { decrypt } from '../../utils/encryption';
import { renderFormSubmissionEmail } from '../../emails/FormSubmissionEmail';
import { EmailServiceFactory, EmailAttachment } from '../../services/email';
import { emailProviderEnum } from '../../schemas/company.schema';

const removeExtension = (filename: string): string => {
    console.log('filename', filename);
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename; // No extension found
    return filename.substring(0, lastDotIndex);
};

const validateSubmission = async (
    c: Context<{ Bindings: Env }>,
    data: SubmissionData,
    files: File[] = []
): Promise<string | null> => {
    const site_id = c.req.query('site_id') ?? c.get('site_id');
    console.log('site_id', site_id);
    if (!site_id) {
        return 'Site ID is required';
    }
    // Get field definitions for this site
    const { results: fields } = await c.env.DB.prepare(`
        SELECT name, type FROM fields WHERE site_id = ?
    `).bind(site_id).all<{ name: string, type: string }>();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s-()]+$/;
    // Validate each field

    for (const field of fields) {
        const value = data.fields[ field.name ];

        if (!value && field.type !== 'file') {
            return `Missing required field: ${field.name}`;
        }

        switch (field.type) {
            case 'email':
                if (!emailRegex.exec(value)) {
                    return `Invalid email format for field: ${field.name}`;
                }
                break;
            case 'phone':
                if (!phoneRegex.exec(value)) {
                    return `Invalid phone format for field: ${field.name}`;
                }
                break;
            case 'url':
                try {
                    new URL(value);
                } catch {
                    return `Invalid URL format for field: ${field.name}`;
                }
                break;


        }

    }
    const fileFields = fields.filter(field => field.type === 'file');
    // Check if any any files are provided when no file fields are defined
    if (files.length > 0 && fileFields.length === 0) {
        console.log('files', files);
        console.log('fileFields', fileFields);
        return 'Files provided but no file fields defined in form';
    }

    // Check if any extra files are provided that are not defined in the form
    if (files.length > 0) {
        const fileFieldNames = fileFields.map(field => field.name);
        for (const file of files) {
            if (!fileFieldNames.includes(removeExtension(file.name) ?? '')) {
                return `File ${file.name} is not defined in the form`;
            }
        }
    }

    return null;
};

const checkHoneypot = (data: SubmissionData): boolean => {
    return HONEYPOT_FIELDS.some(field => data[ field ]);
};

export const submitForm = async (c: Context<{ Bindings: Env }>) => {
    try {
        const formData = await c.req.formData();
        const metadata = formData.get('metadata');

        const files = formData.getAll('attachments') as File[];
        
        if (!metadata || typeof metadata !== "string") {
            return sendResponse(c, 401, null, 'Invalid Request');
        }
        const data = JSON.parse(metadata);
        const site_id = c.req.query('site_id');
        const company_id = c.req.query('company_id');

        // Check honeypot
        if (checkHoneypot(data)) {
            return sendResponse(c, 200, null, 'Submission received');
        }

        // Validate submission
        const validationError = await validateSubmission(c, data, files);
        if (validationError) {
            return sendResponse(c, 400, null, validationError);
        }

        // Get company details with encrypted email provider token
        const { results: companies } = await c.env.DB.prepare(`
            SELECT name, email_provider_token, email_provider, from_email, from_name, admin_email
            FROM companies WHERE id = ?
        `).bind(company_id).all<{
            name: string;
            email_provider_token: string;
            email_provider: typeof emailProviderEnum['options'][number];
            from_email: string;
            from_name: string;
            admin_email: string;
        }>();

        if (!companies?.length) {
            return sendResponse(c, 500, null, 'Company configuration not found');
        }

        const company = companies[0];

        // Decrypt email provider token
        const providerToken = await decrypt(
            company.email_provider_token,
            c.env.ENCRYPTION_KEY
        );

        // Get site domain for reference
        const { results: sites } = await c.env.DB.prepare(`
            SELECT domain FROM sites WHERE id = ?
        `).bind(site_id).all<{ domain: string }>();

        const site = sites?.[0];

        const htmlEmail = renderFormSubmissionEmail({
            siteDomain: site?.domain || 'Unknown Site',
            formData: data.fields,
            companyName: company.name,
            attachments: files.map(file => ({ filename: file.name }))
        });

        const fileAttachments: EmailAttachment[] = [];

        // Process file attachments
        for (const file of files) {
            if (!VALID_FILE_TYPES.includes(file.type)) {
                return sendResponse(c, 400, null, `Invalid file type: ${file.type}`);
            }
            if (file.size > MAX_FILE_SIZE) {
                return sendResponse(c, 400, null, `File size exceeds limit: ${file.size}`);
            }
            fileAttachments.push({
                filename: file.name,
                content: Buffer.from(await file.arrayBuffer()).toString('base64'),
                type: file.type || 'application/octet-stream'
            });
        }

        // Create and use email service
        const emailService = EmailServiceFactory.createEmailService({
            provider: company.email_provider,
            apiKey: providerToken
        });

        const emailResponse = await emailService.send({
            from: company.from_email,
            fromName: company.from_name,
            to: company.admin_email,
            subject: `New Form Submission - ${site?.domain}`,
            html: htmlEmail,
            attachments: fileAttachments
        });

        return sendResponse(c, 200, emailResponse, 'Submission received successfully');
    } catch (error) {
        console.error('Submission error:', error);
        return sendResponse(c, 500, null, 'Internal server error');
    }
};