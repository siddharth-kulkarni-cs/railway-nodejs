// Base64 Dev Tool Script
// Handles encoding, decoding and copying results

// Utility to encode UTF-8 safely into Base64
function encodeBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (err) {
    console.error('Failed to encode', err);
    alert('⚠️ Failed to encode. Make sure the input is valid text.');
    return '';
  }
}

// Utility to decode Base64 safely into UTF-8
function decodeBase64(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch (err) {
    console.error('Failed to decode', err);
    alert('⚠️ Failed to decode. Is it valid Base64?');
    return '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('inputText');
  const resultEl = document.getElementById('resultText');
  const encodeBtn = document.getElementById('encodeBtn');
  const decodeBtn = document.getElementById('decodeBtn');
  const copyBtn = document.getElementById('copyResult');

  encodeBtn?.addEventListener('click', () => {
    const encoded = encodeBase64(inputEl.value);
    resultEl.value = encoded;
  });

  decodeBtn?.addEventListener('click', () => {
    const decoded = decodeBase64(inputEl.value);
    resultEl.value = decoded;
  });

  copyBtn?.addEventListener('click', () => {
    if (!resultEl.value) return;
    resultEl.select();
    document.execCommand('copy');
    copyBtn.textContent = 'Copied! ✅';
    setTimeout(() => {
      copyBtn.textContent = 'Copy 📋';
    }, 1500);
  });
});

