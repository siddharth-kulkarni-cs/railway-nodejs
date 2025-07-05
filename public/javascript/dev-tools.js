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