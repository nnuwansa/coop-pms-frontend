export const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8000';

export const MAX_FILE_SIZE = parseInt(
    process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '2000000',
    10
);

export const ACCEPTED_FILE_TYPES = (
    process.env.NEXT_PUBLIC_ACCEPTED_FILE_TYPES || 'image/jpeg,image/png,application/pdf'
)
    .split(',')
    .map((type) => type.trim());

export const ACCESS_TOKEN_EXPIRE_MINUTES =
    Math.floor(parseInt(process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRE_MINUTES || '15') * 0.8);