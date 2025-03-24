# Initial ideas

I'm building a web app to do Venn diagrams between different Wikipedia pages. It will be a single page app in html and javascript, but the calls to gather information about a particular wiki page will be done by the worker.

Make a Venn diagram between two wiki pages so you can see their overlapping topics. I'll use their internal wiki links to define topics

My starting position was the idea that I want to know which movies two different actors both perform in. I realized I could get the wiki page for the two movies, look at all the references for cast, then do a venn.  Then display it nicely in some kind of html diagram, perhaps with some interactive elements to let you drill down a bit like a mind map. Then I realized I could generalize this not just to actors and movies but to any two or three or more topics. A wiki page is a topic, but it links to other topics (wiki pages). So any two pages can have a venn diagram. I do need to "stop list" things that are too common and not meaningful, and I want the venn diagram to have a word cloud in it and the words in the could are wiki pages (e.g. topics) but their weighting (size of the word in the cloud) depends on the number of other times that word is mention in the article, not just the linked first time

Examples of getting Wikipedia data:

curl -X GET "https://en.wikipedia.org/w/api.php?action=parse&page=Albert_Einstein&format=json"

curl -X GET "https://en.wikipedia.org/w/api.php?action=parse&page=Albert_Einstein&format=json" | jq '.parse.links | map(.["*"])'

# Discussion

Building a Web App for Venn Diagrams Between Wikipedia Pages
You want to create a single-page web application using HTML and JavaScript that generates Venn diagrams to show overlapping topics between different Wikipedia pages, based on their internal wiki links. The data fetching will be handled by a web worker to keep the UI responsive. Initially, you considered comparing two actors to find movies they both performed in, but then generalized the idea to any two (or more) Wikipedia pages, where topics are defined by internal links. You also want to weight topics in the Venn diagram by their mention counts in the article text (not just their first linked occurrence), include a "stop list" to exclude overly common topics, and display the topics as a word cloud within the Venn diagram with interactive elements for drilling down.
Below is a complete solution tailored to your requirements, focusing on two pages for simplicity (with notes on extending to three or more later). The implementation uses a web worker for data processing, the Wikipedia API for data retrieval, and JavaScript libraries for visualization.
Approach
User Input: Allow users to input two Wikipedia page titles via a simple form.
Data Fetching: Use a web worker to fetch page data from the Wikipedia API, keeping the main thread free for UI interactions.
Topic Extraction and Weighting:
Extract internal wiki links from each page to define topics.
Count all mentions of each link title in the page text (not just the first linked instance) to determine their weights.
Apply a stop list to filter out common, less meaningful topics (e.g., "United States", "English language").
Compute Overlap:
Identify topics unique to each page and those common to both (intersection).
Weight common topics based on the minimum of their mention counts in both pages.
Display:
Use a Venn diagram library (e.g., venn.js) to draw the diagram, with area sizes based on the number of topics.
Overlay a word cloud within each section of the diagram, where word sizes reflect mention counts.
Add interactivity (e.g., clicking a topic links to its Wikipedia page).
Implementation
index.html
This sets up the single-page app with a form for input and areas for the Venn diagram and topic lists.
html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wikipedia Venn Diagram</title>
    <!-- D3.js for rendering -->
    <script src="https://d3js.org/d3.v5.min.js"></script>
    <!-- venn.js for Venn diagrams -->
    <script src="https://unpkg.com/venn.js@0.2.20/venn.js"></script>
    <!-- html-to-text for converting HTML to plain text -->
    <script src="https://unpkg.com/html-to-text@8.0.0/dist/html-to-text.js"></script>
    <style>
        #venn { width: 600px; height: 400px; }
        .topic-list { margin-top: 20px; }
        .topic { cursor: pointer; }
    </style>
</head>
<body>
    <h1>Wikipedia Venn Diagram</h1>
    <form id="wikiForm">
        <label for="page1">Page 1:</label>
        <input type="text" id="page1" name="page1" required placeholder="e.g., Albert Einstein">
        <label for="page2">Page 2:</label>
        <input type="text" id="page2" name="page2" required placeholder="e.g., Quantum mechanics">
        <button type="submit">Generate Venn Diagram</button>
    </form>
    <div id="venn"></div>
    <div class="topic-list" id="uniqueA"></div>
    <div class="topic-list" id="uniqueB"></div>
    <div class="topic-list" id="intersection"></div>
    <script src="main.js"></script>
