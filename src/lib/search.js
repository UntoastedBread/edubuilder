const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

export async function webSearch(query) {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey || apiKey === 'your-key-here') {
    return {
      query,
      results: [
        {
          title: 'Web search not configured',
          url: '',
          description: `Search for "${query}" could not be performed. BRAVE_API_KEY not set. Proceed using your training knowledge about NCEA standards.`,
        },
      ],
    };
  }

  const url = new URL(BRAVE_API_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('count', '5');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search failed: ${response.status}`);
  }

  const data = await response.json();
  const results = (data.web?.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }));

  return { query, results };
}
