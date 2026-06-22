import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * Document-grounded AI Chat
 * 
 * Architecture:
 * 1. Verify user can access this document
 * 2. Load the document's extracted text
 * 3. Answer questions grounded ONLY in that text
 * 4. Clearly mark when answer goes beyond the document content
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { documentId, message } = body;

    if (!documentId || !message || typeof message !== 'string') {
      return NextResponse.json({ error: 'documentId and message required' }, { status: 400 });
    }

    // Verify document exists and user can access it
    const doc = await prisma.documentSubmission.findUnique({
      where: { id: documentId },
      include: { student: { select: { userId: true, name: true } } },
    });

    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Authorization: showcased docs are viewable by all logged-in users
    // Non-showcased: only the student who submitted, the faculty it was submitted to, or admin
    if (!doc.isShowcased) {
      if (session.role === 'STUDENT' && doc.student.userId !== session.id) {
        return NextResponse.json({ error: 'Not authorized to view this document' }, { status: 403 });
      }
      if (session.role === 'FACULTY') {
        const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
        if (!faculty || doc.submittedToId !== faculty.id) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
      }
    }

    const extractedText = doc.extractedText || '';
    const docTitle = doc.title;
    const trimmedMessage = message.trim().slice(0, 500);

    let reply: string;

    // Try Claude API for grounded response
    if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY.trim() !== '') {
      try {
        const systemPrompt = `You are a document analysis assistant. You are answering questions about a specific academic document.

DOCUMENT TITLE: "${docTitle}"
DOCUMENT CONTENT:
${extractedText.slice(0, 8000)}

STRICT RULES:
1. Answer questions ONLY based on the document content above.
2. If the answer is clearly stated in the document, answer it and cite which section it's from (e.g. "From the Introduction section: ...").
3. If the answer requires general knowledge BEYOND what's in the document, clearly label it: "⚡ General knowledge (not from this paper): ..."
4. If the document doesn't cover the topic at all, say: "This document doesn't appear to cover [topic]. The paper focuses on [what it does cover]."
5. Never fabricate content that isn't in the document and present it as if it were.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: trimmedMessage }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          reply = data.content?.[0]?.text || getLocalGroundedResponse(trimmedMessage, extractedText, docTitle);
        } else {
          reply = getLocalGroundedResponse(trimmedMessage, extractedText, docTitle);
        }
      } catch {
        reply = getLocalGroundedResponse(trimmedMessage, extractedText, docTitle);
      }
    } else {
      reply = getLocalGroundedResponse(trimmedMessage, extractedText, docTitle);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Repository chat error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Local grounded response when no LLM API key is available.
 * Searches the extracted text for relevant content.
 */
function getLocalGroundedResponse(question: string, text: string, title: string): string {
  if (!text || text.length < 50) {
    return `The text content of "${title}" hasn't been extracted yet. Once the PDF is processed, I'll be able to answer questions about its specific content. For now, I can only tell you it's titled "${title}".`;
  }

  const lower = question.toLowerCase();
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

  // Find sentences that match keywords from the question
  const questionWords = lower.split(/\s+/).filter(w => w.length > 3 && !['what', 'how', 'does', 'this', 'that', 'about', 'from', 'which', 'where', 'when'].includes(w));

  const scored = sentences.map(sentence => {
    const sentLower = sentence.toLowerCase();
    const matchCount = questionWords.filter(w => sentLower.includes(w)).length;
    return { sentence: sentence.trim(), score: matchCount };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const topMatches = scored.slice(0, 3).map(s => s.sentence).join('. ');
    return `📄 From the document "${title}":\n\n"${topMatches}."\n\n(This is extracted directly from the paper's content.)`;
  }

  // Check if it's asking about the document itself
  if (lower.includes('about') || lower.includes('summary') || lower.includes('topic') || lower.includes('what is')) {
    const firstParagraph = text.slice(0, 500).trim();
    return `📄 This document is titled "${title}". Here's the opening content:\n\n"${firstParagraph}..."\n\nThe full document contains ${text.length} characters of content across its pages.`;
  }

  return `I searched the content of "${title}" but couldn't find specific information about "${question.slice(0, 50)}". The document may not cover this topic. Try asking about the main subjects, methodology, or conclusions discussed in the paper.`;
}
