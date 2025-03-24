const fetch = require('node-fetch');
const htmlToText = require('html-to-text');

async function getPageData(title) {
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&format=json`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.parse) throw new Error('Page not found');

        // Extract internal links
        const links = data.parse.links
            .map(link => link['*'])
            .filter(link => !link.startsWith('File:') && !link.startsWith('Category:')); // Basic filtering

        // Convert HTML to plain text
        const html = data.parse.text['*'];
        const text = htmlToText.fromString(html, { wordwrap: false });

        // Count mentions of each link title in the text
        const mentionCounts = {};
        for (const link of links) {
            const regex = new RegExp(`\\b${link.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
            const matches = text.match(regex);
            mentionCounts[link] = matches ? matches.length : 0;
        }

        return { links, mentionCounts, text };
    } catch (error) {
        console.error(`Error fetching ${title}: ${error.message}`);
        return { links: [], mentionCounts: {}, text: '' };
    }
}

async function runTest() {
    const page1 = 'Anne Bancroft';
    const page2 = 'Mel Brooks';

    const data1 = await getPageData(page1);
    const data2 = await getPageData(page2);

    const intersection = data1.links.filter(link => data2.links.includes(link));

    const combinedText = data1.text + data2.text;
    const marriedRegex = new RegExp(/married|wife|husband/, 'i');
    const workedTogetherRegex = new RegExp(/worked with|appeared in|directed/, 'i');

    const marriedMention = marriedRegex.test(combinedText);
    const workedTogetherMention = workedTogetherRegex.test(combinedText);

    console.log('Intersection:', intersection);
    console.log('Married Mention:', marriedMention);
    console.log('Worked Together Mention:', workedTogetherMention);

    if (marriedMention && workedTogetherMention) {
        console.log('Test passed: The script identified that Anne Bancroft and Mel Brooks were married and worked together.');
    } else {
        console.log('Test failed: The script did not identify that Anne Bancroft and Mel Brooks were married and worked together.');
    }
}

runTest();
