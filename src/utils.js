async function getPageData(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&format=json&origin=*`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.parse) throw new Error('Page not found');

    // Extract internal links and filter out unwanted ones
    const links = data.parse.links
      .map(link => link['*'])
      .filter(link => !link.startsWith('File:') && !link.startsWith('Category:'));

    // Get HTML content and convert to plain text
    const html = data.parse.text['*'];
    const text = stripHtml(html);

    // Count mentions of each link title in the text
    const mentionCounts = {};
    for (const link of links) {
      const regex = new RegExp(`\\b${link.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      mentionCounts[link] = matches ? matches.length : 0;
    }

    // Return the object with links and mention counts
    return { links, mentionCounts };
  } catch (error) {
    console.error(`Error fetching ${title}: ${error.message}`);
    // Return an empty object with the same structure on error
    return { links: [], mentionCounts: {} };
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

export { getPageData, stripHtml };
