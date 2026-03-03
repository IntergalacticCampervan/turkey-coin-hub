import type { APIRoute } from 'astro';

function normalizeReturnTo(input: string | null): string {
  if (!input || !input.startsWith('/')) {
    return '/admin';
  }

  if (input.startsWith('//')) {
    return '/admin';
  }

  return input;
}

export const GET: APIRoute = ({ request, redirect }) => {
  const requestUrl = new URL(request.url);
  const returnTo = normalizeReturnTo(requestUrl.searchParams.get('return_to'));
  return redirect(returnTo);
};
