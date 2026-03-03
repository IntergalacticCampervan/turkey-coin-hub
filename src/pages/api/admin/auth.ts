import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ redirect }) => redirect('/auth/admin-access?admin=1');
