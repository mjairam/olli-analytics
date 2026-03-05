import { useState, useCallback } from 'react';
import { PageShell } from '../../components/ui';

function cleanHtml(text) {
  if (!text) return '';

  // Decode common HTML entities
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&lsquo;': '\u2018',
    '&rsquo;': '\u2019', '&ldquo;': '\u201C', '&rdquo;': '\u201D',
    '&hellip;': '…', '&bull;': '•', '&middot;': '·', '&copy;': '©',
    '&reg;': '®', '&trade;': '™', '&deg;': '°',
  };

  let cleaned = text;

  // Remove style and script blocks first
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Replace block-level elements with newlines
  cleaned = cleaned.replace(/<\/?(p|div|h[1-6]|li|br|tr|td|th|blockquote|pre|section|article|header|footer)[^>]*>/gi, '\n');

  // Strip remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Decode numeric entities
  cleaned = cleaned.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  cleaned = cleaned.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // Decode named entities
  Object.entries(entities).forEach(([entity, char]) => {
    cleaned = cleaned.split(entity).join(char);
  });

  // Normalize whitespace
  cleaned = cleaned
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter((line, i, arr) => line || (arr[i - 1] !== ''))  // collapse multiple blank lines
    .join('\n')
    .trim();

  return cleaned;
}

export default function CatalogCleanerPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleClean = useCallback(() => {
    setOutput(cleanHtml(input));
    setCopied(false);
  }, [input]);

  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output]);

  const handleClear = () => {
    setInput('');
    setOutput('');
    setCopied(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setInput(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const textareaStyle = {
    width: '100%',
    minHeight: 320,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontFamily: 'DM Mono, monospace',
    fontSize: 13,
    padding: '14px 16px',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.6,
  };

  return (
    <PageShell title="HTML Catalog Cleaner" noDataNeeded>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Paste or upload HTML-laden course descriptions. The cleaner strips tags, decodes entities, and normalizes whitespace.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Input */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Input (HTML)
            </span>
            <label style={{
              fontSize: 12, color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Upload .txt/.html
              <input type="file" accept=".txt,.html,.htm" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>
          <textarea
            style={textareaStyle}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste HTML content here…&#10;&#10;Can include multiple descriptions separated by blank lines."
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleClean} style={{
              background: 'var(--accent-blue)', border: 'none', borderRadius: 6,
              color: '#fff', padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Clean →
            </button>
            <button onClick={handleClear} style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text-muted)', padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Clear
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
              {input.length.toLocaleString()} chars
            </span>
          </div>
        </div>

        {/* Output */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Output (clean text)
            </span>
            {output && (
              <button onClick={handleCopy} style={{
                background: copied ? 'rgba(63,185,80,0.15)' : 'transparent',
                border: `1px solid ${copied ? 'var(--accent-green)' : 'var(--border)'}`,
                borderRadius: 6,
                color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
                padding: '4px 12px',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <textarea
            style={{ ...textareaStyle, color: output ? 'var(--text-primary)' : 'var(--text-muted)' }}
            value={output}
            readOnly
            placeholder="Cleaned output will appear here…"
          />
          {output && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              {output.length.toLocaleString()} chars · {output.split('\n').filter(l => l.trim()).length.toLocaleString()} non-empty lines
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div style={{
        marginTop: 32,
        padding: '16px 20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--text-muted)',
      }}>
        <strong style={{ color: 'var(--text-primary)' }}>Tips:</strong>
        <ul style={{ margin: '8px 0 0', padding: '0 0 0 20px', lineHeight: 1.8 }}>
          <li>Paste multiple descriptions at once — they'll be preserved as separate blocks</li>
          <li>HTML tags, inline styles, and script blocks are all stripped</li>
          <li>Entities like <code>&amp;amp;</code>, <code>&amp;nbsp;</code>, <code>&amp;rsquo;</code> are decoded</li>
          <li>Extra whitespace and blank lines are collapsed</li>
        </ul>
      </div>
    </PageShell>
  );
}
