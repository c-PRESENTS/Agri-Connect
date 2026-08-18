import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

const mdPath = 'C:\\Users\\harsh\\Downloads\\AgriConnect_Codebase_Documentation.md';
const pdfPath = 'C:\\Users\\harsh\\Downloads\\AgriConnect_Codebase_Documentation.pdf';

if (!fs.existsSync(mdPath)) {
  console.error(`Markdown file not found at ${mdPath}`);
  process.exit(1);
}

const mdContent = fs.readFileSync(mdPath, 'utf8');

function mdToHtml(md) {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```([a-z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block language-${lang}"><code>${code}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headings
  html = html.replace(/^# (.*$)/gim, '<h1 class="doc-title">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="section-title">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="subsection-title">$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="topic-title">$1</h4>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr class="divider" />');

  // Lists & Paragraphs
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;

  for (let line of lines) {
    if (line.match(/^\s*[\-\*]\s+(.*)/)) {
      const content = line.replace(/^\s*[\-\*]\s+(.*)/, '$1');
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`  <li>${content}</li>`);
    } else if (line.match(/^\s*\d+\.\s+(.*)/)) {
      const content = line.replace(/^\s*\d+\.\s+(.*)/, '$1');
      if (!inList) {
        processedLines.push('<ol>');
        inList = true;
      }
      processedLines.push(`  <li>${content}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (line.trim() && !line.startsWith('<h') && !line.startsWith('<pre') && !line.startsWith('<hr')) {
        processedLines.push(`<p>${line}</p>`);
      } else {
        processedLines.push(line);
      }
    }
  }
  if (inList) processedLines.push('</ul>');

  return processedLines.join('\n');
}

const bodyHtml = mdToHtml(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AgriConnect Codebase Documentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.6;
      font-size: 12.5px;
      padding: 0;
      margin: 0;
    }

    .doc-header-banner {
      background: linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%);
      color: #ffffff;
      padding: 28px 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .doc-header-banner h1.doc-title {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 8px 0;
      border: none;
      padding: 0;
      letter-spacing: -0.4px;
    }

    .doc-header-banner p {
      color: #d1fae5;
      margin: 4px 0;
      font-size: 12.5px;
      font-weight: 500;
    }

    h1.doc-title {
      font-size: 22px;
      font-weight: 800;
      color: #064e3b;
      margin-top: 24px;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
      border-bottom: 2px solid #a7f3d0;
      padding-bottom: 6px;
    }

    h2.section-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f766e;
      margin-top: 22px;
      margin-bottom: 10px;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
      page-break-after: avoid;
    }

    h3.subsection-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    h4.topic-title {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-top: 12px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
      color: #334155;
      font-size: 12.5px;
    }

    strong {
      color: #0f172a;
      font-weight: 700;
    }

    pre.code-block {
      background-color: #0f172a;
      color: #f8fafc;
      padding: 14px 18px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 11px;
      line-height: 1.5;
      overflow-x: auto;
      margin: 14px 0;
      border: 1px solid #1e293b;
      page-break-inside: avoid;
    }

    code.inline-code {
      background-color: #f1f5f9;
      color: #0f766e;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 11px;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-weight: 600;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 20px;
    }

    li {
      margin-bottom: 5px;
      color: #334155;
    }

    hr.divider {
      border: none;
      height: 1px;
      background: linear-gradient(to right, #cbd5e1, #e2e8f0, transparent);
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="doc-header-banner">
    <h1 class="doc-title">AgriConnect Platform - Technical Documentation</h1>
    <p><strong>System Version:</strong> 1.0.0 (rest-express) | <strong>Generated:</strong> August 18, 2026</p>
    <p><strong>Target Domain:</strong> Agricultural Marketplace, Direct Farm-to-Table E-Commerce, Logistics & Farm Tech Ecosystem</p>
  </div>
  ${bodyHtml}
</body>
</html>`;

async function generatePdf() {
  console.log('Launching Chromium via Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Setting HTML content...');
  await page.setContent(fullHtml, { waitUntil: 'networkidle' });

  console.log('Rendering PDF document...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '16mm',
      right: '16mm',
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 8.5px; color: #64748b; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; align-items: center;">
        <span>AgriConnect Codebase Architecture & Technical Documentation</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
  });

  await browser.close();
  console.log(`PDF successfully saved to: ${pdfPath}`);
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
