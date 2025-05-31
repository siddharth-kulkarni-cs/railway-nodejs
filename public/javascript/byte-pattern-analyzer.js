/**
 * Core logic for Byte Frequency and N-gram analysis.
 */

/**
 * Calculates the frequency of each byte value (0-255) in a Uint8Array.
 * @param {Uint8Array} uint8Array - The input data.
 * @returns {number[]} An array where index is the byte value and value is its frequency.
 */
function calculateByteFrequencies(uint8Array) {
    const frequencies = new Array(256).fill(0);
    for (let i = 0; i < uint8Array.length; i++) {
        frequencies[uint8Array[i]]++;
    }
    return frequencies;
}

/**
 * Converts a Uint8Array (or a slice of it) to a hex string.
 * @param {Uint8Array} bytes - The byte array to convert.
 * @returns {string} The hexadecimal string representation.
 */
function bytesToHexString(bytes) {
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculates the frequency of n-grams (sequences of n bytes) in a Uint8Array.
 * @param {Uint8Array} uint8Array - The input data.
 * @param {number} n - The length of the n-gram (e.g., 2 for bigrams, 3 for trigrams).
 * @param {number} [topM=50] - The number of top n-grams to return.
 * @returns {Array<{ngram: string, count: number}>} An array of objects, sorted by count.
 */
function calculateNGrams(uint8Array, n, topM = 50) {
    if (n <= 0) {
        return [];
    }
    const ngramCounts = new Map();

    // Iterate through the array to extract n-grams
    // Ensure we don't go out of bounds: loop until length - n
    for (let i = 0; i <= uint8Array.length - n; i++) {
        const ngramBytes = uint8Array.subarray(i, i + n);
        const ngramHex = bytesToHexString(ngramBytes); // Use hex string as key

        ngramCounts.set(ngramHex, (ngramCounts.get(ngramHex) || 0) + 1);
    }

    // Convert map to array of objects
    let sortedNGrams = Array.from(ngramCounts.entries()).map(([ngram, count]) => ({ ngram, count }));

    // Sort by count in descending order
    sortedNGrams.sort((a, b) => b.count - a.count);

    // Return the top M results
    return sortedNGrams.slice(0, topM);
}

/**
 * Displays the byte frequency data as a bar chart on an HTML Canvas.
 * @param {number[]} frequencyData - Array of 256 numbers representing byte frequencies.
 * @param {string} canvasId - The ID of the canvas element to draw on.
 */
function displayByteFrequencyChart(frequencyData, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas element not found:", canvasId);
        return;
    }
    const ctx = canvas.getContext("2d");
    const chartWidth = canvas.width;
    const chartHeight = canvas.height;
    const barWidth = chartWidth / 256; // Width of each bar

    // Find max frequency for scaling
    let maxFreq = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxFreq) {
            maxFreq = frequencyData[i];
        }
    }

    if (maxFreq === 0) { // Handle empty or all-zero data
        ctx.clearRect(0, 0, chartWidth, chartHeight);
        ctx.fillStyle = "#6c757d"; // Muted text color
        ctx.textAlign = "center";
        ctx.fillText("No data to display or all byte frequencies are zero.", chartWidth / 2, chartHeight / 2);
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, chartWidth, chartHeight);

    // Draw bars
    for (let i = 0; i < 256; i++) {
        const barHeight = (frequencyData[i] / maxFreq) * chartHeight;
        const x = i * barWidth;
        const y = chartHeight - barHeight;

        // Simple blue bars
        ctx.fillStyle = "rgba(0, 123, 255, 0.7)";
        ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Optional: Add simple X-axis labels (0, 128, 255) for context
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText("0", barWidth / 2, chartHeight - 5);
    ctx.fillText("127", 127 * barWidth + barWidth / 2, chartHeight - 5);
    ctx.fillText("255", 255 * barWidth + barWidth / 2, chartHeight - 5);
}

/**
 * Displays the n-gram frequency data as an HTML table.
 * @param {Array<{ngram: string, count: number}>} ngramData - Array of n-gram objects.
 * @param {string} tableContainerId - The ID of the div element to render the table into.
 */
function displayNGramTable(ngramData, tableContainerId) {
    const container = document.getElementById(tableContainerId);
    if (!container) {
        console.error("N-gram table container not found:", tableContainerId);
        return;
    }

    // Clear previous table
    container.innerHTML = "";

    if (!ngramData || ngramData.length === 0) {
        container.innerHTML = "<p class=\"text-muted\">No n-gram data to display for the selected N.</p>";
        return;
    }

    const table = document.createElement("table");
    table.className = "table table-sm table-striped table-hover"; // Bootstrap classes

    // Create table header
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const th1 = document.createElement("th");
    th1.textContent = "N-gram (Hex)";
    headerRow.appendChild(th1);
    const th2 = document.createElement("th");
    th2.textContent = "Count";
    headerRow.appendChild(th2);
    const th3 = document.createElement("th");
    th3.textContent = "ASCII (if printable)";
    headerRow.appendChild(th3);


    // Create table body
    const tbody = table.createTBody();
    ngramData.forEach(item => {
        const row = tbody.insertRow();
        const cellNgram = row.insertCell();
        cellNgram.innerHTML = `<code>${item.ngram}</code>`;
        const cellCount = row.insertCell();
        cellCount.textContent = item.count;

        const cellAscii = row.insertCell();
        let asciiRepresentation = "";
        for (let i = 0; i < item.ngram.length; i += 2) {
            const byteHex = item.ngram.substring(i, i + 2);
            const byteVal = parseInt(byteHex, 16);
            if (byteVal >= 32 && byteVal <= 126) { // Printable ASCII
                asciiRepresentation += String.fromCharCode(byteVal);
            } else {
                asciiRepresentation += "."; // Placeholder for non-printable
            }
        }
        cellAscii.innerHTML = `<code>${asciiRepresentation}</code>`;
    });

    container.appendChild(table);
}

// Export functions if using modules (e.g., in a Node.js environment or with bundlers)
// For direct script inclusion in the browser, they become global or can be namespaced.
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        calculateByteFrequencies,
        calculateNGrams,
        bytesToHexString,
        displayByteFrequencyChart,
        displayNGramTable
    };
} else {
    // Make them available on a global object for browser if not using modules
    window.BytePatternAnalyzerLogic = {
        ...(window.BytePatternAnalyzerLogic || {}), // Preserve existing functions if any
        // The core logic functions are already added in the previous script version
        // We only need to add the new display functions here,
        // but the prompt's export block re-adds them.
        // For safety and to match the prompt's intention, ensure all are listed.
        calculateByteFrequencies, // from original
        calculateNGrams,          // from original
        bytesToHexString,         // from original
        displayByteFrequencyChart,
        displayNGramTable
    };
}
