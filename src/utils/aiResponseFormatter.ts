export const beautifyAIResponse = (response: string): string => {
  if (!response) return '';

  // Split response into lines and clean them
  const lines = response.split(/\n|\r/).filter(line => line.trim());
  
  // Check if response contains bullet points or numbered lists
  const isBulleted = lines.every(line => line.trim().match(/^[-*•]/));
  const isNumbered = lines.every(line => line.trim().match(/^\d+\./));
  
  // Check if response contains markdown-style headers
  const hasHeaders = lines.some(line => line.trim().match(/^#{1,6}\s/));
  
  // Check if response contains code blocks
  const hasCodeBlocks = response.includes('```');
  
  // Check if response contains tables
  const hasTables = response.includes('|') && response.includes('\n|');
  
  // Helper function to convert markdown to HTML
  const convertMarkdown = (text: string): string => {
    return text
      // Convert headers
      .replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">$1</h1>')
      // Convert bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
      // Convert italic text
      .replace(/\*(.+?)\*/g, '<em class="italic text-gray-700 dark:text-gray-300">$1</em>')
      // Convert inline code
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  };
  
  if (hasTables) {
    // Handle markdown tables with a more reliable approach
    const lines = response.split('\n');
    let result = '';
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Check if this line starts a table (contains | and has content)
      if (line.startsWith('|') && line.endsWith('|') && line.length > 2) {
        const tableLines = [];
        let j = i;
        
        // Collect all table lines
        while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
          tableLines.push(lines[j].trim());
          j++;
        }
        
        // Check if we have at least header and separator
        if (tableLines.length >= 2) {
          const headerRow = tableLines[0];
          const separatorRow = tableLines[1];
          const dataRows = tableLines.slice(2);
          
          // Parse header
          const headers = headerRow.split('|').slice(1, -1).map(h => h.trim());
          
          // Parse data rows
          const rows = dataRows.map(row => {
            const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
            return cells;
          });
          
          result += `<div class="overflow-x-auto my-4">
            <table class="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  ${headers.map(header => 
                    `<th class="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">${convertMarkdown(header)}</th>`
                  ).join('')}
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-900">
                ${rows.map((row, rowIndex) => 
                  `<tr class="${rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}">
                    ${row.map(cell => 
                      `<td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">${convertMarkdown(cell)}</td>`
                    ).join('')}
                  </tr>`
                ).join('')}
              </tbody>
            </table>
          </div>`;
          
          i = j; // Skip to after the table
        } else {
          result += convertMarkdown(line) + '\n';
          i++;
        }
      } else {
        result += convertMarkdown(line) + '\n';
        i++;
      }
    }
    
    return result.trim();
  }
  
  if (hasCodeBlocks) {
    // Handle code blocks with syntax highlighting
    const parts = response.split(/(```[\s\S]*?```)/);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3);
        const language = code.split('\n')[0].trim();
        const codeContent = code.split('\n').slice(1).join('\n');
        return `<div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          ${language ? `<div class="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono">${language}</div>` : ''}
          <pre class="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto"><code>${codeContent}</code></pre>
        </div>`;
      }
      return convertMarkdown(part);
    }).join('');
  }
  
  if (hasHeaders) {
    // Handle markdown-style headers with full markdown conversion
    return `<div class="space-y-3">
      ${lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.match(/^#{1,6}\s/)) {
          const level = trimmed.match(/^(#{1,6})\s/)?.[1]?.length || 1;
          const text = trimmed.replace(/^#{1,6}\s/, '');
          const tagClass = level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : level === 3 ? 'text-base' : 'text-sm';
          return `<h${Math.min(level + 2, 6)} class="font-bold text-gray-900 dark:text-white ${tagClass} mb-2">${convertMarkdown(text)}</h${Math.min(level + 2, 6)}>`;
        }
        return `<p class="text-gray-700 dark:text-gray-300">${convertMarkdown(trimmed)}</p>`;
      }).join('')}
    </div>`;
  }
  
  if (isBulleted) {
    // Handle bullet points with markdown conversion
    return `<ul class="list-disc pl-5 space-y-1">
      ${lines.map((line, index) => 
        `<li class="text-gray-700 dark:text-gray-300">${convertMarkdown(line.replace(/^[-*•]\s*/, ''))}</li>`
      ).join('')}
    </ul>`;
  }
  
  if (isNumbered) {
    // Handle numbered lists with markdown conversion
    return `<ol class="list-decimal pl-5 space-y-1">
      ${lines.map((line, index) => 
        `<li class="text-gray-700 dark:text-gray-300">${convertMarkdown(line.replace(/^\d+\.\s*/, ''))}</li>`
      ).join('')}
    </ol>`;
  }
  
  // Check if response contains structured sections with **Section:** format
  const hasStructuredSections = lines.some(line => line.trim().match(/^\*\*[^*]+\*\*:/));
  if (hasStructuredSections) {
    return `<div class="space-y-3">
      ${lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.match(/^\*\*[^*]+\*\*:/)) {
          // Extract section name and content
          const sectionMatch = trimmed.match(/^\*\*([^*]+)\*\*:\s*(.*)/);
          if (sectionMatch) {
            const sectionName = sectionMatch[1];
            const sectionContent = sectionMatch[2];
            return `<div class="mb-3">
              <h4 class="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">${sectionName}:</h4>
              <p class="text-gray-700 dark:text-gray-300 text-sm">${convertMarkdown(sectionContent)}</p>
            </div>`;
          }
        }
        return `<p class="text-gray-700 dark:text-gray-300 text-sm">${convertMarkdown(trimmed)}</p>`;
      }).join('')}
    </div>`;
  }
  
  // Check if response contains key-value pairs or structured data
  const hasKeyValue = lines.some(line => line.includes(':') && !line.startsWith(' '));
  if (hasKeyValue) {
    return `<div class="space-y-2">
      ${lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.includes(':') && !trimmed.startsWith(' ')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
                      return `<div class="flex">
              <span class="font-semibold text-gray-900 dark:text-white min-w-[120px]">${convertMarkdown(key.trim())}:</span>
              <span class="text-gray-700 dark:text-gray-300">${convertMarkdown(value)}</span>
            </div>`;
        }
        return `<p class="text-gray-700 dark:text-gray-300">${convertMarkdown(trimmed)}</p>`;
      }).join('')}
    </div>`;
  }
  
  // Default: simple paragraph formatting with markdown conversion
  return `<div class="space-y-2">
    ${lines.map((line, index) => 
      `<p class="text-gray-700 dark:text-gray-300 leading-relaxed">${convertMarkdown(line.trim())}</p>`
    ).join('')}
  </div>`;
};

// Helper function to detect response type and apply appropriate styling
export const getResponseContainerClass = (response: string): string => {
  if (!response) return '';
  
  const lines = response.split(/\n|\r/).filter(line => line.trim());
  const isBulleted = lines.every(line => line.trim().match(/^[-*•]/));
  const isNumbered = lines.every(line => line.trim().match(/^\d+\./));
  const hasHeaders = lines.some(line => line.trim().match(/^#{1,6}\s/));
  const hasCodeBlocks = response.includes('```');
  const hasStructuredSections = lines.some(line => line.trim().match(/^\*\*[^*]+\*\*:/));
  const hasTables = response.includes('|') && response.includes('\n|');
  
  if (hasCodeBlocks) {
    return 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4';
  }
  
  if (hasTables) {
    return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4';
  }
  
  if (hasStructuredSections) {
    return 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4';
  }
  
  if (hasHeaders || isBulleted || isNumbered) {
    return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4';
  }
  
  return 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4';
}; 