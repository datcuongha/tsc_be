// src/utils/slug.util.ts
export function toSlug(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

const LOCAL_API = 'http://localhost:8000';
const SERVER_API = 'http://10.1.48.35:8000';

// export const API_URL =
//   process.env.NODE_ENV === 'development' ? LOCAL_API : SERVER_API;
export const API_URL = LOCAL_API;
