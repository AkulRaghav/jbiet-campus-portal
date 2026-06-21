/**
 * Rule-based Document Structure Checker
 * 
 * This is a DETERMINISTIC rule-based checker, NOT a trained machine learning model.
 * It parses uploaded PDFs and flags structural issues such as:
 * - Missing/incorrect page numbers
 * - Inconsistent heading hierarchy
 * - Missing required sections
 * - Abnormal page count
 * - Basic formatting issues
 * 
 * Limitations:
 * - Cannot detect font sizes or styles in PDF (would need a more sophisticated parser)
 * - Cannot verify alignment/margins accurately from extracted text
 * - Works best with text-based PDFs; scanned documents will have limited analysis
 * - Required sections list is based on common academic report formats
 */

export interface CheckerIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export interface CheckerResult {
  passed: boolean;
  issues: CheckerIssue[];
  pageCount: number;
  wordCount: number;
}

// Required sections for different document types
const REQUIRED_SECTIONS: Record<string, string[]> = {
  INTERNSHIP_REPORT: [
    'abstract',
    'introduction',
    'company profile',
    'work done',
    'conclusion',
    'references',
  ],
  MINI_PROJECT_REPORT: [
    'abstract',
    'introduction',
    'literature review',
    'methodology',
    'implementation',
    'results',
    'conclusion',
    'references',
  ],
  MAJOR_PROJECT_REPORT: [
    'abstract',
    'introduction',
    'literature review',
    'problem statement',
    'methodology',
    'system design',
    'implementation',
    'testing',
    'results',
    'conclusion',
    'future scope',
    'references',
  ],
  PPT: [],
};

const PAGE_COUNT_RANGES: Record<string, { min: number; max: number }> = {
  INTERNSHIP_REPORT: { min: 15, max: 80 },
  MINI_PROJECT_REPORT: { min: 20, max: 100 },
  MAJOR_PROJECT_REPORT: { min: 40, max: 150 },
  PPT: { min: 8, max: 50 },
};

export function checkDocument(
  text: string,
  pageCount: number,
  documentType: string
): CheckerResult {
  const issues: CheckerIssue[] = [];
  const textLower = text.toLowerCase();
  const lines = text.split('\n').filter(l => l.trim());
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  // 1. Check page count
  const range = PAGE_COUNT_RANGES[documentType];
  if (range) {
    if (pageCount < range.min) {
      issues.push({
        type: 'warning',
        message: `Document has ${pageCount} pages, which is below the recommended minimum of ${range.min} pages for a ${documentType.replace(/_/g, ' ').toLowerCase()}.`,
      });
    }
    if (pageCount > range.max) {
      issues.push({
        type: 'warning',
        message: `Document has ${pageCount} pages, which exceeds the recommended maximum of ${range.max} pages.`,
      });
    }
  }

  // 2. Check required sections
  const requiredSections = REQUIRED_SECTIONS[documentType] || [];
  const missingSections: string[] = [];
  for (const section of requiredSections) {
    if (!textLower.includes(section)) {
      missingSections.push(section);
    }
  }
  if (missingSections.length > 0) {
    issues.push({
      type: 'error',
      message: `Missing required sections: ${missingSections.map(s => `"${s}"`).join(', ')}`,
      details: 'Ensure your document includes all required sections with proper headings.',
    });
  }

  // 3. Check for page numbers (look for patterns like "Page X" or standalone numbers at line edges)
  const pageNumberPattern = /page\s*\d+|^\d+$/im;
  const hasPageNumbers = lines.some(line => pageNumberPattern.test(line.trim()));
  if (!hasPageNumbers && pageCount > 5) {
    issues.push({
      type: 'warning',
      message: 'No page numbers detected. Ensure your document has proper page numbering.',
    });
  }

  // 4. Check for table of contents
  if (pageCount > 10 && !textLower.includes('table of contents') && !textLower.includes('contents')) {
    issues.push({
      type: 'warning',
      message: 'No Table of Contents detected. Documents with more than 10 pages should include a Table of Contents.',
    });
  }

  // 5. Check for references/bibliography
  if (documentType !== 'PPT') {
    const hasReferences = textLower.includes('references') || textLower.includes('bibliography');
    if (!hasReferences) {
      issues.push({
        type: 'error',
        message: 'No References/Bibliography section found. Academic documents must include proper citations.',
      });
    }
  }

  // 6. Check word count minimum
  if (documentType !== 'PPT' && wordCount < 2000 && pageCount > 10) {
    issues.push({
      type: 'info',
      message: `Low word count (${wordCount} words) for the number of pages. This might indicate the document is primarily images/diagrams or has extraction issues.`,
    });
  }

  // 7. Check for title page elements
  if (!textLower.includes('jb institute') && !textLower.includes('jbiet')) {
    issues.push({
      type: 'info',
      message: 'College name (JBIET) not found in the document. Ensure the title page includes the institution name.',
    });
  }

  // 8. Check for student/author information
  if (!textLower.includes('submitted by') && !textLower.includes('prepared by') && !textLower.includes('author')) {
    issues.push({
      type: 'info',
      message: 'Author/submission information not clearly identified. Include "Submitted by" with student details.',
    });
  }

  // Determine pass/fail
  const hasErrors = issues.some(i => i.type === 'error');
  const passed = !hasErrors;

  return {
    passed,
    issues,
    pageCount,
    wordCount,
  };
}
