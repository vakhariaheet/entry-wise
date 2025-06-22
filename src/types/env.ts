import { D1Database, KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import { z } from "zod";

export interface Env {
    DB: D1Database;
    ADMIN_SECRET: string;
    JWT_SECRET: string;
    Variables: { site_id: string, company_id: string }
    RATE_LIMIT_KV: KVNamespace;
    ENCRYPTION_KEY: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    CLOUDINARY_CLOUD_NAME: string;
    R2_BUCKET: R2Bucket;
    BASE_URL: string;
}




export interface APIResponse<T> {
    success: boolean;
    data: T;
    message: string;
}