// -----------------------------
// cURL Command Validator
// -----------------------------
// Remove line-continuations (backslash + newline) and collapse whitespace
function preprocessCurlCommand(cmd) {
  return cmd.replace(/\\\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenizeCurlCommand(cmd) {
  // Robust whitespace split preserving quoted substrings & escapes
  const regex = /(?:[^\s"']+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')+/g;
  return cmd.match(regex) || [];
}

function hasUnmatchedQuotes(cmd) {
  const doubleQuotes = (cmd.match(/"/g) || []).length;
  const singleQuotes = (cmd.match(/'/g) || []).length;
  return doubleQuotes % 2 === 1 || singleQuotes % 2 === 1;
}

function validateCurl(cmd) {
  const errors = [];
  const summary = { method: 'GET', url: '', headers: [], data: null, options: [] };
  let methodAlreadySet = false;
  if (!cmd.trim()) {
    errors.push('Command is empty');
    return { isValid: false, errors, summary };
  }
  if (!cmd.trim().startsWith('curl')) {
    errors.push("Command must start with 'curl'.");
  }
  if (hasUnmatchedQuotes(cmd)) {
    errors.push('Unmatched single or double quotes');
  }
  cmd = preprocessCurlCommand(cmd);
  const rawTokens = tokenizeCurlCommand(cmd);

  // Expand inline = and combined short options
  const tokens = [];
  for (let tok of rawTokens) {
    // Split --long=value into [--long, value]
    if (/^--[^=]+=/.test(tok)) {
      const [flag, value] = tok.split(/=(.*)/s);
      tokens.push(flag, value);
      continue;
    }
    // Handle short combined flags: -LsS -> -L -s -S
    if (/^-[a-zA-Z]{2,}$/.test(tok) && !tok.startsWith('--')) {
      const chars = tok.slice(1).split('');
      chars.forEach(c => tokens.push('-' + c));
      continue;
    }
    tokens.push(tok);
  }

  let i = tokens[0] === 'curl' ? 1 : 0;
  const optionSpec = {
    '-X': true, '--request': true,
    '-H': true, '--header': true,
    '-d': true, '--data': true, '--data-raw': true,
    '--data-binary': true, '--data-urlencode': true,
    '-F': true, '--form': true,
    '-u': true, '--user': true,
    '-I': false, '--head': false,
    '-o': true, '--output': true,
    '-s': false, '--silent': false,
    '-S': false, '--show-error': false,
    '-k': false, '--insecure': false,
    '-L': false, '--location': false,
    '-G': false, '--get': false,
    '--compressed': false,
    '--http2': false, '--http1.1': false,
    '-A': true, '--user-agent': true,
    '-e': true, '--referer': true,
    '-b': true, '--cookie': true,
    '-T': true, '--upload-file': true,
    '--url': true,
    '--retry': true,
    '--connect-timeout': true,
    '--max-time': true,
    '--cacert': true
  };
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.startsWith('-')) {
      const expectsVal = optionSpec.hasOwnProperty(tok) ? optionSpec[tok] : undefined;
      if (expectsVal === undefined) {
        errors.push(`Unknown option: ${tok}`);
      } else if (expectsVal) {
        const val = tokens[i + 1];
        if (!val || val.startsWith('-')) {
          errors.push(`Option ${tok} expects a value`);
        } else {
          if (tok === '-X' || tok === '--request') {
            if (methodAlreadySet) {
              errors.push('Multiple HTTP methods specified');
            }
            summary.method = val.replace(/^['"]|['"]$/g, '').toUpperCase();
            methodAlreadySet = true;
          } else if (tok === '-H' || tok === '--header') {
            summary.headers.push(val);
          } else if (tok === '-d' || tok === '--data' || tok === '--data-raw') {
            summary.data = val;
          } else if (tok === '--url') {
            if (summary.url) {
              errors.push('Multiple URLs specified');
            }
            summary.url = val.replace(/^['"]|['"]$/g, '');
          }
          i++; // Skip value token
        }
      }
      summary.options.push(tok);
    } else {
      const cleansed = tok.replace(/^['"]|['"]$/g, '');
      if (!summary.url && /^https?:\/\//.test(cleansed)) {
        summary.url = cleansed;
      } else if (/^[A-Za-z]+$/.test(cleansed) && !methodAlreadySet) {
        // Stand-alone token that looks like an HTTP verb before URL
        summary.method = cleansed.toUpperCase();
        methodAlreadySet = true;
      } else {
        errors.push(`Unexpected token: ${tok}`);
      }
    }
    i++;
  }
  if (!summary.url) {
    errors.push('No URL found in command');
  } else {
    try {
      const urlObj = new URL(summary.url);
      if (!urlObj.hostname) {
        throw new Error('missing host');
      }
    } catch (e) {
      errors.push('Invalid URL specified');
    }
  }
  return { isValid: errors.length === 0, errors, summary };
}

function displayCurlResult(result) {
  const container = document.getElementById('curlResult');
  if (!container) return;
  container.innerHTML = '';

  if (result.isValid) {
    const s = result.summary;
    container.innerHTML = `
      <div class="alert alert-success"><strong>Valid cURL command!</strong></div>
      <ul class="list-group mb-3">
        <li class="list-group-item"><strong>Method:</strong> ${s.method}</li>
        <li class="list-group-item"><strong>URL:</strong> ${s.url}</li>
        <li class="list-group-item"><strong>Headers:</strong><br>${s.headers.map(h => `<code>${h}</code>`).join('<br>') || 'None'}</li>
        <li class="list-group-item"><strong>Data:</strong><br>${s.data ? `<code>${s.data}</code>` : 'None'}</li>
        <li class="list-group-item"><strong>Flags:</strong> ${s.options.join(', ') || 'None'}</li>
      </ul>
    `;
  } else {
    container.innerHTML = `
      <div class="alert alert-danger"><strong>Invalid cURL command:</strong>
        <ul>${result.errors.map(e => `<li>${e}</li>`).join('')}</ul>
      </div>
    `;
  }
}

document.getElementById('validateCurlBtn')?.addEventListener('click', () => {
  const cmd = document.getElementById('curlInput').value;
  const res = validateCurl(cmd);
  displayCurlResult(res);
});

// -----------------------------
// Timestamp Converter
// -----------------------------
function parseInputToDate(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pure or fractional numeric input → epoch seconds or ms
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return null;
    if (trimmed.includes('.')) {
      // Treat as seconds with fractional part
      return new Date(num * 1000);
    }
    // Decide by length heuristic: 13+ digits = ms, 10 or fewer = s, 11-12 = ms (1970-2000 era)
    const ms = trimmed.length >= 13 || trimmed.length >= 11 ? num : num * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO-8601 & RFC 2822 handled natively
  const native = new Date(trimmed);
  if (!isNaN(native.getTime())) return native;

  // YYYY-MM-DD HH:mm[:ss]
  let m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [_, y, mo, d, h = '00', mi = '00', s = '00'] = m;
    const utc = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    return isNaN(utc.getTime()) ? null : utc;
  }
  return null;
}

function humanRelative(date) {
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec === 0) return 'now';
  const abs = Math.abs(diffSec);
  const units = [
    { s: 60, name: 'second' },
    { s: 60, name: 'minute' },
    { s: 24, name: 'hour' },
    { s: 7, name: 'day' },
    { s: 4.34524, name: 'week' },
    { s: 12, name: 'month' },
    { s: 1000, name: 'year' }
  ];
  let unit = 'second';
  let value = abs;
  let i = 0;
  while (i < units.length && value >= units[i].s) {
    value = value / units[i].s;
    unit = units[i].name;
    i++;
  }
  value = Math.round(value);
  if (value !== 1) unit += 's';
  return diffSec > 0 ? `${value} ${unit} ago` : `in ${value} ${unit}`;
}

function buildTimestampHTML(date) {
  const epochMs = date.getTime();
  const epochSInt = Math.floor(epochMs / 1000);
  const epochSFrac = (epochMs / 1000).toFixed(3);
  const tzOffsetMin = -date.getTimezoneOffset();
  const tzSign = tzOffsetMin >= 0 ? '+' : '-';
  const pad = n => String(Math.abs(n)).padStart(2, '0');
  const tzOffsetStr = `${tzSign}${pad(Math.floor(Math.abs(tzOffsetMin) / 60))}:${pad(Math.abs(tzOffsetMin) % 60)}`;
  return `
    <ul class="list-group">
      <li class="list-group-item"><strong>Unix (seconds):</strong> <code>${epochSInt}</code></li>
      <li class="list-group-item"><strong>Unix (seconds, fractional):</strong> <code>${epochSFrac}</code></li>
      <li class="list-group-item"><strong>Unix (milliseconds):</strong> <code>${epochMs}</code></li>
      <li class="list-group-item"><strong>ISO-8601 (UTC):</strong> <code>${date.toISOString()}</code></li>
      <li class="list-group-item"><strong>Local (${tzOffsetStr}):</strong> ${date.toLocaleString()}</li>
      <li class="list-group-item"><strong>UTC:</strong> ${date.toUTCString()}</li>
      <li class="list-group-item text-muted"><em>${humanRelative(date)}</em></li>
    </ul>
  `;
}

function showTimestampResult(success, htmlOrMsg) {
  const container = document.getElementById('timestampResult');
  if (!container) return;
  container.innerHTML = success
    ? `<div class="alert alert-success">Converted successfully</div>${htmlOrMsg}`
    : `<div class="alert alert-danger"><strong>Error:</strong> ${htmlOrMsg}</div>`;
}

document.getElementById('convertTimestampBtn')?.addEventListener('click', () => {
  const input = document.getElementById('timestampInput').value;
  const date = parseInputToDate(input);
  if (!date) {
    showTimestampResult(false, 'Unrecognized timestamp format');
    return;
  }
  showTimestampResult(true, buildTimestampHTML(date));
});

document.getElementById('nowTimestampBtn')?.addEventListener('click', () => {
  const now = Date.now();
  document.getElementById('timestampInput').value = now.toString();
  const date = new Date(now);
  showTimestampResult(true, buildTimestampHTML(date));
});

// -----------------------------
// JWT Debugger
// -----------------------------
function decodeBase64UrlForJwt(b64url) {
  b64url = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = b64url.length % 4;
  if (padding) {
    b64url += '===='.slice(padding);
  }
  try {
    // This trick handles UTF-8 characters correctly.
    return decodeURIComponent(escape(window.atob(b64url)));
  } catch (err) {
    console.error('Failed to decode Base64Url', err);
    throw new Error('Invalid Base64Url string');
  }
}

function displayJwtResult(result) {
  const container = document.getElementById('jwtResult');
  if (!container) return;
  container.innerHTML = '';

  if (result.error) {
    container.innerHTML = `<div class="alert alert-danger"><strong>Error:</strong> ${result.error}</div>`;
    return;
  }

  const { header, payload, signature } = result;

  // Use <pre> and <code> for monospaced font and code-like appearance.
  // Using JSON.stringify with spacing for pretty printing.
  container.innerHTML = `
    <div class="alert alert-success"><strong>JWT decoded successfully!</strong></div>
    <h5 class="mt-3">Header</h5>
    <pre class="bg-light p-3 rounded"><code>${JSON.stringify(header, null, 2)}</code></pre>
    <h5>Payload</h5>
    <pre class="bg-light p-3 rounded"><code>${JSON.stringify(payload, null, 2)}</code></pre>
    <h5>Signature</h5>
    <pre class="bg-light p-3 rounded text-break"><code>${signature}</code></pre>
  `;

  // Check for 'exp', 'iat', 'nbf' claims and display human-readable dates
  const addClaimTimeInfo = (claim, label) => {
    if (payload[claim]) {
      const date = new Date(payload[claim] * 1000);
      const isPast = date < new Date();
      
      let message = `<strong>${label}:</strong> ${date.toLocaleString()}`;
      if (claim === 'exp') {
        message = `<strong>Token ${isPast ? 'expired' : 'expires'} on:</strong> ${date.toLocaleString()}`;
      }

      const el = document.createElement('div');
      el.className = `alert ${isPast && claim === 'exp' ? 'alert-warning' : 'alert-info'} mt-2`;
      el.innerHTML = message;
      
      const payloadPreContainer = container.querySelector('h5:nth-of-type(2)').nextElementSibling;
      if (payloadPreContainer) {
          // insert after the payload pre, but before the signature heading
          payloadPreContainer.parentNode.insertBefore(el, payloadPreContainer.nextElementSibling.previousElementSibling.nextElementSibling);
      }
    }
  };
  
  // Display expiry, issued at, and not before times.
  // Show expiry last so it's most prominent.
  addClaimTimeInfo('nbf', 'Not Before (nbf)');
  addClaimTimeInfo('iat', 'Issued At (iat)');
  addClaimTimeInfo('exp', 'Expires (exp)');
}

function handleDecodeJwt() {
  const token = document.getElementById('jwtInput').value.trim();
  if (!token) {
    // Don't show an error for empty input, just clear results.
    document.getElementById('jwtResult').innerHTML = '';
    return;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    displayJwtResult({ error: 'Invalid JWT structure. A JWT must have three parts separated by dots.' });
    return;
  }

  const [headerB64, payloadB64, signature] = parts;

  try {
    const headerJson = decodeBase64UrlForJwt(headerB64);
    const payloadJson = decodeBase64UrlForJwt(payloadB64);

    const header = JSON.parse(headerJson);
    const payload = JSON.parse(payloadJson);

    displayJwtResult({ header, payload, signature });
  } catch (e) {
    displayJwtResult({ error: `Failed to decode or parse JWT. Make sure it's a valid token. Error: ${e.message}` });
  }
}

document.getElementById('decodeJwtBtn')?.addEventListener('click', handleDecodeJwt);

// -----------------------------
// Password Strength Analyzer
// -----------------------------

function getPatternName(pattern) {
  const names = {
    dictionary: '📖 Dictionary Word',
    spatial: '⌨️ Keyboard Pattern',
    repeat: '🔁 Repetition',
    sequence: '🔢 Sequence',
    regex: '🔠 Regex Match',
    date: '📅 Date',
  };
  return names[pattern] || pattern;
}

function getPatternDetails(seq) {
  const details = [];
  if (seq.dictionary_name) {
    details.push(`From the '${seq.dictionary_name}' dictionary.`);
  }
  if (seq.reversed) {
    details.push('Reversed.');
  }
  if (seq.l33t) {
    details.push('Uses l33t substitutions.');
  }
  if (seq.graph) {
    details.push(`Based on the '${seq.graph}' keyboard layout.`);
  }
  if (seq.sequence_name) {
    details.push(`An ascending/descending sequence of '${seq.sequence_name}'.`);
  }
  if (seq.regex_name) {
    details.push(`Matches common pattern for '${seq.regex_name}'.`);
  }
  if (seq.day && seq.month && seq.year) {
    details.push(`Recognized as the date ${seq.month}/${seq.day}/${seq.year}.`);
  }
  if (details.length === 0) {
    return 'A common pattern.';
  }
  return details.join(' ');
}

function displayPasswordResult(result, password) {
  const container = document.getElementById('passwordResult');
  if (!container) return;

  const score = result.score;
  const feedback = result.feedback;
  const crackTime = result.crack_times_display.offline_slow_hashing_1e4_per_second;

  const scoreColors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997'];
  const scoreLabels = ['Very Weak', 'Weak', 'Okay', 'Good', 'Strong'];

  let html = `
    <div class="mb-3">
      <strong>Strength: ${scoreLabels[score]}</strong>
      <div class="progress mt-2" style="height: 20px;">
        <div class="progress-bar" role="progressbar" style="width: ${((score + 1) / 5) * 100}%; background-color: ${scoreColors[score]};" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="4"></div>
      </div>
    </div>
    <div class="alert alert-info">
      <strong>Estimated time to crack:</strong> ${crackTime}
      <br>
      <small class="text-muted">(assuming ~10k guesses/sec)</small>
    </div>
  `;

  if (feedback.warning) {
    html += `<div class="alert alert-warning"><strong>Warning:</strong> ${feedback.warning}</div>`;
  }

  if (feedback.suggestions && feedback.suggestions.length > 0) {
    html += `
      <h5>Suggestions for a stronger password:</h5>
      <ul class="list-group list-group-flush mb-3">
        ${feedback.suggestions.map(s => `<li class="list-group-item">${s}</li>`).join('')}
      </ul>
    `;
  }

  if (result.sequence && result.sequence.length > 0) {
    html += `
      <h5>Password Composition Analysis</h5>
      <p>Your password is made of the following components:</p>
      <table class="table table-bordered table-sm">
        <thead class="thead-light">
          <tr>
            <th>Component</th>
            <th>Pattern Type</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${result.sequence.map(seq => `
            <tr>
              <td><code>${seq.token}</code></td>
              <td>${getPatternName(seq.pattern)}</td>
              <td>${getPatternDetails(seq)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  container.innerHTML = html;

  // -----------------------------
  // Advanced technical metrics
  // -----------------------------

  const metrics = computeEntropyMetrics(password);

  // Metrics table
  const metricsTable = `
    <h5 class="mt-4">Technical Metrics</h5>
    <table class="table table-sm table-bordered mb-4">
      <tbody>
        <tr><th>Password Length</th><td>${metrics.length}</td></tr>
        <tr><th>Character Sets Used</th><td>${metrics.charsetsUsed.join(', ') || 'None'}</td></tr>
        <tr><th>Charset Size</th><td>${metrics.charsetSize}</td></tr>
        <tr><th>Theoretical Entropy (Bits)</th><td>${metrics.theoreticalBits.toFixed(2)}</td></tr>
        <tr><th>Shannon Entropy (Bits)</th><td>${metrics.shannonBits.toFixed(2)}</td></tr>
      </tbody>
    </table>
  `;

  container.insertAdjacentHTML('beforeend', metricsTable);

  // Charts containers
  const chartHTML = `
    <div class="row">
      <div class="col-md-6 mb-4">
        <h6 class="text-center">Entropy vs Recommended (60 bits)</h6>
        <canvas id="entropyChart" height="180"></canvas>
      </div>
      <div class="col-md-6 mb-4">
        <h6 class="text-center">Character Category Distribution</h6>
        <canvas id="charDistChart" height="180"></canvas>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', chartHTML);

  renderCharts(metrics);
}

// Global Chart.js instances to avoid duplicates on re-render
let entropyChartInstance = null;
let charDistChartInstance = null;

function computeEntropyMetrics(password) {
  const length = password.length;
  const categories = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digits: /[0-9]/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password)
  };

  const charsetsUsed = [];
  let charsetSize = 0;
  if (categories.lowercase) { charsetSize += 26; charsetsUsed.push('lowercase'); }
  if (categories.uppercase) { charsetSize += 26; charsetsUsed.push('uppercase'); }
  if (categories.digits)    { charsetSize += 10; charsetsUsed.push('digits'); }
  if (categories.symbols)   { charsetSize += 33; charsetsUsed.push('symbols'); }

  const theoreticalBits = length * Math.log2(charsetSize || 1);

  // Shannon entropy based on actual character distribution
  const freq = {};
  for (const ch of password) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let shannon = 0;
  for (const count of Object.values(freq)) {
    const p = count / length;
    shannon += -p * Math.log2(p);
  }
  const shannonBits = shannon * length;

  return { length, charsetsUsed, charsetSize, theoreticalBits, shannonBits, freq };
}

function renderCharts(metrics) {
  // Destroy previous instances if they exist
  if (entropyChartInstance) entropyChartInstance.destroy();
  if (charDistChartInstance) charDistChartInstance.destroy();

  const ctxEntropy = document.getElementById('entropyChart').getContext('2d');
  const ctxChar = document.getElementById('charDistChart').getContext('2d');

  entropyChartInstance = new Chart(ctxEntropy, {
    type: 'bar',
    data: {
      labels: ['Password', 'Recommended'],
      datasets: [{
        label: 'Bits of Entropy',
        data: [metrics.theoreticalBits, 60],
        backgroundColor: ['#17a2b8', '#6c757d']
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Bits' } }
      }
    }
  });

  const values = [
    metrics.charsetsUsed.includes('lowercase') ? 1 : 0,
    metrics.charsetsUsed.includes('uppercase') ? 1 : 0,
    metrics.charsetsUsed.includes('digits') ? 1 : 0,
    metrics.charsetsUsed.includes('symbols') ? 1 : 0,
  ];

  charDistChartInstance = new Chart(ctxChar, {
    type: 'pie',
    data: {
      labels: ['lowercase', 'uppercase', 'digits', 'symbols'],
      datasets: [{
        data: values,
        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545']
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

document.getElementById('analyzePasswordBtn')?.addEventListener('click', () => {
  const passwordInput = document.getElementById('passwordInput');
  const password = passwordInput.value;
  const resultContainer = document.getElementById('passwordResult');
  
  if (!password) {
    resultContainer.innerHTML = '';
    return;
  }

  const result = zxcvbn(password);
  displayPasswordResult(result, password);
});

// Add an event listener to the input field to provide real-time feedback
document.getElementById('passwordInput')?.addEventListener('input', (e) => {
    const password = e.target.value;
    const resultContainer = document.getElementById('passwordResult');

    if (!password) {
        resultContainer.innerHTML = '';
        return;
    }
    
    const result = zxcvbn(password);
    displayPasswordResult(result, password);
}); 
// -----------------------------
// True Random Number Generator
// -----------------------------
let randomDistChartInstance = null;

function generateTrueRandom(min, max, count) {
  const range = max - min + 1;
  if (range <= 0) throw new Error('Max must be greater than min');
  if (!Number.isSafeInteger(range)) throw new Error('Range too large for safe integer generation');

  const results = [];
  const maxRand = Math.floor(0xFFFFFFFF / range) * range;

  for (let i = 0; i < count; i++) {
    let rand;
    do {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      rand = buf[0];
    } while (rand >= maxRand);
    results.push(min + (rand % range));
  }
  return results;
}

function displayRandomResult(numbers, min, max) {
  const container = document.getElementById('randomResult');
  if (!container) return;

  const count = numbers.length;
  const range = max - min + 1;

  // Sort numbers for display
  // const sortedNumbers = [...numbers].sort((a, b) => a - b);

  // Dynamic binning
  const BIN_THRESHOLD = 50;
  let labels = [];
  let data = [];
  let expected = [];
  if (range <= BIN_THRESHOLD) {
    const freq = new Map();
    for (let n of numbers) {
      freq.set(n, (freq.get(n) || 0) + 1);
    }
    for (let i = min; i <= max; i++) {
      labels.push(i.toString());
      data.push(freq.get(i) || 0);
    }
    expected = new Array(labels.length).fill(count / labels.length);
  } else {
    const binCount = Math.max(5, Math.ceil(1 + Math.log2(count))); // Sturges' formula
    const binSize = Math.ceil(range / binCount);
    data = new Array(binCount).fill(0);
    for (let n of numbers) {
      const binIndex = Math.min(binCount - 1, Math.floor((n - min) / binSize));
      data[binIndex]++;
    }
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binSize;
      const binMax = Math.min(binMin + binSize - 1, max);
      labels.push(`${binMin}-${binMax}`);
    }
    expected = new Array(binCount).fill(count / binCount);
  }

  container.innerHTML = `
    <div class="alert alert-success"><strong>Generated Numbers </strong></div>
    <pre class="bg-light p-3 rounded overflow-auto" style="max-height: 150px;"><code>${numbers.join(', ')}</code></pre>
    <h5 class="mt-3">Distribution Histogram</h5>
    <p class="text-muted mb-2">Blue bars show observed frequencies. Red line shows expected uniform distribution.</p>
    <canvas id="randomDistChart" height="250"></canvas>
  `;

  const ctx = document.getElementById('randomDistChart').getContext('2d');
  if (randomDistChartInstance) randomDistChartInstance.destroy();
  randomDistChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Observed Frequency',
          data: data,
          backgroundColor: 'rgba(0, 123, 255, 0.6)',
          borderColor: '#007bff',
          borderWidth: 1
        },
        {
          type: 'line',
          label: 'Expected Uniform',
          data: expected,
          borderColor: '#dc3545',
          borderWidth: 2,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Frequency' },
          suggestedMax: Math.max(...data) * 1.1
        },
        x: {
          title: { display: true, text: 'Value Range' }
        }
      },
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

document.getElementById('generateRandomBtn')?.addEventListener('click', () => {
  try {
    const min = parseInt(document.getElementById('minInput').value);
    const max = parseInt(document.getElementById('maxInput').value);
    const count = parseInt(document.getElementById('countInput').value);
    if (isNaN(min) || isNaN(max) || isNaN(count) || count < 1) {
      throw new Error('Invalid input values');
    }
    if (min >= max) {
      throw new Error('Min must be less than max');
    }
    if (count > 100) {
      throw new Error('Count exceeds maximum of 100');
    }
    const numbers = generateTrueRandom(min, max, count);
    displayRandomResult(numbers, min, max);
  } catch (e) {
    document.getElementById('randomResult').innerHTML = `<div class="alert alert-danger"><strong>Error:</strong> ${e.message}</div>`;
  }
}); 
// -----------------------------
// JavaScript AST Visualizer
// -----------------------------
function buildAstTree(node, name = 'root') {
  const treeNode = { name, children: [] };
  if (node.type) treeNode.name = `${name} (${node.type})`;
  for (let key in node) {
    if (node[key] && typeof node[key] === 'object' && !Array.isArray(node[key])) {
      treeNode.children.push(buildAstTree(node[key], key));
    } else if (Array.isArray(node[key])) {
      node[key].forEach((child, i) => {
        treeNode.children.push(buildAstTree(child, `${key}[${i}]`));
      });
    }
  }
  return treeNode;
}

function renderAstTree(treeData) {
  const container = document.getElementById('astResult');
  container.innerHTML = '';
  requestAnimationFrame(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'astSvg');
    svg.setAttribute('style', 'width: 100%; height: 800px;');
    container.appendChild(svg);

    const d3Svg = d3.select(svg);
    const width = svg.clientWidth || 800;
    const height = 800;
    d3Svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = d3Svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', ({transform}) => g.attr('transform', transform));
    d3Svg.call(zoom);

    const root = d3.hierarchy(treeData);
    const treeLayout = d3.tree().size([height - 80, width - 200]);
    const treeDataLayout = treeLayout(root);

    const links = g.selectAll('.link').data(treeDataLayout.links()).enter()
      .append('line').classed('link', true)
      .attr('x1', d => d.source.y + 40).attr('y1', d => d.source.x + 40)
      .attr('x2', d => d.target.y + 40).attr('y2', d => d.target.x + 40)
      .attr('stroke', '#999');

    const nodes = g.selectAll('.node').data(treeDataLayout.descendants()).enter()
      .append('g').classed('node', true)
      .attr('transform', d => `translate(${d.y + 40}, ${d.x + 40})`);

    nodes.append('circle').attr('r', 5).attr('fill', '#007bff');

    nodes.append('text')
      .text(d => d.data.name.length > 30 ? d.data.name.substring(0, 27) + '...' : d.data.name)
      .attr('dy', 4).attr('dx', 10)
      .attr('text-anchor', 'start')
      .attr('fill', '#333').attr('font-size', '12px');
  });
}

document.getElementById('visualizeAstBtn')?.addEventListener('click', () => {
  const code = document.getElementById('codeInput').value;
  try {
    const ast = acorn.parse(code, { ecmaVersion: 2020 });
    const tree = buildAstTree(ast);
    renderAstTree(tree);
  } catch (e) {
    const msg = e.name === 'SyntaxError' ? `Parse Error: ${e.message}` : `Error: ${e.message}`;
    document.getElementById('astResult').innerHTML = `&lt;div class=&quot;alert alert-danger&quot;&gt;${msg}&lt;/div&gt;`;
  }
});

// -----------------------------
// Advanced Regex Tester
// -----------------------------
const regexExplanations = {
  '\d': 'Digit', '\w': 'Word character', '\s': 'Whitespace',
  '^': 'Start of string', '$': 'End of string', '.': 'Any character'
};

function explainRegex(pattern) {
  let explanation = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (regexExplanations[ch]) {
      explanation += `${ch}: ${regexExplanations[ch]} `;
    }
  }
  return explanation || 'No specific explanations available.';
}

function highlightMatches(text, matches) {
  let highlighted = text;
  matches.sort((a, b) => b.index - a.index);
  matches.forEach(match => {
    const start = match.index;
    const end = start + match[0].length;
    highlighted = highlighted.slice(0, start) + '<span class="bg-warning">' + highlighted.slice(start, end) + '</span>' + highlighted.slice(end);
  });
  return highlighted;
}

document.getElementById('testRegexBtn')?.addEventListener('click', () => {
  const patternStr = document.getElementById('regexInput').value;
  const testStr = document.getElementById('testString').value;
  try {
    const regex = new RegExp(patternStr, 'g');
    const matches = [...testStr.matchAll(regex)];
    const highlighted = highlightMatches(testStr, matches);
    const explanation = explainRegex(patternStr);
    document.getElementById('regexResult').innerHTML = `
      <div class="alert alert-success"><strong>Matches Found:</strong> ${matches.length}</div>
      <h5>Highlighted Text:</h5>
      <pre class="bg-light p-3 rounded">${highlighted}</pre>
      <h5>Explanation:</h5>
      <p>${explanation}</p>
      <h5>Match Details:</h5>
      <ul class="list-group">
        ${matches.map(m => `<li class="list-group-item">${m[0]} (at ${m.index})</li>`).join('')}
      </ul>
    `;
  } catch (e) {
    document.getElementById('regexResult').innerHTML = `<div class="alert alert-danger">Invalid Regex: ${e.message}</div>`;
  }
}); 

// -----------------------------
// UUID & ULID Generator
// -----------------------------

// Crockford's Base32 encoding for ULID
const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// UUID v4 (Random) Generator
function generateUUIDv4() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  
  return formatUUIDBytes(bytes);
}

// UUID v1 (Timestamp + MAC) Generator
function generateUUIDv1() {
  // Get current timestamp in 100-nanosecond intervals since Oct 15, 1582
  const now = Date.now();
  const timestamp = (now * 10000) + 0x01B21DD213814000n;
  
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // Set timestamp
  const timestampHex = timestamp.toString(16).padStart(16, '0');
  bytes[0] = parseInt(timestampHex.slice(14, 16), 16);
  bytes[1] = parseInt(timestampHex.slice(12, 14), 16);
  bytes[2] = parseInt(timestampHex.slice(10, 12), 16);
  bytes[3] = parseInt(timestampHex.slice(8, 10), 16);
  bytes[4] = parseInt(timestampHex.slice(6, 8), 16);
  bytes[5] = parseInt(timestampHex.slice(4, 6), 16);
  bytes[6] = (parseInt(timestampHex.slice(2, 4), 16) & 0x0f) | 0x10; // Version 1
  bytes[7] = parseInt(timestampHex.slice(0, 2), 16);
  
  // Set variant
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  return formatUUIDBytes(bytes);
}

// UUID v3/v5 (Namespace + Hash) Generator
async function generateNamespaceUUID(version, namespace, name) {
  try {
    // Validate namespace UUID
    const namespaceBytes = parseUUID(namespace);
    if (!namespaceBytes) {
      throw new Error('Invalid namespace UUID format');
    }
    
    // Combine namespace and name
    const nameBytes = new TextEncoder().encode(name);
    const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
    combined.set(namespaceBytes);
    combined.set(nameBytes, namespaceBytes.length);
    
    // Hash the combined data
    const algorithm = version === 'v3' ? 'MD5' : 'SHA-1';
    const hashBuffer = await crypto.subtle.digest(algorithm, combined);
    const hashBytes = new Uint8Array(hashBuffer);
    
    // Take first 16 bytes and set version/variant
    const uuidBytes = hashBytes.slice(0, 16);
    uuidBytes[6] = (uuidBytes[6] & 0x0f) | (version === 'v3' ? 0x30 : 0x50);
    uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80;
    
    return formatUUIDBytes(uuidBytes);
  } catch (error) {
    throw new Error(`Failed to generate ${version.toUpperCase()}: ${error.message}`);
  }
}

// Parse UUID string to bytes
function parseUUID(uuidString) {
  const hex = uuidString.replace(/-/g, '');
  if (hex.length !== 32 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Format UUID bytes to standard string format
function formatUUIDBytes(bytes) {
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Analyze UUID and return details
function analyzeUUID(uuid) {
  const bytes = parseUUID(uuid);
  if (!bytes) return { error: 'Invalid UUID format' };
  
  const version = (bytes[6] & 0xf0) >> 4;
  const variant = (bytes[8] & 0xc0) >> 6;
  
  const details = {
    version: version,
    variant: variant === 2 ? 'RFC 4122' : variant === 6 ? 'Microsoft' : variant === 7 ? 'Future' : 'Reserved',
    hex: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  };
  
  if (version === 1) {
    // Extract timestamp from v1 UUID
    const timestampHex = 
      bytes[7].toString(16).padStart(2, '0') +
      bytes[6].toString(16).padStart(2, '0').slice(1) +
      bytes[5].toString(16).padStart(2, '0') +
      bytes[4].toString(16).padStart(2, '0') +
      bytes[3].toString(16).padStart(2, '0') +
      bytes[2].toString(16).padStart(2, '0') +
      bytes[1].toString(16).padStart(2, '0') +
      bytes[0].toString(16).padStart(2, '0');
    
    const timestamp = BigInt('0x' + timestampHex) - 0x01B21DD213814000n;
    const ms = Number(timestamp / 10000n);
    details.timestamp = new Date(ms).toISOString();
  }
  
  return details;
}

// ULID Generator
function generateULID(timestamp = null) {
  const time = timestamp !== null ? timestamp : Date.now();
  const timeBytes = new Uint8Array(6);
  const randomBytes = new Uint8Array(10);
  
  // Set timestamp bytes (48 bits)
  let timeValue = time;
  for (let i = 5; i >= 0; i--) {
    timeBytes[i] = timeValue & 0xff;
    timeValue = Math.floor(timeValue / 256);
  }
  
  // Generate random bytes (80 bits)
  crypto.getRandomValues(randomBytes);
  
  // Encode to Crockford Base32
  const combined = new Uint8Array(16);
  combined.set(timeBytes);
  combined.set(randomBytes, 6);
  
  return encodeBase32(combined);
}

// Encode bytes to Crockford Base32
function encodeBase32(bytes) {
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      result += ULID_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    result += ULID_ALPHABET[(value << (5 - bits)) & 31];
  }
  
  return result;
}

// Analyze ULID and return details
function analyzeULID(ulid) {
  if (ulid.length !== 26) {
    return { error: 'Invalid ULID length (must be 26 characters)' };
  }
  
  if (!/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+$/.test(ulid)) {
    return { error: 'Invalid ULID characters' };
  }
  
  try {
    // Decode the timestamp part (first 10 characters)
    const timePart = ulid.slice(0, 10);
    const randomPart = ulid.slice(10);
    
    // Decode timestamp
    let timestamp = 0;
    for (const char of timePart) {
      timestamp = timestamp * 32 + ULID_ALPHABET.indexOf(char);
    }
    
    return {
      timestamp: timestamp,
      timestampISO: new Date(timestamp).toISOString(),
      timestampPart: timePart,
      randomPart: randomPart,
      hex: decodeULIDToHex(ulid)
    };
  } catch (error) {
    return { error: 'Failed to decode ULID' };
  }
}

// Decode ULID to hex representation
function decodeULIDToHex(ulid) {
  const bytes = new Uint8Array(16);
  let bits = 0;
  let value = 0;
  let byteIndex = 0;
  
  for (const char of ulid) {
    value = (value << 5) | ULID_ALPHABET.indexOf(char);
    bits += 5;
    
    while (bits >= 8 && byteIndex < 16) {
      bytes[byteIndex++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Copy to clipboard helper
function copyToClipboard(text, buttonId, originalText) {
  if (!text) return;
  
  navigator.clipboard.writeText(text).then(() => {
    const button = document.getElementById(buttonId);
    if (button) {
      const original = button.textContent;
      button.textContent = 'Copied! ✅';
      button.classList.add('btn-success');
      button.classList.remove('btn-outline-info');
      
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-info');
      }, 1500);
    }
  });
}

// Display UUID details
function displayUUIDDetails(uuid) {
  const details = analyzeUUID(uuid);
  const container = document.getElementById('uuidDetails');
  
  if (details.error) {
    container.innerHTML = `<div class="alert alert-danger">${details.error}</div>`;
    return;
  }
  
  let html = `
    <div class="card">
      <div class="card-body">
        <h6 class="card-title">UUID Details</h6>
        <table class="table table-sm">
          <tr><th>Version:</th><td>${details.version}</td></tr>
          <tr><th>Variant:</th><td>${details.variant}</td></tr>
          <tr><th>Hex:</th><td><code>${details.hex}</code></td></tr>
  `;
  
  if (details.timestamp) {
    html += `<tr><th>Timestamp:</th><td>${details.timestamp}</td></tr>`;
  }
  
  html += `
        </table>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Display ULID details
function displayULIDDetails(ulid) {
  const details = analyzeULID(ulid);
  const container = document.getElementById('ulidDetails');
  
  if (details.error) {
    container.innerHTML = `<div class="alert alert-danger">${details.error}</div>`;
    return;
  }
  
  const html = `
    <div class="card">
      <div class="card-body">
        <h6 class="card-title">ULID Details</h6>
        <table class="table table-sm">
          <tr><th>Timestamp:</th><td>${details.timestamp} ms</td></tr>
          <tr><th>ISO Time:</th><td>${details.timestampISO}</td></tr>
          <tr><th>Time Part:</th><td><code>${details.timestampPart}</code></td></tr>
          <tr><th>Random Part:</th><td><code>${details.randomPart}</code></td></tr>
          <tr><th>Hex:</th><td><code>${details.hex}</code></td></tr>
        </table>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // UUID version selector
  document.getElementById('uuidVersion')?.addEventListener('change', (e) => {
    const namespaceInputs = document.getElementById('namespaceInputs');
    const showNamespace = e.target.value === 'v3' || e.target.value === 'v5';
    namespaceInputs.style.display = showNamespace ? 'block' : 'none';
  });
  
  // Generate UUID
  document.getElementById('generateUuidBtn')?.addEventListener('click', async () => {
    try {
      const version = document.getElementById('uuidVersion').value;
      let uuid;
      
      switch (version) {
        case 'v1':
          uuid = generateUUIDv1();
          break;
        case 'v3':
        case 'v5':
          const namespace = document.getElementById('namespaceInput').value.trim();
          const name = document.getElementById('nameInput').value.trim();
          if (!namespace || !name) {
            throw new Error('Namespace and name are required for v3/v5 UUIDs');
          }
          uuid = await generateNamespaceUUID(version, namespace, name);
          break;
        case 'v4':
        default:
          uuid = generateUUIDv4();
          break;
      }
      
      document.getElementById('uuidResult').value = uuid;
      displayUUIDDetails(uuid);
    } catch (error) {
      document.getElementById('uuidDetails').innerHTML = 
        `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  });
  
  // Generate ULID
  document.getElementById('generateUlidBtn')?.addEventListener('click', () => {
    try {
      const timestampInput = document.getElementById('ulidTimestamp').value.trim();
      const timestamp = timestampInput ? parseInt(timestampInput) : null;
      
      if (timestampInput && (isNaN(timestamp) || timestamp < 0)) {
        throw new Error('Invalid timestamp. Must be a positive number (epoch milliseconds)');
      }
      
      const ulid = generateULID(timestamp);
      document.getElementById('ulidResult').value = ulid;
      displayULIDDetails(ulid);
    } catch (error) {
      document.getElementById('ulidDetails').innerHTML = 
        `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  });
  
  // Bulk UUID generation
  document.getElementById('bulkUuidBtn')?.addEventListener('click', () => {
    const count = Math.min(parseInt(document.getElementById('bulkCount').value) || 10, 100);
    const uuids = [];
    
    for (let i = 0; i < count; i++) {
      uuids.push(generateUUIDv4());
    }
    
    document.getElementById('bulkResult').value = uuids.join('\n');
  });
  
  // Bulk ULID generation
  document.getElementById('bulkUlidBtn')?.addEventListener('click', () => {
    const count = Math.min(parseInt(document.getElementById('bulkCount').value) || 10, 100);
    const ulids = [];
    
    for (let i = 0; i < count; i++) {
      ulids.push(generateULID());
    }
    
    document.getElementById('bulkResult').value = ulids.join('\n');
  });
  
  // Copy buttons
  document.getElementById('copyUuidBtn')?.addEventListener('click', () => {
    const uuid = document.getElementById('uuidResult').value;
    copyToClipboard(uuid, 'copyUuidBtn', 'Copy UUID 📋');
  });
  
  document.getElementById('copyUlidBtn')?.addEventListener('click', () => {
    const ulid = document.getElementById('ulidResult').value;
    copyToClipboard(ulid, 'copyUlidBtn', 'Copy ULID 📋');
  });
  
  document.getElementById('copyBulkBtn')?.addEventListener('click', () => {
    const bulk = document.getElementById('bulkResult').value;
    copyToClipboard(bulk, 'copyBulkBtn', 'Copy All 📋');
  });
}); 