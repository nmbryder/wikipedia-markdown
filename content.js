// Wikipedia to Markdown Content Script

/**
 * Check if current page is a valid Wikipedia article
 */
function isValidArticlePage() {
  const path = window.location.pathname;

  // Exclude special pages, talk pages, etc.
  const excludedPrefixes = [
    '/wiki/Special:',
    '/wiki/Talk:',
    '/wiki/Wikipedia:',
    '/wiki/Help:',
    '/wiki/Portal:',
    '/wiki/Category:',
    '/wiki/File:',
    '/wiki/Template:'
  ];

  return !excludedPrefixes.some(prefix => path.startsWith(prefix));
}

/**
 * Get article title from page
 */
function getArticleTitle() {
  const titleElement = document.querySelector('#firstHeading');
  return titleElement ? titleElement.textContent.trim() : 'Wikipedia Article';
}

/**
 * Remove unwanted elements from content
 */
function cleanContent(contentElement) {
  const clone = contentElement.cloneNode(true);

  // Elements to remove
  const selectorsToRemove = [
    '.mw-editsection',           // Edit section links
    '.reference',                 // Citation reference brackets
    '.navbox',                    // Navigation boxes
    '.ambox',                     // Article message boxes
    '.sistersitebox',             // Sister site boxes
    '#toc',                       // Table of contents
    '.toc',                       // Alternative TOC
    '.infobox',                   // Infoboxes (can be complex)
    '.metadata',                  // Metadata
    '.catlinks',                  // Category links
    '.printfooter',               // Print footer
    '.mw-jump-link',              // Jump links
    'style',                      // Style tags
    'script',                     // Script tags
    '.noprint',                   // No print elements
    '.hatnote',                   // Hat notes
    '[style*="display: none"]',   // Hidden elements
    '[style*="display:none"]',
    '.mw-empty-elt'               // Empty elements
  ];

  selectorsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  return clone;
}

/**
 * Escape markdown special characters
 */
