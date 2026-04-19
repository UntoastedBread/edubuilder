import { NextResponse } from 'next/server';
import { webSearch } from '@/lib/search';

export async function POST(request) {
  const { query } = await request.json();
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }
  const results = await webSearch(query);
  return NextResponse.json(results);
}
