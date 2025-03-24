document.getElementById('wikiForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const page1 = document.getElementById('page1').value.trim();
    const page2 = document.getElementById('page2').value.trim();

    try {
        const response = await fetch(`/api/wiki?page1=${encodeURIComponent(page1)}&page2=${encodeURIComponent(page2)}`);
        const data = await response.json();

        // Draw Venn diagram based on topic counts
        displayVennDiagram(data.uniqueA.length, data.uniqueB.length, data.intersection.length);

        // Display topics as lists (word cloud integration can be added later)
        displayTopics('uniqueA', data.uniqueA, `Unique to ${page1}`);
        displayTopics('uniqueB', data.uniqueB, `Unique to ${page2}`);
        displayTopics('intersection', data.intersection, `Common to ${page1} and ${page2}`);

    } catch (error) {
        console.error(error);
        alert('Error fetching wiki data');
    }
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
