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

// -----------------------------
// Cryptographic Key Pair Generator
// -----------------------------

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to convert ArrayBuffer to Hex
function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('').toUpperCase();
}

// Convert CryptoKey to PEM format
async function cryptoKeyToPEM(key, isPrivate = false) {
  const exported = await crypto.subtle.exportKey(
    isPrivate ? 'pkcs8' : 'spki',
    key
  );
  
  const base64 = arrayBufferToBase64(exported);
  const keyType = isPrivate ? 'PRIVATE KEY' : 'PUBLIC KEY';
  
  // Format as PEM with line breaks every 64 characters
  const formattedBase64 = base64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${keyType}-----\n${formattedBase64}\n-----END ${keyType}-----`;
}

// Convert CryptoKey to JWK format
async function cryptoKeyToJWK(key) {
  return await crypto.subtle.exportKey('jwk', key);
}

// Convert CryptoKey to Raw hex format
async function cryptoKeyToRaw(key) {
  try {
    const exported = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToHex(exported);
  } catch (error) {
    // If raw export fails, fall back to SPKI/PKCS8
    const isPrivate = key.type === 'private';
    const exported = await crypto.subtle.exportKey(
      isPrivate ? 'pkcs8' : 'spki',
      key
    );
    return arrayBufferToHex(exported);
  }
}

// Generate key pair based on algorithm and parameters
async function generateCryptoKeyPair(algorithm, params) {
  const keyGenParams = {
    name: algorithm,
    ...params
  };

  // Determine key usages based on algorithm
  let keyUsages = [];
  switch (algorithm) {
    case 'RSA-PSS':
      keyUsages = ['sign', 'verify'];
      keyGenParams.hash = 'SHA-256';
      break;
    case 'RSA-OAEP':
      keyUsages = ['encrypt', 'decrypt'];
      keyGenParams.hash = 'SHA-256';
      break;
    case 'ECDSA':
      keyUsages = ['sign', 'verify'];
      keyGenParams.hash = 'SHA-256';
      break;
    case 'Ed25519':
      keyUsages = ['sign', 'verify'];
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  return await crypto.subtle.generateKey(keyGenParams, true, keyUsages);
}

// Analyze key pair and return details
async function analyzeKeyPair(keyPair, algorithm, params) {
  const privateKeyJWK = await cryptoKeyToJWK(keyPair.privateKey);
  const publicKeyJWK = await cryptoKeyToJWK(keyPair.publicKey);
  
  const analysis = {
    algorithm: algorithm,
    keyType: keyPair.privateKey.type,
    extractable: keyPair.privateKey.extractable,
    usages: keyPair.privateKey.usages,
    publicUsages: keyPair.publicKey.usages
  };

  // Add algorithm-specific details
  switch (algorithm) {
    case 'RSA-PSS':
    case 'RSA-OAEP':
      analysis.modulusLength = params.modulusLength;
      analysis.publicExponent = new Uint8Array(params.publicExponent);
      analysis.hashAlgorithm = 'SHA-256';
      if (privateKeyJWK.n) {
        // Calculate actual modulus length from JWK
        const modulusBytes = atob(privateKeyJWK.n.replace(/-/g, '+').replace(/_/g, '/'));
        analysis.actualModulusLength = modulusBytes.length * 8;
      }
      break;
    case 'ECDSA':
      analysis.namedCurve = params.namedCurve;
      analysis.hashAlgorithm = 'SHA-256';
      break;
    case 'Ed25519':
      analysis.curveType = 'Edwards25519';
      analysis.keyLength = 256;
      break;
  }

  return analysis;
}

// Format key pair output based on selected format
async function formatKeyPair(keyPair, format) {
  switch (format) {
    case 'PEM':
      return {
        privateKey: await cryptoKeyToPEM(keyPair.privateKey, true),
        publicKey: await cryptoKeyToPEM(keyPair.publicKey, false)
      };
    case 'JWK':
      return {
        privateKey: JSON.stringify(await cryptoKeyToJWK(keyPair.privateKey), null, 2),
        publicKey: JSON.stringify(await cryptoKeyToJWK(keyPair.publicKey), null, 2)
      };
    case 'Raw':
      return {
        privateKey: await cryptoKeyToRaw(keyPair.privateKey),
        publicKey: await cryptoKeyToRaw(keyPair.publicKey)
      };
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// Display key analysis
function displayKeyAnalysis(analysis) {
  const container = document.getElementById('keyAnalysis');
  
  let html = `
    <div class="card">
      <div class="card-body">
        <table class="table table-sm">
          <tr><th>Algorithm:</th><td><code>${analysis.algorithm}</code></td></tr>
          <tr><th>Key Type:</th><td>${analysis.keyType}</td></tr>
          <tr><th>Extractable:</th><td>${analysis.extractable ? '✅ Yes' : '❌ No'}</td></tr>
          <tr><th>Private Key Usages:</th><td>${analysis.usages.join(', ')}</td></tr>
          <tr><th>Public Key Usages:</th><td>${analysis.publicUsages.join(', ')}</td></tr>
  `;

  if (analysis.modulusLength) {
    html += `
          <tr><th>Modulus Length:</th><td>${analysis.modulusLength} bits</td></tr>
          <tr><th>Hash Algorithm:</th><td>${analysis.hashAlgorithm}</td></tr>
    `;
  }

  if (analysis.namedCurve) {
    html += `
          <tr><th>Named Curve:</th><td>${analysis.namedCurve}</td></tr>
          <tr><th>Hash Algorithm:</th><td>${analysis.hashAlgorithm}</td></tr>
    `;
  }

  if (analysis.curveType) {
    html += `
          <tr><th>Curve Type:</th><td>${analysis.curveType}</td></tr>
          <tr><th>Key Length:</th><td>${analysis.keyLength} bits</td></tr>
    `;
  }

  html += `
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// Download key as file
function downloadKey(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Enhanced copy function for crypto keys
function copyCryptoKey(text, buttonId, keyType) {
  if (!text) return;
  
  navigator.clipboard.writeText(text).then(() => {
    const button = document.getElementById(buttonId);
    if (button) {
      const original = button.textContent;
      button.textContent = `Copied ${keyType}! ✅`;
      button.classList.add('btn-success');
      button.classList.remove('btn-outline-danger', 'btn-outline-info');
      
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('btn-success');
        button.classList.add(keyType === 'Private Key' ? 'btn-outline-danger' : 'btn-outline-info');
      }, 1500);
    }
  });
}

  // -----------------------------
  // Crypto Key Generator Event Listeners
  // -----------------------------
  
  // Algorithm change handler
  document.getElementById('cryptoAlgorithm')?.addEventListener('change', (e) => {
    const algorithm = e.target.value;
    const rsaKeySize = document.getElementById('rsaKeySize');
    const ecdsaCurve = document.getElementById('ecdsaCurve');
    
    // Show/hide algorithm-specific options
    if (algorithm.startsWith('RSA')) {
      rsaKeySize.style.display = 'block';
      ecdsaCurve.style.display = 'none';
    } else if (algorithm === 'ECDSA') {
      rsaKeySize.style.display = 'none';
      ecdsaCurve.style.display = 'block';
    } else {
      rsaKeySize.style.display = 'none';
      ecdsaCurve.style.display = 'none';
    }
  });

  // Generate key pair
  document.getElementById('generateKeyPairBtn')?.addEventListener('click', async () => {
    try {
      const algorithm = document.getElementById('cryptoAlgorithm').value;
      const format = document.getElementById('outputFormat').value;
      const progressDiv = document.getElementById('keyGenProgress');
      const statusDiv = document.getElementById('keyGenStatus');
      const resultsDiv = document.getElementById('keyPairResults');
      
      // Show progress
      progressDiv.style.display = 'block';
      statusDiv.innerHTML = '';
      resultsDiv.style.display = 'none';
      
      // Prepare algorithm parameters
      let params = {};
      
      switch (algorithm) {
        case 'RSA-PSS':
        case 'RSA-OAEP':
          params = {
            modulusLength: parseInt(document.getElementById('rsaModulusLength').value),
            publicExponent: new Uint8Array([1, 0, 1]) // 65537
          };
          break;
        case 'ECDSA':
          params = {
            namedCurve: document.getElementById('ecdsaNamedCurve').value
          };
          break;
        case 'Ed25519':
          // Ed25519 doesn't need additional parameters
          break;
      }
      
      // Generate key pair
      const keyPair = await generateCryptoKeyPair(algorithm, params);
      
      // Format keys
      const formattedKeys = await formatKeyPair(keyPair, format);
      
      // Display keys
      document.getElementById('privateKeyOutput').value = formattedKeys.privateKey;
      document.getElementById('publicKeyOutput').value = formattedKeys.publicKey;
      
      // Analyze and display key details
      const analysis = await analyzeKeyPair(keyPair, algorithm, params);
      displayKeyAnalysis(analysis);
      
      // Hide progress and show results
      progressDiv.style.display = 'none';
      resultsDiv.style.display = 'block';
      statusDiv.innerHTML = '<div class="alert alert-success">Key pair generated successfully! 🎉</div>';
      
    } catch (error) {
      console.error('Key generation failed:', error);
      document.getElementById('keyGenProgress').style.display = 'none';
      document.getElementById('keyGenStatus').innerHTML = 
        `<div class="alert alert-danger"><strong>Error:</strong> ${error.message}</div>`;
    }
  });

  // Copy buttons
  document.getElementById('copyPrivateKeyBtn')?.addEventListener('click', () => {
    const privateKey = document.getElementById('privateKeyOutput').value;
    copyCryptoKey(privateKey, 'copyPrivateKeyBtn', 'Private Key');
  });

  document.getElementById('copyPublicKeyBtn')?.addEventListener('click', () => {
    const publicKey = document.getElementById('publicKeyOutput').value;
    copyCryptoKey(publicKey, 'copyPublicKeyBtn', 'Public Key');
  });

  // Download buttons
  document.getElementById('downloadPrivateKeyBtn')?.addEventListener('click', () => {
    const privateKey = document.getElementById('privateKeyOutput').value;
    const algorithm = document.getElementById('cryptoAlgorithm').value;
    const format = document.getElementById('outputFormat').value;
    const extension = format === 'JWK' ? 'json' : (format === 'PEM' ? 'pem' : 'txt');
    downloadKey(privateKey, `private_key_${algorithm.toLowerCase()}.${extension}`);
  });

  document.getElementById('downloadPublicKeyBtn')?.addEventListener('click', () => {
    const publicKey = document.getElementById('publicKeyOutput').value;
    const algorithm = document.getElementById('cryptoAlgorithm').value;
    const format = document.getElementById('outputFormat').value;
    const extension = format === 'JWK' ? 'json' : (format === 'PEM' ? 'pem' : 'txt');
    downloadKey(publicKey, `public_key_${algorithm.toLowerCase()}.${extension}`);
  }); 

