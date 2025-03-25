async function getPageData(title) {
  const url = `https://en.m.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wikipedia error: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    
    // Parse HTML and get main content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const mainContent = doc.querySelector('main#content');
    if (!mainContent) {
      throw new Error('Could not find main content section');
    }

    // Extract all links from main content
    const links = Array.from(mainContent.querySelectorAll('a[href^="/wiki/"]'))
      .map(a => a.getAttribute('href').replace('/wiki/', ''))
      .filter(link => !link.startsWith('File:') && 
                      !link.startsWith('Category:') &&
                      !link.startsWith('Special:') &&
                      !link.includes(':'));

    // Count mentions in main content text
    const text = mainContent.textContent;
    const mentionCounts = {};
    for (const link of links) {
      const regex = new RegExp(`\\b${link.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      mentionCounts[link] = matches ? matches.length : 0;
    }

    return { links, mentionCounts };
  } catch (error) {
    console.error(`Error fetching ${title}: ${error.message}`);
    return { links: [], mentionCounts: {} };
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

export { getPageData, stripHtml };
