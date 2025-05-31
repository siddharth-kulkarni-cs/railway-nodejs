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
 * Displays the byte frequency data as a bar chart on an HTML Canvas,
 * with color-coding for different byte types.
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

    // Define colors for byte ranges
    const colors = {
        control: "rgba(253, 126, 20, 0.7)",    // Orange (e.g., Bootstrap warning)
        printableAscii: "rgba(40, 167, 69, 0.7)", // Green (e.g., Bootstrap success)
        extendedBinary: "rgba(0, 123, 255, 0.7)"  // Blue (e.g., Bootstrap primary)
    };

    let maxFreq = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxFreq) {
            maxFreq = frequencyData[i];
        }
    }

    ctx.clearRect(0, 0, chartWidth, chartHeight);

    if (maxFreq === 0) {
        ctx.fillStyle = "#6c757d";
        ctx.textAlign = "center";
        ctx.font = "12px Arial";
        ctx.fillText("No data to display or all byte frequencies are zero.", chartWidth / 2, chartHeight / 2);
        return;
    }

    for (let i = 0; i < 256; i++) {
        const barHeight = (frequencyData[i] / maxFreq) * chartHeight;
        const x = i * barWidth;
        const y = chartHeight - barHeight;

        // Determine color based on byte value i
        if ((i >= 0 && i <= 31) || i === 127) { // Control characters
            ctx.fillStyle = colors.control;
        } else if (i >= 32 && i <= 126) { // Printable ASCII
            ctx.fillStyle = colors.printableAscii;
        } else { // Extended ASCII / Binary data (128-255)
            ctx.fillStyle = colors.extendedBinary;
        }

        ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Simple X-axis labels (0, 127/128, 255) for context
    ctx.fillStyle = "#333"; // Dark color for text
    ctx.textAlign = "center";
    ctx.font = "10px Arial";
    ctx.fillText("0", barWidth / 2, chartHeight - 5);
    ctx.fillText("127", 127 * barWidth + barWidth / 2, chartHeight - 5);
    // To avoid overlap, adjust position of 128 if needed, or just mark ranges by color.
    // The legend already serves this purpose. Let'''s keep it simple.
    ctx.fillText("255", 255 * barWidth + barWidth / 2, chartHeight -5);
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

/**
 * Calculates the Shannon entropy of the data based on byte frequencies.
 * @param {number[]} frequencyData - Array of 256 numbers representing byte frequencies.
 * @param {number} totalBytes - The total number of bytes from which frequencies were derived.
 * @returns {number} The Shannon entropy value in bits per byte. Returns 0 if totalBytes is 0.
 */
function calculateShannonEntropy(frequencyData, totalBytes) {
    if (totalBytes === 0) {
        return 0;
    }

    let entropy = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > 0) {
            const probability = frequencyData[i] / totalBytes;
            entropy -= probability * Math.log2(probability);
        }
    }
    return entropy;
}

// Export functions for browser global scope
if (typeof window !== "undefined") {
    window.BytePatternAnalyzerLogic = {
        calculateByteFrequencies,
        calculateNGrams,
        bytesToHexString,
        displayByteFrequencyChart,
        displayNGramTable,
        calculateShannonEntropy
    };
}
// Export for Node.js/module environments
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        calculateByteFrequencies,
        calculateNGrams,
        bytesToHexString,
        displayByteFrequencyChart,
        displayNGramTable,
        calculateShannonEntropy
    };
}