function escapeMarkdown(text) {
  // Escape special markdown characters but preserve intentional formatting
  return text.replace(/([\\`*_{}[\]()#+\-.!|])/g, '\\$1');
}

/**
 * Convert HTML table to markdown
 */
function tableToMarkdown(table) {
  const rows = Array.from(table.querySelectorAll('tr'));

  if (rows.length === 0) {
    return '<!-- Complex table omitted -->\n\n';
  }

  // Check for complex tables (nested tables, rowspan, colspan)
  if (table.querySelector('table') ||
      table.querySelector('[rowspan]') ||
      table.querySelector('[colspan]')) {
    return '<!-- Complex table omitted (contains nested tables or merged cells) -->\n\n';
  }

  const processCell = (cell) => {
    const text = cell.textContent.trim().replace(/\n/g, ' ');
    // Escape pipe characters in cell content
    return text.replace(/\|/g, '\\|');
  };

  const markdownRows = [];

  rows.forEach((row, index) => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    if (cells.length === 0) return;

    const cellTexts = cells.map(processCell);
    markdownRows.push('| ' + cellTexts.join(' | ') + ' |');

    // Add separator after first row (header)
    if (index === 0) {
      const separator = '|' + cells.map(() => ' --- ').join('|') + '|';
      markdownRows.push(separator);
    }
  });

  return markdownRows.join('\n') + '\n\n';
}

/**
 * Extract LaTeX formula from Wikipedia math element
 */
function extractMathFormula(element) {
  // Wikipedia stores math in several ways:
  // 1. MathML with annotation tag containing LaTeX
  // 2. img tag with alt attribute containing LaTeX
  // 3. span with data-formula attribute

  // Try to find MathML annotation with LaTeX source
  const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
  if (annotation) {
    return annotation.textContent.trim();
  }

  // Try img alt attribute
  const img = element.querySelector('img.mwe-math-fallback-image-inline, img.mwe-math-fallback-image-display');
  if (img && img.alt) {
    return img.alt.trim();
  }

  // Fallback to text content if nothing else works
  return element.textContent.trim();
}

/**
 * Process text node and inline elements
 */
function processInlineElements(element, options) {
  let markdown = '';

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      markdown += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();

      // Check if this is a math element (before the switch)
      if (node.classList.contains('mwe-math-element')) {
        if (options.includeMath) {
          const formula = extractMathFormula(node);
          // Use inline math delimiters
          markdown += `$${formula}$`;
        } else {
          // If math is disabled, just include the text representation
          markdown += node.textContent;
        }
        continue;
      }

      switch (tag) {
        case 'strong':
        case 'b':
          markdown += '**' + processInlineElements(node, options) + '**';
          break;
        case 'em':
        case 'i':
          markdown += '*' + processInlineElements(node, options) + '*';
          break;
        case 'a':
          if (options.preserveLinks) {
            const text = node.textContent.trim();
            const href = node.getAttribute('href');

            if (href && href.startsWith('/wiki/')) {
              // Internal Wikipedia link
              const fullUrl = 'https://en.wikipedia.org' + href;
              markdown += `[${text}](${fullUrl})`;
            } else if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
              // External link - keep text only per requirements
              markdown += text;
            } else if (href && href.startsWith('#')) {
              // Anchor link - just keep text
              markdown += text;
            } else {
              markdown += text;
            }
          } else {
            markdown += node.textContent;
          }
          break;
        case 'code':
          markdown += '`' + node.textContent + '`';
          break;
        case 'br':
          markdown += '\n';
          break;
        case 'sup':
        case 'sub':
          // Keep superscript/subscript text but without formatting
          markdown += node.textContent;
          break;
        default:
          markdown += processInlineElements(node, options);
      }
    }
  }

  return markdown;
}

/**
 * Convert HTML element to markdown recursively
 */
function htmlToMarkdown(element, options, depth = 0) {
  let markdown = '';

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        markdown += text + ' ';
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();

      // Check if this is a block-level math element (displayed equation)
      if (node.classList.contains('mwe-math-element')) {
        if (options.includeMath) {
          const formula = extractMathFormula(node);
          // Check if it's a display math (usually in a <dl> or centered)
          const isDisplayMath = node.closest('dl.mw-math-display') ||
                                node.classList.contains('mwe-math-mathml-display');
          if (isDisplayMath) {
            // Use display math delimiters
            markdown += `$$${formula}$$\n\n`;
          } else {
            // Inline math
            markdown += `$${formula}$`;
          }
        } else {
          // If math is disabled, just include the text representation
          const text = node.textContent.trim();
          if (text) {
            markdown += text + ' ';
          }
        }
        continue;
      }

      switch (tag) {
        case 'h1':
          markdown += '# ' + processInlineElements(node, options).trim() + '\n\n';
          break;
        case 'h2':
          markdown += '## ' + processInlineElements(node, options).trim() + '\n\n';
          break;
        case 'h3':
          markdown += '### ' + processInlineElements(node, options).trim() + '\n\n';
          break;
        case 'h4':
          markdown += '#### ' + processInlineElements(node, options).trim() + '\n\n';
          break;
        case 'h5':
          markdown += '##### ' + processInlineElements(node, options).trim() + '\n\n';
          break;
        case 'h6':
          markdown += '###### ' + processInlineElements(node, options).trim() + '\n\n';
          break;
        case 'p':
          const pText = processInlineElements(node, options).trim();
          if (pText) {
            markdown += pText + '\n\n';
          }
          break;
        case 'blockquote':
          const quoteLines = processInlineElements(node, options).trim().split('\n');
          markdown += quoteLines.map(line => '> ' + line).join('\n') + '\n\n';
          break;
        case 'ul':
          markdown += processListNode(node, options, depth, false);
          break;
        case 'ol':
          markdown += processListNode(node, options, depth, true);
          break;
        case 'table':
          if (options.includeTables) {
            markdown += tableToMarkdown(node);
          }
          break;
        case 'img':
          if (options.includeImages) {
            const alt = node.getAttribute('alt') || 'image';
            const src = node.getAttribute('src');
            if (src) {
              const fullSrc = src.startsWith('//') ? 'https:' + src : src;
              markdown += `![${alt}](${fullSrc})\n\n`;
            }
          }
          break;
        case 'div':
        case 'section':
        case 'span':
          markdown += htmlToMarkdown(node, options, depth);
          break;
        case 'hr':
          markdown += '---\n\n';
          break;
        default:
          // For other elements, just process their children
          if (node.childNodes.length > 0) {
            markdown += htmlToMarkdown(node, options, depth);
          }
      }
    }
  }

  return markdown;
}

/**
 * Process list nodes (ul/ol)
 */
function processListNode(listElement, options, depth, isOrdered) {
  let markdown = '';
  const items = listElement.children;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.tagName.toLowerCase() !== 'li') continue;

    const indent = '  '.repeat(depth);
    const bullet = isOrdered ? `${i + 1}. ` : '- ';

    // Process the text content and inline elements of the list item
    let itemText = '';
    let hasNestedList = false;

    for (const child of item.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        itemText += child.textContent.trim() + ' ';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childTag = child.tagName.toLowerCase();
        if (childTag === 'ul' || childTag === 'ol') {
          hasNestedList = true;
          // Add current item text before nested list
          if (itemText.trim()) {
            markdown += indent + bullet + itemText.trim() + '\n';
            itemText = '';
          }
          // Process nested list
          markdown += processListNode(child, options, depth + 1, childTag === 'ol');
        } else {
          itemText += processInlineElements(child, options) + ' ';
        }
      }
    }

    if (itemText.trim()) {
      markdown += indent + bullet + itemText.trim() + '\n';
    }
  }

  // Add blank line after top-level list
  if (depth === 0) {
    markdown += '\n';
  }

  return markdown;
}

/**
 * Clean up markdown output
 */
function cleanupMarkdown(markdown) {
  return markdown
    // Remove trailing whitespace from lines
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    // Replace more than two consecutive blank lines with just two
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading blank lines
    .replace(/^\n+/, '')
    // Ensure file ends with single newline
    .replace(/\n*$/, '\n');
}

/**
 * Generate YAML frontmatter with article metadata
 */
function generateFrontmatter(title) {
  const url = window.location.href;

  // Extract language code from URL (e.g., "en" from "en.wikipedia.org")
  const langMatch = url.match(/\/\/([a-z]{2,3})\.wikipedia\.org/);
  const language = langMatch ? langMatch[1] : 'en';

  // Get current date in YYYY-MM-DD format
  const date = new Date().toISOString().split('T')[0];

  // Build frontmatter
  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `source: ${url}`,
    `date: ${date}`,
    `language: ${language}`,
    '---',
    ''
  ].join('\n');

  return frontmatter;
}

/**
 * Main conversion function
 */
function convertToMarkdown(options) {
  // Check if valid article page
  if (!isValidArticlePage()) {
    return {
      success: false,
      error: 'Not a Wikipedia article page'
    };
  }

  // Get article title
  const title = getArticleTitle();

  // Get main content
  const contentElement = document.querySelector('#mw-content-text .mw-parser-output');

  if (!contentElement) {
    return {
      success: false,
      error: 'Could not find article content'
    };
  }

  // Clean and convert content
  const cleanedContent = cleanContent(contentElement);
  let markdown = '';

  // Add YAML frontmatter if requested
  if (options.includeFrontmatter) {
    markdown += generateFrontmatter(title);
  }

  // Add title and content
  markdown += `# ${title}\n\n`;
  markdown += htmlToMarkdown(cleanedContent, options);
  markdown = cleanupMarkdown(markdown);

  return {
    success: true,
    markdown: markdown,
    title: title
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'convert') {
    try {
      const result = convertToMarkdown(request.options);
      sendResponse(result);
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
  return true; // Keep message channel open for async response
});