// -----------------------------
// Magic String Analyzer
// -----------------------------

const stringAnalyzers = [
  // JWT: Must have 3 parts separated by dots, and Base64-decodable parts.
  {
    name: 'JWT (JSON Web Token)',
    test: (s) => {
      const parts = s.split('.');
      if (parts.length !== 3) return false;
      try {
        decodeBase64UrlForJwt(parts[0]);
        decodeBase64UrlForJwt(parts[1]);
        return true;
      } catch {
        return false;
      }
    },
    analyze: (s) => {
      const parts = s.split('.');
      const header = JSON.parse(decodeBase64UrlForJwt(parts[0]));
      const payload = JSON.parse(decodeBase64UrlForJwt(parts[1]));
      const signature = parts[2];

      const details = {
        Header: `<pre>${JSON.stringify(header, null, 2)}</pre>`,
        Payload: `<pre>${JSON.stringify(payload, null, 2)}</pre>`,
        Signature: `<code>${signature}</code>`,
      };
      if (payload.exp) {
        const expiryDate = new Date(payload.exp * 1000);
        details['Expires'] = `${expiryDate.toUTCString()} (${expiryDate < new Date() ? 'expired' : 'valid'})`;
      }
      return details;
    }
  },

  // JSON: Must start with { or [ and end with } or ].
  {
    name: 'JSON',
    test: (s) => {
      s = s.trim();
      return (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'));
    },
    analyze: (s) => {
      try {
        const obj = JSON.parse(s);
        const details = {
          'Pretty-Printed': `<pre>${JSON.stringify(obj, null, 2)}</pre>`,
          'Type': `<code>${Array.isArray(obj) ? 'Array' : typeof obj}</code>`,
        };
        if (Array.isArray(obj)) {
          details['Item Count'] = `<code>${obj.length}</code>`;
        } else if (typeof obj === 'object' && obj !== null) {
          details['Key Count'] = `<code>${Object.keys(obj).length}</code>`;
        }
        return details;
      } catch (e) {
        return { Error: `Invalid JSON: ${e.message}` };
      }
    }
  },

  // URL: Must be parsable by the URL constructor.
  {
    name: 'URL',
    test: (s) => {
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    },
    analyze: (s) => {
      const url = new URL(s);
      const params = {};
      url.searchParams.forEach((val, key) => params[key] = val);
      return {
        Protocol: `<code>${url.protocol}</code>`,
        Hostname: `<code>${url.hostname}</code>`,
        Port: `<code>${url.port || 'default'}</code>`,
        Path: `<code>${url.pathname}</code>`,
        'Query Parameters': Object.keys(params).length > 0 ? `<pre>${JSON.stringify(params, null, 2)}</pre>` : 'None',
        Hash: `<code>${url.hash || 'None'}</code>`,
      };
    }
  },
  
  // Base64: A bit tricky to detect reliably, but we can check for common chars and length.
  {
    name: 'Base64',
    test: (s) => /^[A-Za-z0-9+/=]+$/.test(s) && s.length % 4 === 0,
    analyze: (s) => {
      try {
        const decoded = decodeBase64(s);
        return {
          'Decoded (UTF-8)': `<pre>${decoded}</pre>`,
          'Original Length': `<code>${s.length} bytes</code>`,
          'Decoded Length': `<code>${decoded.length} characters</code>`
        };
      } catch {
        return { Error: 'Could not decode Base64 string.' };
      }
    }
  },

  // Plain Text: The fallback analyzer
  {
    name: 'Plain Text',
    test: () => true, // Always matches
    analyze: (s) => {
      const lines = s.split(/\r?\n/);
      const words = s.trim().split(/\s+/);
      const charFreq = [...s].reduce((acc, char) => {
        acc[char] = (acc[char] || 0) + 1;
        return acc;
      }, {});
      const sortedChars = Object.entries(charFreq).sort((a,b) => b[1] - a[1]).slice(0, 10);

      return {
        'Character Count': `<code>${s.length}</code>`,
        'Word Count': `<code>${s.trim() ? words.length : 0}</code>`,
        'Line Count': `<code>${lines.length}</code>`,
        'Avg. Word Length': `<code>${(words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1)).toFixed(2)}</code>`,
        'Top 10 Characters': `<pre>${sortedChars.map(([char, count]) => `'${char}': ${count}`).join('\n')}</pre>`
      };
    }
  },
];

function displayStringAnalysis(results) {
  const container = document.getElementById('stringAnalyzerResult');
  if (!results || results.length === 0) {
    container.innerHTML = '<div class="alert alert-warning">Could not determine the string type.</div>';
    return;
  }
  
  let html = `
    <div class="alert alert-success"><strong>Detected as: ${results[0].name}</strong></div>
    <ul class="list-group">
  `;

  for (const [key, value] of Object.entries(results[0].analysis)) {
    html += `<li class="list-group-item"><strong>${key}:</strong><br>${value}</li>`;
  }
  
  html += '</ul>';
  
  if (results.length > 1) {
    html += '<h5 class="mt-4">Other possibilities:</h5>';
    html += results.slice(1).map(r => `<span class="badge badge-secondary mr-2">${r.name}</span>`).join('');
  }

  container.innerHTML = html;
}

document.getElementById('analyzeStringBtn')?.addEventListener('click', () => {
  const input = document.getElementById('stringAnalyzerInput').value.trim();
  if (!input) {
    document.getElementById('stringAnalyzerResult').innerHTML = '';
    return;
  }
  
  const possibleTypes = [];
  for (const analyzer of stringAnalyzers) {
    if (analyzer.test(input)) {
      possibleTypes.push({
        name: analyzer.name,
        analysis: analyzer.analyze(input)
      });
    }
  }
  displayStringAnalysis(possibleTypes);
}); 

// -----------------------------
// Advanced Magic String Analyzer with Wow Factor
// -----------------------------

// Global chart instances for cleanup (Magic String Analyzer)
let stringDnaChartInstance = null;
let stringEntropyChartInstance = null;

// Enhanced analyzers with recursive decoding and advanced pattern detection
const advancedStringAnalyzers = [
  // Cryptographic Hash Detection
  {
    name: 'Cryptographic Hash',
    test: (s) => {
      s = s.replace(/[^a-fA-F0-9]/g, '');
      return [32, 40, 56, 64, 96, 128].includes(s.length) && /^[a-fA-F0-9]+$/.test(s);
    },
    analyze: (s) => {
      const clean = s.replace(/[^a-fA-F0-9]/g, '');
      const types = {
        32: 'MD5', 40: 'SHA-1', 56: 'SHA-224', 64: 'SHA-256',
        96: 'SHA-384', 128: 'SHA-512'
      };
      return {
        'Hash Type': `<code>${types[clean.length] || 'Unknown'}</code>`,
        'Length': `<code>${clean.length} characters</code>`,
        'Hex Value': `<code class="text-break">${clean}</code>`,
        'Entropy': `<code>${computeHexEntropy(clean).toFixed(2)} bits</code>`
      };
    }
  },

  // Binary File Header Detection
  {
    name: 'Binary File Header',
    test: (s) => {
      const hex = s.replace(/[^a-fA-F0-9]/g, '');
      const magicBytes = ['89504E47', 'FFD8FF', '25504446', '504B0304', 'D0CF11E0'];
      return magicBytes.some(magic => hex.toUpperCase().startsWith(magic));
    },
    analyze: (s) => {
      const hex = s.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
      const signatures = {
        '89504E47': { type: 'PNG Image', mime: 'image/png' },
        'FFD8FF': { type: 'JPEG Image', mime: 'image/jpeg' },
        '25504446': { type: 'PDF Document', mime: 'application/pdf' },
        '504B0304': { type: 'ZIP Archive', mime: 'application/zip' },
        'D0CF11E0': { type: 'Microsoft Office', mime: 'application/msword' }
      };
      
      for (const [magic, info] of Object.entries(signatures)) {
        if (hex.startsWith(magic)) {
          return {
            'File Type': `<code>${info.type}</code>`,
            'MIME Type': `<code>${info.mime}</code>`,
            'Magic Bytes': `<code>${magic}</code>`,
            'Hex Preview': `<code class="text-break">${hex.slice(0, 32)}...</code>`
          };
        }
      }
    }
  },

  // Network Address Analysis
  {
    name: 'Network Address',
    test: (s) => {
      return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/\d{1,2})?$/.test(s) ||
             /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(s) ||
             /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/.test(s);
    },
    analyze: (s) => {
      if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/\d{1,2})?$/.test(s)) {
        const [ip, cidr] = s.split('/');
        const octets = ip.split('.').map(Number);
        const isPrivate = (octets[0] === 10) || 
                         (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
                         (octets[0] === 192 && octets[1] === 168);
        
        return {
          'Type': '<code>IPv4 Address</code>',
          'Address': `<code>${ip}</code>`,
          'CIDR': cidr ? `<code>/${cidr}</code>` : 'None',
          'Network Class': `<code>${octets[0] < 128 ? 'A' : octets[0] < 192 ? 'B' : 'C'}</code>`,
          'Private/Public': `<code>${isPrivate ? 'Private' : 'Public'}</code>`,
          'Binary': `<code>${octets.map(o => o.toString(2).padStart(8, '0')).join('.')}</code>`
        };
      } else if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(s)) {
        const clean = s.replace(/[:-]/g, '').toUpperCase();
        const vendor = clean.slice(0, 6);
        return {
          'Type': '<code>MAC Address</code>',
          'Address': `<code>${s}</code>`,
          'OUI': `<code>${vendor}</code>`,
          'Normalized': `<code>${clean.match(/.{2}/g).join(':')}</code>`
        };
      } else {
        return {
          'Type': '<code>IPv6 Address</code>',
          'Address': `<code>${s}</code>`,
          'Compressed': '<code>Yes</code>'
        };
      }
    }
  },

  // Cron Expression
  {
    name: 'Cron Expression',
    test: (s) => /^(\*|[0-5]?\d|\*\/\d+)\s+(\*|[01]?\d|2[0-3]|\*\/\d+)\s+(\*|[12]?\d|3[01]|\*\/\d+)\s+(\*|[01]?\d|\*\/\d+)\s+(\*|[0-6]|\*\/\d+)(\s+(\*|\d{4}))?$/.test(s),
    analyze: (s) => {
      const parts = s.split(/\s+/);
      const fields = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week', 'Year'];
      const ranges = ['0-59', '0-23', '1-31', '1-12', '0-6 (Sun-Sat)', 'YYYY'];
      
      return {
        'Type': '<code>Cron Expression</code>',
        'Schedule': `<pre>${fields.map((field, i) => `${field.padEnd(15)}: ${parts[i] || 'N/A'} (${ranges[i]})`).join('\n')}</pre>`,
        'Human Readable': `<code>${parseCronToHuman(s)}</code>`
      };
    }
  },

  // GPS Coordinates
  {
    name: 'GPS Coordinates',
    test: (s) => /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/.test(s) || /^\d{1,2}°\d{1,2}'\d{1,2}(\.\d+)?"[NS],?\s*\d{1,3}°\d{1,2}'\d{1,2}(\.\d+)?"[EW]$/.test(s),
    analyze: (s) => {
      if (/^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/.test(s)) {
        const [lat, lng] = s.split(',').map(n => parseFloat(n.trim()));
        return {
          'Format': '<code>Decimal Degrees</code>',
          'Latitude': `<code>${lat}°</code>`,
          'Longitude': `<code>${lng}°</code>`,
          'Hemisphere': `<code>${lat >= 0 ? 'N' : 'S'}, ${lng >= 0 ? 'E' : 'W'}</code>`,
          'Google Maps': `<a href="https://maps.google.com/?q=${lat},${lng}" target="_blank">View on Map 🗺️</a>`
        };
      }
      return { 'Format': '<code>DMS (Degrees, Minutes, Seconds)</code>' };
    }
  },

  // Credit Card Number
  {
    name: 'Credit Card',
    test: (s) => {
      const clean = s.replace(/[\s-]/g, '');
      return /^\d{13,19}$/.test(clean) && luhnCheck(clean);
    },
    analyze: (s) => {
      const clean = s.replace(/[\s-]/g, '');
      const cardTypes = {
        '^4': 'Visa', '^5[1-5]': 'MasterCard', '^3[47]': 'American Express',
        '^6011': 'Discover', '^30[0-5]': 'Diners Club'
      };
      
      let type = 'Unknown';
      for (const [pattern, name] of Object.entries(cardTypes)) {
        if (new RegExp(pattern).test(clean)) {
          type = name;
          break;
        }
      }
      
      return {
        'Card Type': `<code>${type}</code>`,
        'Number': `<code>${clean.replace(/(\d{4})/g, '$1 ').trim()}</code>`,
        'Luhn Valid': '<code>✅ Valid</code>',
        'Length': `<code>${clean.length} digits</code>`,
        'Masked': `<code>****-****-****-${clean.slice(-4)}</code>`
      };
    }
  },

  // JWT (Enhanced)
  {
    name: 'JWT (JSON Web Token)',
    test: (s) => {
      const parts = s.split('.');
      if (parts.length !== 3) return false;
      try {
        decodeBase64UrlForJwt(parts[0]);
        decodeBase64UrlForJwt(parts[1]);
        return true;
      } catch {
        return false;
      }
    },
    analyze: (s) => {
      const parts = s.split('.');
      const header = JSON.parse(decodeBase64UrlForJwt(parts[0]));
      const payload = JSON.parse(decodeBase64UrlForJwt(parts[1]));
      
      const analysis = {
        'Header': `<pre>${JSON.stringify(header, null, 2)}</pre>`,
        'Payload': `<pre>${JSON.stringify(payload, null, 2)}</pre>`,
        'Algorithm': `<code>${header.alg}</code>`,
        'Token Type': `<code>${header.typ || 'JWT'}</code>`
      };
      
      if (payload.exp) {
        const expiry = new Date(payload.exp * 1000);
        const isExpired = expiry < new Date();
        analysis['Expiry'] = `<code>${expiry.toISOString()} ${isExpired ? '❌ EXPIRED' : '✅ Valid'}</code>`;
      }
      
      if (payload.iat) {
        analysis['Issued At'] = `<code>${new Date(payload.iat * 1000).toISOString()}</code>`;
      }
      
      return analysis;
    }
  },

  // Multi-layer Base64 with recursive decoding
  {
    name: 'Base64 (Multi-layer)',
    test: (s) => /^[A-Za-z0-9+/=]+$/.test(s) && s.length % 4 === 0 && s.length > 4,
    analyze: (s) => {
      const layers = [];
      let current = s;
      let depth = 0;
      
      while (depth < 5) { // Max 5 layers deep
        try {
          const decoded = decodeBase64(current);
          layers.push({
            layer: depth + 1,
            content: decoded,
            length: decoded.length
          });
          
          // Check if the decoded content is also valid Base64
          if (/^[A-Za-z0-9+/=]+$/.test(decoded) && decoded.length % 4 === 0 && decoded.length > 4) {
            current = decoded;
            depth++;
          } else {
            break;
          }
        } catch {
          break;
        }
      }
      
      const result = {
        'Decoding Layers': `<code>${layers.length}</code>`,
        'Original Length': `<code>${s.length} characters</code>`
      };
      
      layers.forEach((layer, i) => {
        result[`Layer ${layer.layer} Content`] = `<pre>${layer.content.length > 200 ? layer.content.slice(0, 200) + '...' : layer.content}</pre>`;
      });
      
      return result;
    }
  },

  // URL with advanced analysis
  {
    name: 'URL (Advanced)',
    test: (s) => {
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    },
    analyze: (s) => {
      const url = new URL(s);
      const params = {};
      url.searchParams.forEach((val, key) => params[key] = val);
      
      // Security analysis
      const isHTTPS = url.protocol === 'https:';
      const hasAuth = url.username || url.password;
      const suspiciousParams = ['token', 'password', 'secret', 'key'].filter(p => 
        Object.keys(params).some(k => k.toLowerCase().includes(p))
      );
      
      return {
        'Full URL': `<code class="text-break">${s}</code>`,
        'Protocol': `<code>${url.protocol} ${isHTTPS ? '🔒' : '⚠️'}</code>`,
        'Domain': `<code>${url.hostname}</code>`,
        'Port': `<code>${url.port || 'default'}</code>`,
        'Path': `<code>${url.pathname}</code>`,
        'Parameters': Object.keys(params).length > 0 ? `<pre>${JSON.stringify(params, null, 2)}</pre>` : 'None',
        'Has Auth': `<code>${hasAuth ? '⚠️ Yes' : 'No'}</code>`,
        'Suspicious Params': suspiciousParams.length > 0 ? `<code>⚠️ ${suspiciousParams.join(', ')}</code>` : 'None',
        'Fragment': `<code>${url.hash || 'None'}</code>`
      };
    }
  },

  // JSON with schema analysis
  {
    name: 'JSON (Advanced)',
    test: (s) => {
      s = s.trim();
      if (!((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']')))) return false;
      try {
        JSON.parse(s);
        return true;
      } catch {
        return false;
      }
    },
    analyze: (s) => {
      const obj = JSON.parse(s);
      const analysis = analyzeJSONStructure(obj);
      
      return {
        'Pretty JSON': `<pre>${JSON.stringify(obj, null, 2)}</pre>`,
        'Type': `<code>${Array.isArray(obj) ? 'Array' : typeof obj}</code>`,
        'Size': `<code>${JSON.stringify(obj).length} characters</code>`,
        'Depth': `<code>${analysis.maxDepth} levels</code>`,
        'Total Keys': `<code>${analysis.totalKeys}</code>`,
        'Data Types': `<pre>${Object.entries(analysis.types).map(([type, count]) => `${type}: ${count}`).join('\n')}</pre>`,
        'Schema Hint': `<code>${analysis.schemaHint}</code>`
      };
    }
  },

  // Plain text with advanced analysis
  {
    name: 'Text (Forensic Analysis)',
    test: () => true,
    analyze: (s) => {
      const entropy = computeStringEntropy(s);
      const patterns = detectTextPatterns(s);
      const languages = detectLanguages(s);
      const analysis = performTextForensics(s);
      
      return {
        'Character Count': `<code>${s.length}</code>`,
        'Entropy': `<code>${entropy.toFixed(3)} bits (${getEntropyDescription(entropy)})</code>`,
        'Detected Language': `<code>${languages[0] || 'Unknown'}</code>`,
        'Patterns Found': `<code>${patterns.join(', ') || 'None'}</code>`,
        'Readability Score': `<code>${analysis.readability.toFixed(1)}/100</code>`,
        'Unique Characters': `<code>${analysis.uniqueChars}</code>`,
        'Character Distribution': generateCharacterDistribution(s)
      };
    }
  }
];

