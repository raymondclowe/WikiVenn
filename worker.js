// Simple stop list of common, less meaningful topics
const stopList = [
    'United States', 'English language', 'Year', 'Century', 'Wikipedia',
    'Category', 'Template', 'Main Page', 'Help', 'Portal'
];

self.onmessage = async function(e) {
    const { page1, page2 } = e.data;

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

    // Send data back to main thread
    self.postMessage({
        uniqueA: uniqueATopics.sort((a, b) => b.count - a.count).slice(0, 10), // Top 10 for readability
        uniqueB: uniqueBTopics.sort((a, b) => b.count - a.count).slice(0, 10),
        intersection: intersectionTopics.sort((a, b) => b.count - a.count).slice(0, 10)
    });
};


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
