async function getPageData(title) {
  const url = `https://en.m.wikipedia.org/wiki/${encodeURIComponent(title)}?action=render`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wikipedia error: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    
    

    // Extract content between h2 headings (main sections)
    const contentSections = html.match(/<h2\b[^>]*>.*?<\/h2>.*?(?=<h2\b[^>]*>|$)/gis) || [];

    // return contentSections

    const mainContent = contentSections
      .filter(section => !section.includes('id="References"') && 
                        !section.includes('id="External_links"'))
      .join('');

    // return mainContent

    // Extract links from content sections only
    const links = (mainContent.match(/href="\/\/en\.wikipedia\.org\/wiki\/([^"]+)"/g) || [])
    .map(link => link.replace('href="//en.wikipedia.org/wiki/', '').replace('"', ''))
    .filter(link => !link.startsWith('File:') && !link.startsWith('Special:'));

    // Count mentions in cleaned text
    const cleanText = mainContent.replace(/<[^>]+>/g, ' ');
    const mentionCounts = {};
    links.forEach(link => {
      const count = (cleanText.match(new RegExp(link.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi')) || []).length;
      mentionCounts[link] = count;
    });

    return {
      links: links.slice(0, 500),
      mentionCounts
    };
  } catch (error) {
    console.error(`Error fetching ${title}: ${error.message}`);
    return { links: [], mentionCounts: {} };
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

export { getPageData, stripHtml };
