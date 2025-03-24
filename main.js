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