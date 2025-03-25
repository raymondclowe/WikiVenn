import { getPageData, stripHtml } from './src/utils.js';

const stopList = [
  'United States', 'English language', 'Year', 'Century', 'Wikipedia',
  'Category', 'Template', 'Main Page', 'Help', 'Portal'
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname === '/api/wiki') {
      return handleWikiRequest(request, env);
    }

    // Serve static assets for all other requests
    return env.ASSETS.fetch(request);
  }
};

async function handleWikiRequest(request, env) {
  const url = new URL(request.url);
  const page1 = url.searchParams.get('page1');
  const page2 = url.searchParams.get('page2');

  if (!page1 || !page2) {
    return new Response("Missing page1 or page2 parameter", { status: 400 });
  }

  try {
    const data = await getWikiData(page1, page2, env);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: "Error fetching wiki data",
      details: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getWikiData(page1, page2, env) {
  if (!env.WIKI_CACHE) {
    throw new Error('WIKI_CACHE binding is not available - check wrangler.toml configuration');
  }
  const cachedData = await env.WIKI_CACHE.get(`${page1}:${page2}`);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // Fetch data for both pages
  const data1 = await getPageData(page1);
  const data2 = await getPageData(page2);

  // Filter out stop list topics
  const filteredLinks1 = data1.links.filter(link => !stopList.includes(link));
  const filteredLinks2 = data2.links.filter(link => !stopList.includes(link));

  // Compute sets
  const intersection = filteredLinks1.filter(link => filteredLinks2.includes(link));
  const uniqueA = filteredLinks1.filter(link => !intersection.includes(link));
  const uniqueB = filteredLinks2.filter(link => !intersection.includes(link));

  // Prepare topics with weights
  const intersectionTopics = intersection.map(link => ({
    title: link,
    count: Math.min(data1.mentionCounts[link] || 0, data2.mentionCounts[link] || 0)
  })).filter(t => t.count > 0);

  const uniqueATopics = uniqueA.map(link => ({
    title: link,
    count: data1.mentionCounts[link] || 0
  })).filter(t => t.count > 0);

  const uniqueBTopics = uniqueB.map(link => ({
    title: link,
    count: data2.mentionCounts[link] || 0
  })).filter(t => t.count > 0);

  const data = {
    uniqueA: uniqueATopics.sort((a, b) => b.count - a.count),
    uniqueB: uniqueBTopics.sort((a, b) => b.count - a.count),
    intersection: intersectionTopics.sort((a, b) => b.count - a.count)
  };

  await env.WIKI_CACHE.put(`${page1}:${page2}`, JSON.stringify(data));

  return data;
}
