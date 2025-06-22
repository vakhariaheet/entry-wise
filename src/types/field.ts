export type FieldType = 'text' | 'email' | 'phone' | 'url' | 'file';

export interface Field {
    id: number;
    site_id: number;
    name: string;
    type: FieldType;
    created_at: string;
}

export type CreateFieldBody = Omit<Field, 'id' | 'created_at' | 'site_id'>;
export type UpdateFieldBody = Partial<Omit<CreateFieldBody, 'site_id'>>; 