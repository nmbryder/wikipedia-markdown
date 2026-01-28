// Wikipedia to Markdown Popup Script

let currentMarkdown = '';
let currentTitle = '';

// DOM elements
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');
const statusElement = document.getElementById('status');
const includeTablesCheckbox = document.getElementById('includeTables');
const preserveLinksCheckbox = document.getElementById('preserveLinks');
const includeImagesCheckbox = document.getElementById('includeImages');
const includeMathCheckbox = document.getElementById('includeMath');
const includeFrontmatterCheckbox = document.getElementById('includeFrontmatter');

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;

  // Auto-hide after 3 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status';
    }, 3000);
  }
}

/**
 * Get user options from checkboxes
 */
function getOptions() {
  return {
    includeTables: includeTablesCheckbox.checked,
    preserveLinks: preserveLinksCheckbox.checked,
    includeImages: includeImagesCheckbox.checked,
    includeMath: includeMathCheckbox.checked,
    includeFrontmatter: includeFrontmatterCheckbox.checked
  };
}

/**
 * Convert Wikipedia article to markdown
 */
async function convertArticle() {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if it's a Wikipedia page
    if (!tab.url.includes('wikipedia.org/wiki/')) {
      showStatus('Please navigate to a Wikipedia article', 'error');
      copyButton.disabled = true;
      downloadButton.disabled = true;
      return;
    }

    showStatus('Converting article...', 'info');

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'convert',
      options: getOptions()
    });

    if (response.success) {
      currentMarkdown = response.markdown;
      currentTitle = response.title;
      showStatus('Conversion successful!', 'success');
      copyButton.disabled = false;
      downloadButton.disabled = false;
    } else {
      showStatus(response.error, 'error');
      copyButton.disabled = true;
      downloadButton.disabled = true;
    }
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    copyButton.disabled = true;
    downloadButton.disabled = true;
  }
}

/**
 * Copy markdown to clipboard
 */
async function copyToClipboard() {
  if (!currentMarkdown) {
    showStatus('No content to copy', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(currentMarkdown);
    showStatus('Copied to clipboard!', 'success');
  } catch (error) {
    showStatus('Failed to copy: ' + error.message, 'error');
  }
}

/**
 * Download markdown as file
 */
function downloadMarkdown() {
  if (!currentMarkdown) {
    showStatus('No content to download', 'error');
    return;
  }

  try {
    // Create blob and download link
    const blob = new Blob([currentMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // Generate filename from title
    const filename = currentTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '.md';

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('Download started!', 'success');
  } catch (error) {
    showStatus('Failed to download: ' + error.message, 'error');
  }
}

/**
 * Initialize popup
 */
async function init() {
  // Initially disable buttons until conversion is done
  copyButton.disabled = true;
  downloadButton.disabled = true;

  // Add event listeners
  copyButton.addEventListener('click', copyToClipboard);
  downloadButton.addEventListener('click', downloadMarkdown);

  // Reconvert when options change
  includeTablesCheckbox.addEventListener('change', convertArticle);
  preserveLinksCheckbox.addEventListener('change', convertArticle);
  includeImagesCheckbox.addEventListener('change', convertArticle);
  includeMathCheckbox.addEventListener('change', convertArticle);
  includeFrontmatterCheckbox.addEventListener('change', convertArticle);

  // Convert article on popup open
  await convertArticle();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
