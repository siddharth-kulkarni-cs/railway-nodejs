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
function tokenizeCurlCommand(cmd) {
  // Split command into tokens, preserving quoted substrings
  const regex = /(?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\S+)/g;
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
  const tokens = tokenizeCurlCommand(cmd);
  let i = tokens[0] === 'curl' ? 1 : 0;
  const optionSpec = {
    '-X': true, '--request': true,
    '-H': true, '--header': true,
    '-d': true, '--data': true, '--data-raw': true,
    '-F': true, '--form': true,
    '-u': true, '--user': true,
    '-I': false, '--head': false,
    '-o': true, '--output': true,
    '-s': false, '--silent': false,
    '-S': false, '--show-error': false,
    '-k': false, '--insecure': false,
    '-L': false, '--location': false,
    '--url': true
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