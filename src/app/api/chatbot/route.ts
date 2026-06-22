import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// --- SECURITY: In-memory rate limiter for chatbot (per-student) ---
const chatRateLimits = new Map<string, { count: number; windowStart: number }>();
const CHAT_RATE_LIMIT = 10; // max messages per window
const CHAT_RATE_WINDOW_MS = 60 * 1000; // 1 minute window

function checkChatRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = chatRateLimits.get(userId);

  if (!record || now - record.windowStart > CHAT_RATE_WINDOW_MS) {
    chatRateLimits.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (record.count >= CHAT_RATE_LIMIT) {
    const retryAfter = Math.ceil((CHAT_RATE_WINDOW_MS - (now - record.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

/**
 * JBIET Chatbot — Rebuilt with proper grounding
 * 
 * Architecture:
 * 1. Verifies session server-side (no trust of client-passed IDs)
 * 2. Fetches the logged-in student's REAL data (attendance, fees, results, timetable)
 * 3. Calls Claude API with a system prompt containing:
 *    (a) JBIET policy/FAQ content
 *    (b) The student's live data
 *    (c) Strict instructions on when to answer vs when to refer to staff
 * 4. Falls back to a DATA-AWARE local response if no API key
 *    (not keyword matching — actually uses the student's numbers)
 */

// JBIET policy grounding content
const JBIET_POLICIES = `
COLLEGE: JB Institute of Engineering & Technology (JBIET), UGC Autonomous, NAAC Accredited, AICTE Approved, Affiliated to JNTUH.
College Code: 671. Location: Hyderabad, Telangana.

ACADEMIC STRUCTURE:
- Regulation: R22 (current batches from 2022), R18 (older batches)
- 8 semesters over 4 years. Two semesters/year: Odd (June-Nov), Even (Dec-May)
- Internal marks: 30 (average of Mid-1 and Mid-2), External: 70, Total: 100 per subject
- Grading: O=10, A+=9, A=8, B+=7, B=6, C=5, D (fail below passing)
- SGPA per semester, CGPA cumulative across all semesters
- Supplementary exams available for clearing failed subjects (backlogs)

ATTENDANCE RULES:
- Minimum 75% attendance required to be eligible for end-semester exams
- Attendance tracked subject-wise by faculty daily
- Condonation possible for 65-75% range with valid medical certificate + fee
- Below 65%: detained, must re-register for the subject next year

FEE RULES:
- Fee categories: Tuition, Exam, Bus, Hostel, Lab, Library
- CRITICAL RULE: Exam fee CANNOT be paid until all other fees (tuition, bus, etc.) are fully cleared
- Fee payment deadline is typically 2 weeks before exam registration opens
- Scholarship holders have reduced fee amounts applied automatically
- Late fee penalty may apply after deadline

DOCUMENT SUBMISSION:
- Internship reports, mini-project reports, major-project reports can be uploaded as PDF
- PPT presentations can be uploaded as .pptx
- Maximum file size: 25MB
- Automated structure checker verifies: required sections, page count, table of contents, references
- Faculty guide reviews and can comment on submissions

EXAM REGISTRATION:
- Opens 2-3 weeks before exams (watch Notices section)
- Requires: all fees paid + minimum 75% attendance
- Hall ticket generated after successful registration

CONTACTS:
- Fee/Payment issues → Accounts Office (accounts@jbiet.edu.in)
- Attendance discrepancies → Class Teacher / HOD
- Result corrections → Exam Branch (exam@jbiet.edu.in)  
- Technical portal issues → IT Support (support@jbiet.edu.in)
- General queries → Admin Office (admin@jbiet.edu.in)
`;

// Placeholder content that the college admin would supply
const PLACEHOLDER_CONTENT_NEEDED = [
  'Exact fee amounts per category per year (tuition for convener/management/NRI)',
  'Current academic calendar with exam dates',
  'Specific scholarship scheme details',
  'Hostel rules and fee structure',
  'Bus route information',
  'Condonation fee amount',
  'Late fee penalty amounts',
];

async function getStudentContext(studentId: string) {
  // Fetch all relevant data for this specific student
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { branch: true, section: true },
  });
  if (!student) return null;

  const [attendance, fees, results, timetable, facultyAssignments] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId },
      include: { subject: true },
    }),
    prisma.feeRecord.findMany({
      where: { studentId },
      orderBy: [{ semester: 'desc' }, { category: 'asc' }],
    }),
    prisma.semesterResult.findMany({
      where: { studentId },
      include: { subjectResults: { include: { subject: true } } },
      orderBy: { semester: 'desc' },
    }),
    prisma.timetable.findFirst({
      where: { sectionId: student.sectionId },
      include: { slots: { include: { subject: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.facultyAssignment.findMany({
      where: { sectionId: student.sectionId },
      include: { faculty: true, subject: true },
      orderBy: { isClassTeacher: 'desc' },
    }),
  ]);

  // Compute attendance summary
  const subjectAttendance: Record<string, { name: string; total: number; present: number }> = {};
  let totalClasses = 0, totalPresent = 0;
  for (const rec of attendance) {
    totalClasses++;
    if (rec.status === 'PRESENT') totalPresent++;
    if (!subjectAttendance[rec.subjectId]) {
      subjectAttendance[rec.subjectId] = { name: rec.subject.name, total: 0, present: 0 };
    }
    subjectAttendance[rec.subjectId].total++;
    if (rec.status === 'PRESENT') subjectAttendance[rec.subjectId].present++;
  }
  const overallPct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

  // Compute fee summary
  const totalFeeAmount = fees.reduce((s, f) => s + f.totalAmount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.paidAmount, 0);
  const totalDue = fees.reduce((s, f) => s + Math.max(0, f.totalAmount - f.paidAmount - f.scholarshipAmount), 0);
  const unpaidCategories = fees.filter(f => f.status !== 'PAID').map(f => `${f.category} (Sem ${f.semester}): ₹${Math.max(0, f.totalAmount - f.paidAmount - f.scholarshipAmount).toLocaleString()} due`);

  // Active backlogs
  const activeBacklogs = results
    .flatMap(r => r.subjectResults)
    .filter(sr => sr.isBacklog && !sr.backlogCleared)
    .map(sr => `${sr.subject.code} - ${sr.subject.name}`);

  // Latest CGPA
  const latestResult = results[0];
  const cgpa = latestResult?.cgpa;
  const sgpa = latestResult?.sgpa;

  // Timetable for today
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const dayIndex = today === 0 ? 6 : today - 1; // Convert to 0=Mon
  const todaySlots = timetable?.slots?.filter(s => s.dayOfWeek === dayIndex) || [];

  // How many future classes can they miss and stay ≥75%
  // Formula: floor(present/0.75) - total = max additional absences before hitting 75%
  // NOTE: This assumes future classes are added one at a time. We don't know the total
  // scheduled classes for the semester, so this answers: "of the next classes held,
  // how many can you be absent from and still stay ≥75% overall?"
  const classesCanMiss = totalClasses > 0 ? Math.floor(totalPresent / 0.75) - totalClasses : 0;
  // If already below 75%, this will be negative — we need to know how many they must attend to recover
  const classesNeededToRecover = classesCanMiss < 0 ? Math.ceil((0.75 * totalClasses - totalPresent) / 0.25) : 0;

  return `
THIS STUDENT'S LIVE DATA (as of now):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${student.name}
Roll Number: ${student.registrationNo}
Branch: ${student.branch.name} (${student.branch.shortName})
Section: ${student.section.name}
Batch: ${student.batch} (Year ${student.batchYear})
Regulation: ${student.regulation || 'R22'}

ATTENDANCE:
- Overall: ${overallPct}% (${totalPresent}/${totalClasses} classes)
- ${overallPct >= 75 ? '✓ Eligible for exams' : '✗ BELOW 75% — currently NOT eligible for exams without condonation'}
- ${classesCanMiss >= 0 ? `Future classes they can miss and stay ≥75%: ${classesCanMiss}` : `ALREADY BELOW 75%. Must attend the next ${classesNeededToRecover} consecutive classes without absence to recover to 75%.`}
- Subject-wise breakdown:
${Object.values(subjectAttendance).map(s => `  • ${s.name}: ${s.total > 0 ? Math.round((s.present/s.total)*100) : 0}% (${s.present}/${s.total})`).join('\n')}

FEES:
- Total fees: ₹${totalFeeAmount.toLocaleString()}
- Total paid: ₹${totalPaid.toLocaleString()}
- Balance due: ₹${totalDue.toLocaleString()}
- ${totalDue === 0 ? '✓ All fees cleared' : '✗ Fees pending — cannot register for exams until cleared'}
- Unpaid items:
${unpaidCategories.length > 0 ? unpaidCategories.map(u => `  • ${u}`).join('\n') : '  • None — all paid'}
- Reminder: Exam fee cannot be paid until tuition and other fees are cleared first.

RESULTS:
- Latest CGPA: ${cgpa ? cgpa.toFixed(2) : 'No results published yet'}
- Latest SGPA: ${sgpa ? sgpa.toFixed(2) : 'N/A'}
- Active backlogs: ${activeBacklogs.length === 0 ? 'None' : activeBacklogs.join(', ')}

TODAY'S TIMETABLE (${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][dayIndex] || 'N/A'}):
${todaySlots.length > 0 ? todaySlots.map(s => `  • ${s.startTime}-${s.endTime}: ${s.subject?.name || 'Free'} ${s.room ? `(${s.room})` : ''}`).join('\n') : '  • No classes scheduled / timetable not published'}

ASSIGNED FACULTY:
${facultyAssignments.length > 0
    ? facultyAssignments.map(a => `  • ${a.subject.name} (${a.subject.code}): ${a.faculty.name}${a.isClassTeacher ? ' [CLASS TEACHER]' : ''}`).join('\n')
    : '  • No faculty assignments found for this section'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

function buildSystemPrompt(studentContext: string): string {
  return `${JBIET_POLICIES}

${studentContext}

YOU ARE THE JBIET STUDENT ASSISTANT. STRICT RULES:

1. CATEGORY 1 — Policy/general questions (fee rules, exam process, attendance rules, how to submit documents, portal navigation):
   → Answer directly using the policy information above. Be concise and specific.

2. CATEGORY 2 — Student's own factual data (their attendance %, fee balance, CGPA, backlog list, today's timetable):
   → Answer using ONLY the live data shown above. Quote the exact numbers. Example: "Your overall attendance is 91% (20/22 classes). You can miss approximately 2 more classes before dropping below 75%."

3. CATEGORY 3 — Disputes, errors, corrections, or things requiring human judgment (attendance marked wrong, fee shows pending after payment, result discrepancy, any "why" that requires investigation):
   → DO NOT GUESS OR MAKE UP AN ANSWER. Say clearly: "I can't resolve this — this requires [specific office]. Please contact [specific email/office] with your roll number and details."
   → Specific referrals:
     - Fee discrepancy → Accounts Office (accounts@jbiet.edu.in)
     - Attendance error → Your Class Teacher or HOD
     - Result correction → Exam Branch (exam@jbiet.edu.in)
     - Portal/technical issue → IT Support (support@jbiet.edu.in)

NEVER invent data you don't have. NEVER give a confident answer to a Category 3 question. Be helpful but honest.
Keep responses concise (2-4 sentences for simple questions, more for complex ones).
`;
}

export async function POST(request: NextRequest) {
  try {
    // Server-side auth verification on every request
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Chatbot is for students only' }, { status: 403 });
    }

    const body = await request.json();
    const { message } = body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // --- SECURITY: Message size limit (prevent oversized payloads to LLM) ---
    const MAX_MESSAGE_LENGTH = 1000; // characters
    const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);

    // --- SECURITY: Per-student rate limiting ---
    const rateLimitResult = checkChatRateLimit(session.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many messages. Please wait ${rateLimitResult.retryAfter} seconds before sending another.` },
        { status: 429 }
      );
    }

    // Get student record (verified via session — never trust client-passed IDs)
    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Save user message (trimmed)
    await prisma.chatMessage.create({
      data: { studentId: student.id, role: 'user', content: trimmedMessage },
    });

    // Fetch this student's real live data
    const studentContext = await getStudentContext(student.id);
    if (!studentContext) {
      return NextResponse.json({ error: 'Could not load student data' }, { status: 500 });
    }

    // Get recent conversation for context
    const recentMessages = await prisma.chatMessage.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let assistantReply: string;

    // Try Claude API
    if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY.trim() !== '') {
      try {
        const systemPrompt = buildSystemPrompt(studentContext);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            system: systemPrompt,
            messages: recentMessages
              .reverse()
              .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error('Claude API returned error:', response.status, errData);
          assistantReply = getGroundedFallback(trimmedMessage, studentContext);
        } else {
          const data = await response.json();
          assistantReply = data.content?.[0]?.text || getGroundedFallback(trimmedMessage, studentContext);
        }
      } catch (apiError) {
        console.error('Claude API network error:', apiError);
        assistantReply = getGroundedFallback(trimmedMessage, studentContext);
      }
    } else {
      // No API key — use data-grounded local response
      assistantReply = getGroundedFallback(trimmedMessage, studentContext);
    }

    // Save response
    await prisma.chatMessage.create({
      data: { studentId: student.id, role: 'assistant', content: assistantReply },
    });

    return NextResponse.json({ reply: assistantReply });
  } catch (error) {
    console.error('Chatbot error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Data-grounded fallback — proper intent routing with conversational tone.
 * 
 * Intent priority (checked in order, first match wins):
 * 1. Greetings (hi, hello, hey)
 * 2. Faculty/teacher query
 * 3. Attendance (with dispute sub-check)
 * 4. Fees (with dispute sub-check)
 * 5. Results/CGPA/backlogs (with dispute sub-check)
 * 6. Timetable/schedule
 * 7. Exam eligibility
 * 8. Documents/submissions
 * 9. Password/login
 * 10. Contact/office (only when explicitly asking for contact info)
 * 11. Off-topic/generic → concise redirect
 */
function getGroundedFallback(message: string, context: string): string {
  const lower = message.toLowerCase().trim();

  // === Extract data from context ===
  const attendanceMatch = context.match(/Overall: (\d+)% \((\d+)\/(\d+)/);
  const attPct = attendanceMatch?.[1] || '—';
  const attPresent = attendanceMatch?.[2] || '—';
  const attTotal = attendanceMatch?.[3] || '—';
  const canMissMatch = context.match(/can miss and stay ≥75%: (\d+)/);
  const canMiss = canMissMatch?.[1] || null;
  const mustAttendMatch = context.match(/Must attend the next (\d+) consecutive/);
  const mustAttend = mustAttendMatch?.[1] || null;
  const balanceMatch = context.match(/Balance due: ₹([\d,]+)/);
  const balance = balanceMatch?.[1] || '0';
  const cgpaMatch = context.match(/Latest CGPA: ([\d.]+)/);
  const cgpa = cgpaMatch?.[1] || null;
  const backlogMatch = context.match(/Active backlogs: (.+)/);
  const backlogs = backlogMatch?.[1]?.trim() || 'None';
  const nameMatch = context.match(/Name: (.+)/);
  const studentName = nameMatch?.[1]?.split(' ')[0] || 'there';

  // Extract faculty info
  const facultySection = context.match(/ASSIGNED FACULTY:\n([\s\S]*?)━/);
  const facultyText = facultySection?.[1]?.trim() || '';

  // === 1. GREETINGS ===
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|sup|yo)[\s!.,?]*$/i.test(lower) || lower === 'hi' || lower === 'hello') {
    return `Hey ${studentName}! How can I help you today? I can look up your attendance, fees, results, timetable, or faculty info — just ask.`;
  }

  // === 2. FACULTY / TEACHER QUERY ===
  if (lower.includes('faculty') || lower.includes('teacher') || lower.includes('professor') || lower.includes('sir') || lower.includes('madam') || (lower.includes('who') && (lower.includes('teach') || lower.includes('class')))) {
    if (facultyText.includes('No faculty assignments')) {
      return `I don't have faculty assignment data for your section yet — the admin may not have updated it for this semester. Check the "Faculty" page in your dashboard, or ask your Class Representative.`;
    }
    // Parse faculty lines
    const lines = facultyText.split('\n').filter(l => l.trim().startsWith('•'));
    const classTeacher = lines.find(l => l.includes('CLASS TEACHER'));
    const subjectFaculty = lines.filter(l => !l.includes('CLASS TEACHER'));

    let reply = '';
    if (classTeacher) {
      const ctMatch = classTeacher.match(/: (.+?)(?:\s*\[|$)/);
      reply += `Your Class Teacher is ${ctMatch?.[1]?.trim() || 'assigned'}.\n\n`;
    }
    if (subjectFaculty.length > 0) {
      reply += `Subject faculty:\n`;
      for (const line of subjectFaculty) {
        const match = line.match(/•\s*(.+?)\s*\((.+?)\):\s*(.+)/);
        if (match) {
          reply += `• ${match[1]} (${match[2]}) — ${match[3].trim()}\n`;
        } else {
          reply += `${line.trim()}\n`;
        }
      }
    }
    return reply.trim() || `Faculty data is available in the "Faculty" section of your dashboard.`;
  }

  // === 3.5. CONTACTS (explicit contact/email requests — check before fees) ===
  if (lower.includes('contact') || lower.includes('email') || (lower.includes('phone') && !lower.includes('my phone')) || (lower.includes('who') && (lower.includes('contact') || lower.includes('reach') || lower.includes('talk to') || lower.includes('call')))) {
    return `Here you go:\n• Fees → Accounts Office (accounts@jbiet.edu.in)\n• Attendance → Class Teacher / HOD\n• Results → Exam Branch (exam@jbiet.edu.in)\n• Tech issues → IT Support (support@jbiet.edu.in)\n• General → Admin Office (admin@jbiet.edu.in)`;
  }

  // === 4. ATTENDANCE ===
  if (lower.includes('attendance') || lower.includes('absent') || lower.includes('present') || (lower.includes('class') && (lower.includes('miss') || lower.includes('skip') || lower.includes('how many') || lower.includes('left')))) {
    // Dispute detection
    if (lower.includes('wrong') || lower.includes('error') || lower.includes('incorrect') || lower.includes('marked wrong') || lower.includes('not marked')) {
      return `I can't fix attendance records — that requires manual correction. Reach out to your Class Teacher or HOD with the specific date and subject. They'll verify and correct it.`;
    }
    const pct = parseInt(attPct);
    if (pct >= 75 && canMiss) {
      return `Your attendance is ${attPct}% (${attPresent}/${attTotal} classes) — you're above the 75% threshold. You can afford to miss about ${canMiss} more classes before it drops below 75%, assuming you attend everything else.`;
    } else if (pct < 75 && mustAttend) {
      return `Your attendance is ${attPct}% (${attPresent}/${attTotal} classes) — that's below the 75% minimum for exam eligibility. You'd need to attend roughly ${mustAttend} consecutive classes without absence to get back to 75%. Talk to your Class Teacher about condonation if you're between 65-75%.`;
    }
    return `Your overall attendance is ${attPct}% (${attPresent}/${attTotal} classes).`;
  }

  // === 4. FEES ===
  if (lower.includes('fee') || lower.includes('payment') || lower.includes('due') || lower.includes('tuition') || lower.includes('bus fee') || lower.includes('exam fee') || lower.includes('pay') || lower.includes('owe') || lower.includes('pending') || lower.includes('challan')) {
    if (lower.includes('wrong') || lower.includes('error') || lower.includes('still show') || lower.includes('already paid') || lower.includes('paid but') || lower.includes('discrepancy') || lower.includes('receipt')) {
      return `I can't resolve payment discrepancies — the Accounts Office needs to verify manually. Contact them at accounts@jbiet.edu.in with your roll number and transaction receipt. They'll reconcile the records.`;
    }
    if (balance === '0') {
      return `Your fees are all cleared — ₹0 balance. You're good on the payment front.`;
    }
    return `You have ₹${balance} in pending fees. Heads up: the exam fee can't be paid until all other categories (tuition, bus, etc.) are cleared first. Check the Fees section for a full breakdown.`;
  }

  // === 5. RESULTS / CGPA / BACKLOGS ===
  if (lower.includes('cgpa') || lower.includes('sgpa') || lower.includes('result') || lower.includes('grade') || lower.includes('marks') || lower.includes('gpa') || lower.includes('score')) {
    if (lower.includes('wrong') || lower.includes('error') || lower.includes('incorrect') || lower.includes('recheck')) {
      return `Result corrections go through the Exam Branch — I can't modify grades. Email exam@jbiet.edu.in with your roll number, subject code, and the specific issue. They handle rechecking and revaluation.`;
    }
    if (!cgpa) return `No results have been published for you yet. They'll appear in the Results section once the exam branch releases them.`;
    let reply = `Your CGPA is ${cgpa}.`;
    if (backlogs !== 'None') {
      reply += ` You have active backlogs in: ${backlogs}. These can be cleared in the next supplementary exam.`;
    } else {
      reply += ` No backlogs — all subjects cleared.`;
    }
    return reply;
  }

  if (lower.includes('backlog') || lower.includes('supply') || lower.includes('supplementary') || lower.includes('arrear')) {
    if (backlogs === 'None') return `You don't have any active backlogs. All clear!`;
    return `You have backlogs in: ${backlogs}. Register for the supplementary exam when it's announced (check Notices). Contact exam@jbiet.edu.in for supply exam schedules.`;
  }

  // === 6. TIMETABLE ===
  if (lower.includes('timetable') || lower.includes('schedule') || (lower.includes('today') && lower.includes('class')) || lower.includes('periods')) {
    const timetableSection = context.match(/TODAY'S TIMETABLE[^\n]*\n([\s\S]*?)(?:\nASSIGNED|━)/);
    const schedule = timetableSection?.[1]?.trim() || '';
    if (!schedule || schedule.includes('No classes') || schedule.includes('not published')) {
      return `No timetable is published for today, or there are no classes scheduled. Check the Timetable page in your dashboard for the full weekly view.`;
    }
    return `Here's today's schedule:\n${schedule}`;
  }

  // === 7. EXAM ELIGIBILITY ===
  if ((lower.includes('exam') || lower.includes('hall ticket') || lower.includes('registration')) && !lower.includes('email') && !lower.includes('contact') && (lower.includes('eligible') || lower.includes('sit') || lower.includes('can i') || lower.includes('register') || lower.includes('appear'))) {
    const eligible = parseInt(attPct) >= 75;
    const feesClear = balance === '0';
    if (eligible && feesClear) {
      return `You should be eligible for exam registration — attendance is ${attPct}% (≥75%) and fees are cleared. Keep an eye on the Notices section for when registration opens.`;
    }
    const issues = [];
    if (!eligible) issues.push(`attendance at ${attPct}% (needs ≥75%)`);
    if (!feesClear) issues.push(`₹${balance} in fees still pending`);
    return `You're currently not eligible for exam registration: ${issues.join(', ')}. ${!eligible ? 'Work on improving attendance — talk to your Class Teacher.' : ''} ${!feesClear ? 'Clear your pending fees first.' : ''}`.trim();
  }

  // === 8. DOCUMENTS ===
  if (lower.includes('submit') || lower.includes('document') || lower.includes('report') || lower.includes('internship') || lower.includes('project') || lower.includes('upload') || lower.includes('ppt')) {
    return `Go to Documents in your dashboard → pick the type (Internship Report, Mini/Major Project, PPT) → upload as PDF or PPTX (max 25MB). The system auto-checks structure and gives feedback before your guide reviews it.`;
  }

  // === 9. PASSWORD / LOGIN ===
  if (lower.includes('password') || lower.includes('login') || lower.includes('forgot') || lower.includes('reset') || lower.includes('locked')) {
    return `You can change your password from profile settings. Forgot it? Contact the Admin Office with your roll number and ID proof for a manual reset.`;
  }

  // === 11. THANKS / BYE ===
  if (/^(thanks|thank you|ok|okay|got it|bye|cool|great)[\s!.,?]*$/i.test(lower)) {
    return `You're welcome! Let me know if anything else comes up.`;
  }

  // === FALLBACK (no match) — brief, not overwhelming ===
  return `I'm not sure I understood that. I can help with: attendance, fees, results, timetable, faculty info, exam eligibility, or document submissions. What would you like to know?`;
}

