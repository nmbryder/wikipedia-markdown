# Wikipedia to Markdown Chrome Extension

A Chrome browser extension (Manifest V3) that converts Wikipedia articles to clean Markdown format.

## Features

- Convert any Wikipedia article to well-formatted Markdown
- Copy converted content to clipboard
- Download as `.md` file
- Configurable options:
  - Include/exclude tables
  - Preserve or remove links
  - Include images as markdown references
  - Include mathematical formulas (LaTeX syntax)
  - Include YAML frontmatter with metadata
- Works on all language versions of Wikipedia
- Handles complex Wikipedia formatting automatically

## Installation

1. Create icon images (required):
   - Create three PNG files: `icon16.png`, `icon48.png`, and `icon128.png`
   - Sizes: 16x16, 48x48, and 128x128 pixels respectively
   - Place them in the extension directory
   - You can use any image editor or online tool to create simple icons

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `wikipedia-to-markdown` directory
   - The extension should now appear in your toolbar

## Usage

1. Navigate to any Wikipedia article (e.g., https://en.wikipedia.org/wiki/Markdown)
2. Click the extension icon in your Chrome toolbar
3. The article will be automatically converted to Markdown
4. Configure options as needed:
   - Include tables (default: on)
   - Preserve links (default: on)
   - Include images as markdown references (default: off)
   - Include mathematical formulas (default: on)
   - Include YAML frontmatter (default: off)
5. Click "Copy to Clipboard" or "Download as .md"

## File Structure

```
/wikipedia-to-markdown
  ├── manifest.json      # Extension configuration
  ├── popup.html         # Popup UI structure
  ├── popup.js           # Popup logic and event handlers
  ├── content.js         # Content extraction and conversion logic
  ├── styles.css         # Popup styling
  ├── icon16.png         # Extension icon (16x16)
  ├── icon48.png         # Extension icon (48x48)
  ├── icon128.png        # Extension icon (128x128)
  └── README.md          # This file
```

## Conversion Rules

### HTML to Markdown Mapping

- `<h2>` → `## heading`
- `<h3>` → `### heading`
- `<h4>` → `#### heading`
- `<p>` → Plain text with blank line after
- `<strong>`, `<b>` → `**bold**`
- `<em>`, `<i>` → `*italic*`
- `<a>` (internal) → `[text](https://en.wikipedia.org/wiki/...)`
- `<a>` (external) → Text only
- `<ul>` → Unordered list with `-` bullets
- `<ol>` → Ordered list with `1.` numbering
- `<blockquote>` → `> quoted text`
- `<table>` → Markdown table format
- `<br>` → Newline
- Math formulas → LaTeX syntax with `$` (inline) or `$$` (display) delimiters

### Mathematical Formulas

Wikipedia's mathematical formulas (rendered with MathML/LaTeX) are extracted and converted to standard LaTeX syntax:
- Inline formulas: `$E = mc^2$`
- Display formulas: `$$\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`

The extension extracts the LaTeX source from Wikipedia's math elements automatically. If your Markdown viewer supports LaTeX math rendering (like GitHub, many note-taking apps, or with plugins), the formulas will display correctly.

### YAML Frontmatter

When enabled, the extension adds YAML frontmatter at the beginning of the markdown file with article metadata:

```yaml
---
title: "Article Title"
source: https://en.wikipedia.org/wiki/Article_Title
date: 2026-01-28
language: en
---
```

This metadata is useful for:
- **Static site generators** (Hugo, Jekyll, Gatsby) - automatically populate page metadata
- **Note-taking apps** (Obsidian, Logseq, Notion) - organize and search by metadata
- **Document management** - track source, date, and language of saved articles

The frontmatter includes:
- `title`: The article title (properly escaped)
- `source`: Full Wikipedia URL
- `date`: Current date in YYYY-MM-DD format
- `language`: Language code (en, de, fr, es, etc.)

### Cleaned Elements

The following elements are automatically removed:
- Edit section links
- Citation reference brackets
- Navigation boxes
- Article message boxes
- Table of contents
- Infoboxes
- Metadata and hidden elements

### Table Handling

- Simple tables are converted to pipe-delimited markdown format
- Complex tables (with nested tables, rowspan, or colspan) are replaced with placeholder comments
- Pipe characters in cell content are automatically escaped

## Edge Cases Handled

- Non-article pages (Special:, Talk:, etc.) show appropriate error messages
- Empty or missing content shows error
- Works efficiently with very long articles
- Compatible with all Wikipedia language subdomains
- Complex infoboxes are automatically excluded

## Technical Details

- Built with Manifest V3
- Uses modern JavaScript (ES6+)
- No external dependencies
- Content Security Policy compliant
- Efficient DOM manipulation and processing

## Troubleshooting

**Extension doesn't appear after loading:**
- Make sure you have created the three icon PNG files
- Check that all files are in the correct directory
- Check the Chrome extensions page for error messages

**"Not a Wikipedia article" error:**
- Ensure you're on an actual article page, not a Special:, Talk:, or other non-article page

**Conversion fails:**
- Try refreshing the Wikipedia page
- Check if the page structure is unusual
- Check the browser console for errors

**Credits:**
- ClaudeCode for assisting me in my goal to never learn JS and writing documentation