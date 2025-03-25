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

    // Test endpoint for getPageData
    if (url.pathname === '/api/test-page') {
      const page = url.searchParams.get('page');
      if (!page) {
        return new Response("Missing page parameter", { status: 400 });
      }
      try {
        const data = await getPageData(page); // This is a string (HTML content)
        return new Response(JSON.stringify({
          html: data, // Wrap the string in an object property
          debug: {
            page,
            htmlStatus: (await fetch(`https://en.m.wikipedia.org/wiki/${page}?action=render`)).status
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error.message,
          stack: error.stack
        }), { status: 500 });
      }
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
    // Include debug info in response
    const debugData = {
      page1,
      page2,
      rawLinks1: (await getPageData(page1)).links.slice(0, 5),
      rawLinks2: (await getPageData(page2)).links.slice(0, 5),
      intersection: data.intersection.slice(0, 5)
    };

    return new Response(JSON.stringify({
      ...data,
      debug: debugData
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: "Error fetching wiki data",
      details: error.message,
      stack: error.stack,
      debug: {
        page1,
        page2,
        html1: (await fetch(`https://en.m.wikipedia.org/wiki/${page1}?action=render`)).status,
        html2: (await fetch(`https://en.m.wikipedia.org/wiki/${page2}?action=render`)).status
      }
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

  console.log('Raw links for', page1, ':', data1.links.slice(0, 20));
  console.log('Raw links for', page2, ':', data2.links.slice(0, 20));

  // Temporarily disable stop list filtering for debugging
  const filteredLinks1 = data1.links; //.filter(link => !stopList.includes(link));
  const filteredLinks2 = data2.links; //.filter(link => !stopList.includes(link));

  // Compute sets
  const intersection = filteredLinks1.filter(link => filteredLinks2.includes(link));
  const uniqueA = filteredLinks1.filter(link => !intersection.includes(link));
  const uniqueB = filteredLinks2.filter(link => !intersection.includes(link));

  console.log('Filtered links intersection:', intersection.slice(0, 20));

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
