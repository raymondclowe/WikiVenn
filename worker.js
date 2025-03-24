import { getPageData, stripHtml } from './src/utils.js';

const stopList = [
  'United States', 'English language', 'Year', 'Century', 'Wikipedia',
  'Category', 'Template', 'Main Page', 'Help', 'Portal'
];

addEventListener('fetch', async event => {
  const url = new URL(event.request.url);

  if (url.pathname === '/api/wiki') {
    event.respondWith(handleWikiRequest(event));
  } else {
    // Serve static files
    try {
      const response = await fetch(event.request);
      event.respondWith(response);
    } catch (e) {
      event.respondWith(new Response("Not found", {status: 404}));
    }
  }
});

async function handleWikiRequest(event) {
  const url = new URL(event.request.url);
  const page1 = url.searchParams.get('page1');
  const page2 = url.searchParams.get('page2');

  if (!page1 || !page2) {
    return new Response("Missing page1 or page2 parameter", { status: 400 });
  }

  try {
    const data = await getWikiData(page1, page2);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response("Error fetching wiki data", { status: 500 });
  }
}

async function getWikiData(page1, page2) {
  const cachedData = await WIKI_CACHE.get(`${page1}:${page2}`);
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
    uniqueA: uniqueATopics.sort((a, b) => b.count - a.count).slice(0, 10), // Top 10 for readability
    uniqueB: uniqueBTopics.sort((a, b) => b.count - a.count).slice(0, 10),
    intersection: intersectionTopics.sort((a, b) => b.count - a.count).slice(0, 10)
  };

  await WIKI_CACHE.put(`${page1}:${page2}`, JSON.stringify(data));

  return data;
}