</body>
</html>
main.js
This handles user input, communicates with the worker, and renders the Venn diagram and topic lists.
javascript
document.getElementById('wikiForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const page1 = document.getElementById('page1').value.trim();
    const page2 = document.getElementById('page2').value.trim();

    // Initialize web worker
    const worker = new Worker('worker.js');
    worker.postMessage({ page1, page2 });

    worker.onmessage = function(e) {
        const { uniqueA, uniqueB, intersection } = e.data;

        // Draw Venn diagram based on topic counts
        displayVennDiagram(uniqueA.length, uniqueB.length, intersection.length);

        // Display topics as lists (word cloud integration can be added later)
        displayTopics('uniqueA', uniqueA, `Unique to ${page1}`);
        displayTopics('uniqueB', uniqueB, `Unique to ${page2}`);
        displayTopics('intersection', intersection, `Common to ${page1} and ${page2}`);

        worker.terminate(); // Clean up worker
    };
});

function displayVennDiagram(sizeA, sizeB, sizeIntersection) {
    const sets = [
        { sets: ['A'], size: sizeA, label: 'Page 1' },
        { sets: ['B'], size: sizeB, label: 'Page 2' },
        { sets: ['A', 'B'], size: sizeIntersection }
    ];
    const chart = venn.VennDiagram();
    d3.select('#venn').datum(sets).call(chart);
}

function displayTopics(elementId, topics, title) {
    const container = document.getElementById(elementId);
    container.innerHTML = `<h3>${title}</h3>`;
    topics.forEach(topic => {
        const span = document.createElement('span');
        span.className = 'topic';
        span.textContent = `${topic.title} (${topic.count}) `;
        span.style.fontSize = `${Math.log(topic.count + 1) * 10 + 10}px`; // Size based on count
        span.onclick = () => window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(topic.title)}`, '_blank');
        container.appendChild(span);
    });
}
worker.js
This fetches data, processes it, applies the stop list, and computes the sets for the Venn diagram.
javascript
importScripts('https://unpkg.com/html-to-text@8.0.0/dist/html-to-text.js');

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

        return { links, mentionCounts };
    } catch (error) {
        console.error(`Error fetching ${title}: ${error.message}`);
        return { links: [], mentionCounts: {} };
    }
}
How It Works
User Input:
The user enters two Wikipedia page titles (e.g., "Albert Einstein" and "Quantum mechanics") and submits the form.
Data Processing in Worker:
The worker fetches the parsed content for each page using action=parse.
Extracts internal links (e.g., curl ... | jq '.parse.links | map(.["*"])' equivalent in JavaScript).
Converts the HTML content to plain text with html-to-text.
Counts all occurrences of each link title in the text for weighting.
Applies a stop list to exclude common topics.
Computes unique and common topics, weighting the intersection by the minimum mention count.
Rendering:
The main thread receives the processed data and uses venn.js to draw a Venn diagram, with circle sizes based on the number of topics in each set.
Displays topics as clickable lists below the diagram (for now), with font sizes reflecting mention counts.
Features Implemented
Internal Wiki Links as Topics: Uses internal links to define topics, as per your requirement.
Mention Count Weighting: Weights topics by total mentions in the text, not just the first link.
Stop List: Filters out common topics like "United States" (expandable as needed).
Web Worker: Keeps data fetching and processing off the main thread.
Interactivity: Topics are clickable, linking to their Wikipedia pages.
Single-Page App: Built with HTML and JavaScript, no page reloads.
Simplifications and Notes
Word Cloud: For simplicity, topics are currently listed below the diagram with varying font sizes instead of a true word cloud inside the Venn diagram. To add a word cloud, you could integrate a library like d3-cloud and position words within the Venn areas using their coordinates (a future enhancement).
Two Pages: Limited to two pages for now. Extending to three is feasible with venn.js (it supports three-set diagrams), but beyond that requires a different visualization (e.g., Euler diagrams or pairwise comparisons).
Stop List: A basic static list is used. For a more robust solution, you could fetch link frequencies across Wikipedia (e.g., via action=query&prop=linkshere) or use a larger predefined list.
Performance: Limits the display to the top 10 topics per section for readability. You could adjust this or add pagination if needed.
Example Usage
Input: "Albert Einstein" and "Quantum mechanics"
Output:
Venn diagram showing:
Left circle: Topics unique to "Albert Einstein" (e.g., "Theory of relativity", "Nobel Prize").
Right circle: Topics unique to "Quantum mechanics" (e.g., "Schrödinger equation", "Wave function").
Intersection: Common topics (e.g., "Max Planck", "Niels Bohr").
Lists below with topics sized by mention counts, clickable to their Wikipedia pages.
Future Enhancements
Word Cloud Integration: Use d3-cloud to place words inside the Venn areas, adjusting positions based on the diagram’s geometry.
Three Pages: Extend to three sets by updating the sets array in displayVennDiagram.
Dynamic Stop List: Implement a frequency-based filter using additional API calls.
Drill-Down: Add hover or click events to show subtopics or snippets from the linked pages.
This solution provides a solid foundation for your web app, balancing functionality with simplicity, and can be expanded based on your needs!

