import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ request, redirect }) => {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.searchParams);
  params.set('admin', '1');
  return redirect(`/auth/admin-access?${params.toString()}`);
};