// Helper functions for advanced analysis
function computeHexEntropy(hex) {
  const freq = {};
  for (const char of hex) freq[char] = (freq[char] || 0) + 1;
  return Object.values(freq).reduce((ent, count) => {
    const p = count / hex.length;
    return ent - p * Math.log2(p);
  }, 0);
}

function luhnCheck(num) {
  let sum = 0;
  let isEven = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function parseCronToHuman(cron) {
  const parts = cron.split(/\s+/);
  if (parts[0] === '0' && parts[1] === '0') return 'Daily at midnight';
  if (parts[0] === '0' && parts[1] !== '*') return `Daily at ${parts[1]}:00`;
  if (parts[0] !== '*' && parts[1] !== '*') return `Daily at ${parts[1]}:${parts[0].padStart(2, '0')}`;
  return 'Complex schedule (see breakdown above)';
}

function analyzeJSONStructure(obj, depth = 0) {
  const result = { maxDepth: depth, totalKeys: 0, types: {} };
  
  if (Array.isArray(obj)) {
    result.types['array'] = (result.types['array'] || 0) + 1;
    obj.forEach(item => {
      const sub = analyzeJSONStructure(item, depth + 1);
      result.maxDepth = Math.max(result.maxDepth, sub.maxDepth);
      result.totalKeys += sub.totalKeys;
      Object.entries(sub.types).forEach(([type, count]) => {
        result.types[type] = (result.types[type] || 0) + count;
      });
    });
  } else if (typeof obj === 'object' && obj !== null) {
    result.types['object'] = (result.types['object'] || 0) + 1;
    result.totalKeys += Object.keys(obj).length;
    Object.values(obj).forEach(value => {
      const sub = analyzeJSONStructure(value, depth + 1);
      result.maxDepth = Math.max(result.maxDepth, sub.maxDepth);
      result.totalKeys += sub.totalKeys;
      Object.entries(sub.types).forEach(([type, count]) => {
        result.types[type] = (result.types[type] || 0) + count;
      });
    });
  } else {
    const type = typeof obj;
    result.types[type] = (result.types[type] || 0) + 1;
  }
  
  // Schema hint
  if (depth === 0) {
    const keys = Object.keys(obj);
    if (keys.includes('id') && keys.includes('name')) result.schemaHint = 'Entity/Resource';
    else if (keys.includes('token') || keys.includes('access_token')) result.schemaHint = 'Authentication';
    else if (keys.includes('error') || keys.includes('message')) result.schemaHint = 'Error Response';
    else result.schemaHint = 'Generic Object';
  }
  
  return result;
}

function computeStringEntropy(str) {
  const freq = {};
  for (const char of str) freq[char] = (freq[char] || 0) + 1;
  return Object.values(freq).reduce((ent, count) => {
    const p = count / str.length;
    return ent - p * Math.log2(p);
  }, 0);
}

function getEntropyDescription(entropy) {
  if (entropy < 2) return 'Very Low - Repetitive';
  if (entropy < 3) return 'Low - Some patterns';
  if (entropy < 4) return 'Medium - Mixed content';
  if (entropy < 5) return 'High - Random-like';
  return 'Very High - Highly random';
}

function detectTextPatterns(text) {
  const patterns = [];
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) patterns.push('Dates');
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text)) patterns.push('IP Addresses');
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) patterns.push('Email');
  if (/\b\d{3}-?\d{2}-?\d{4}\b/.test(text)) patterns.push('SSN-like');
  if (/\bhttps?:\/\//.test(text)) patterns.push('URLs');
  if (/\b[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\b/i.test(text)) patterns.push('UUIDs');
  return patterns;
}

function detectLanguages(text) {
  const samples = text.toLowerCase().split(/\s+/).slice(0, 100); // First 100 words
  const languageScores = {
    English: 0, Spanish: 0, French: 0, German: 0
  };
  
  const commonWords = {
    English: ['the', 'and', 'of', 'to', 'a', 'in', 'is', 'it', 'you', 'that'],
    Spanish: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se'],
    French: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'],
    German: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich']
  };
  
  samples.forEach(word => {
    Object.entries(commonWords).forEach(([lang, words]) => {
      if (words.includes(word)) languageScores[lang]++;
    });
  });
  
  return Object.entries(languageScores)
    .sort(([,a], [,b]) => b - a)
    .map(([lang]) => lang);
}

function performTextForensics(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgSyllablesPerWord = words.reduce((sum, word) => sum + countSyllables(word), 0) / words.length;
  
  // Flesch Reading Ease Score approximation
  const readability = Math.max(0, Math.min(100, 
    206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
  ));
  
  const uniqueChars = new Set(text).size;
  
  return { readability, uniqueChars };
}

function countSyllables(word) {
  return Math.max(1, (word.toLowerCase().match(/[aeiouy]+/g) || []).length);
}

function generateCharacterDistribution(text) {
  const categories = {
    'Letters': 0, 'Digits': 0, 'Spaces': 0, 'Punctuation': 0, 'Other': 0
  };
  
  for (const char of text) {
    if (/[a-zA-Z]/.test(char)) categories.Letters++;
    else if (/[0-9]/.test(char)) categories.Digits++;
    else if (/\s/.test(char)) categories.Spaces++;
    else if (/[.,;:!?'"()[\]{}]/.test(char)) categories.Punctuation++;
    else categories.Other++;
  }
  
  const total = text.length;
  return Object.entries(categories)
    .map(([cat, count]) => `${cat}: ${count} (${((count/total)*100).toFixed(1)}%)`)
    .join('\n');
}

// Enhanced display function with visualizations
function displayStringAnalysis(results) {
  const container = document.getElementById('stringAnalyzerResult');
  if (!results || results.length === 0) {
    container.innerHTML = '<div class="alert alert-warning">Could not analyze the string.</div>';
    return;
  }
  
  // Clean up previous charts
  if (stringDnaChartInstance) stringDnaChartInstance.destroy();
  if (stringEntropyChartInstance) stringEntropyChartInstance.destroy();
  
  const primary = results[0];
  let html = `
    <div class="alert alert-success">
      <strong>🔮 Magic Analysis Complete!</strong><br>
      <span class="badge badge-primary">${primary.name}</span>
      ${results.length > 1 ? results.slice(1).map(r => `<span class="badge badge-secondary ml-1">${r.name}</span>`).join('') : ''}
    </div>
  `;
  
  // Main analysis
  html += '<div class="card mb-3"><div class="card-body">';
  html += `<h5 class="card-title">${primary.name} Analysis</h5>`;
  html += '<div class="row">';
  
  let colCount = 0;
  for (const [key, value] of Object.entries(primary.analysis)) {
    if (colCount % 2 === 0 && colCount > 0) html += '</div><div class="row">';
    html += `<div class="col-md-6 mb-2"><strong>${key}:</strong><br>${value}</div>`;
    colCount++;
  }
  html += '</div></div></div>';
  
  // Add visualizations for text analysis
  if (primary.name === 'Text (Forensic Analysis)') {
    html += `
      <div class="row mb-3">
        <div class="col-md-6">
          <h6>Character Distribution</h6>
          <canvas id="stringDnaChart" height="250"></canvas>
        </div>
        <div class="col-md-6">
          <h6>Entropy Visualization</h6>
          <canvas id="entropyChart" height="250"></canvas>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // Render charts if text analysis
  if (primary.name === 'Text (Forensic Analysis)') {
    renderStringVisualizations(document.getElementById('stringAnalyzerInput').value);
  }
}

function renderStringVisualizations(text) {
  // Character DNA Chart
  const categories = { Letters: 0, Digits: 0, Spaces: 0, Punctuation: 0, Other: 0 };
  for (const char of text) {
    if (/[a-zA-Z]/.test(char)) categories.Letters++;
    else if (/[0-9]/.test(char)) categories.Digits++;
    else if (/\s/.test(char)) categories.Spaces++;
    else if (/[.,;:!?'"()[\]{}]/.test(char)) categories.Punctuation++;
    else categories.Other++;
  }
  
  const dnaCtx = document.getElementById('stringDnaChart').getContext('2d');
  stringDnaChartInstance = new Chart(dnaCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
  
  // Entropy over sliding window
  const windowSize = Math.min(50, Math.floor(text.length / 10));
  const entropyData = [];
  for (let i = 0; i <= text.length - windowSize; i += Math.max(1, Math.floor(windowSize / 2))) {
    const window = text.slice(i, i + windowSize);
    entropyData.push(computeStringEntropy(window));
  }
  
  const entropyCtx = document.getElementById('entropyChart').getContext('2d');
  stringEntropyChartInstance = new Chart(entropyCtx, {
    type: 'line',
    data: {
      labels: entropyData.map((_, i) => i),
      datasets: [{
        label: 'Entropy',
        data: entropyData,
        borderColor: '#007bff',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 6 },
        x: { title: { display: true, text: 'Text Position' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

document.getElementById('analyzeStringBtn')?.addEventListener('click', () => {
  const input = document.getElementById('stringAnalyzerInput').value.trim();
  if (!input) {
    document.getElementById('stringAnalyzerResult').innerHTML = '';
    return;
  }
  
  const possibleTypes = [];
  for (const analyzer of advancedStringAnalyzers) {
    if (analyzer.test(input)) {
      possibleTypes.push({
        name: analyzer.name,
        analysis: analyzer.analyze(input)
      });
    }
  }
  
  displayStringAnalysis(possibleTypes);
}); 