import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { ContractData } from '@/lib/types'

const A4_WIDTH = 595
const A4_HEIGHT = 842
const MARGIN = 50
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2

const SALARY_TYPE_LABELS: Record<string, string> = {
  monthly: '月給',
  hourly: '時給',
  daily: '日給',
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  fulltime: '正社員',
  parttime: 'パート・アルバイト',
  contract: '契約社員',
  dispatch: '派遣社員',
}

const DEPT_LABELS: Record<string, string> = {
  front: 'フロント',
  kitchen: 'キッチン',
  management: '管理',
  other: 'その他',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatSalary(amount: number): string {
  return amount.toLocaleString('ja-JP') + '円'
}

function todayFormatted(): string {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export async function generateContractPDF(data: ContractData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  let page = doc.addPage([A4_WIDTH, A4_HEIGHT])

  // --- Font loading ---
  let font: PDFFont
  let japaneseFontLoaded = false

  try {
    // Read bundled Noto Sans CJK JP from public/fonts (OTF format, required by pdf-lib)
    const fontPath = join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.otf')
    const fontBytes = await readFile(fontPath)
    font = await doc.embedFont(fontBytes, { subset: true })
    japaneseFontLoaded = true
  } catch (e) {
    console.error('Japanese font load failed, falling back to Helvetica:', e)
    font = await doc.embedFont(StandardFonts.Helvetica)
  }

  let y = A4_HEIGHT - MARGIN

  // Helper: draw text with error recovery
  function drawText(
    text: string,
    x: number,
    yPos: number,
    size: number,
    options?: { align?: 'left' | 'center' | 'right'; targetPage?: PDFPage }
  ) {
    try {
      const p = options?.targetPage ?? page
      const width = font.widthOfTextAtSize(text, size)
      let drawX = x
      if (options?.align === 'center') {
        drawX = x + (CONTENT_WIDTH - width) / 2
      } else if (options?.align === 'right') {
        drawX = MARGIN + CONTENT_WIDTH - width
      }
      p.drawText(text, { x: drawX, y: yPos, size, font, color: rgb(0.1, 0.1, 0.1) })
    } catch {
      // Skip line if rendering fails
    }
  }

  // Helper: draw a horizontal line
  function drawLine(yPos: number, targetPage?: PDFPage) {
    const p = targetPage ?? page
    p.drawLine({
      start: { x: MARGIN, y: yPos },
      end: { x: A4_WIDTH - MARGIN, y: yPos },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    })
  }

  // Helper: check if we need a new page and create one if so
  function ensureSpace(needed: number): number {
    if (y - needed < MARGIN) {
      page = doc.addPage([A4_WIDTH, A4_HEIGHT])
      y = A4_HEIGHT - MARGIN
    }
    return y
  }

  // --- Warning if fallback font ---
  if (!japaneseFontLoaded) {
    drawText('WARNING: Japanese font failed to load. Text may not render correctly.', MARGIN, y, 8)
    y -= 16
  }

  // --- Title ---
  drawText('雇用契約書', MARGIN, y, 20, { align: 'center' })
  y -= 30

  // --- Date (right-aligned) ---
  drawText(`作成日: ${todayFormatted()}`, MARGIN, y, 9, { align: 'right' })
  y -= 20

  // --- Divider ---
  drawLine(y)
  y -= 25

  // --- Parties: 甲 and 乙 ---
  const colWidth = CONTENT_WIDTH / 2
  drawText('甲（会社）', MARGIN, y, 11)
  drawText('乙（従業員）', MARGIN + colWidth, y, 11)
  y -= 18
  drawText('TECH CREW株式会社', MARGIN, y, 10)
  drawText(data.employeeName, MARGIN + colWidth, y, 10)
  y -= 14
  if (data.employeeNameKana) {
    drawText('', MARGIN, y, 9)
    drawText(`（${data.employeeNameKana}）`, MARGIN + colWidth, y, 9)
    y -= 14
  }
  y -= 10

  // --- Preamble ---
  const employmentLabel = EMPLOYMENT_TYPE_LABELS[data.employmentType] || data.employmentType
  drawText(
    `甲と乙は、以下の条件にて${employmentLabel}としての雇用契約を締結する。`,
    MARGIN,
    y,
    10,
  )
  y -= 25

  // --- Clauses ---
  const clauses: { title: string; body: string }[] = []

  // 1. 契約期間
  const periodBody = data.endDate
    ? `${formatDate(data.startDate)} から ${formatDate(data.endDate)} まで`
    : `${formatDate(data.startDate)} から 期間の定めなし`
  clauses.push({ title: '契約期間', body: periodBody })

  // 2. 就業場所
  clauses.push({ title: '就業場所', body: data.workLocation })

  // 3. 業務内容
  const deptLabel = DEPT_LABELS[data.department] || data.department
  clauses.push({ title: '業務内容', body: `${data.position}（${deptLabel}）` })

  // 4. 就業時間
  let hoursBody = data.workHours
  if (data.weeklyHours) {
    hoursBody += `（週${data.weeklyHours}時間）`
  }
  clauses.push({ title: '就業時間', body: hoursBody })

  // 5. 賃金
  const salaryLabel = SALARY_TYPE_LABELS[data.salaryType] || data.salaryType
  clauses.push({
    title: '賃金',
    body: `${salaryLabel} ${formatSalary(data.salary)}（支払日: 毎月${data.paymentDate}）`,
  })

  // 6. 試用期間
  clauses.push({
    title: '試用期間',
    body: data.trialPeriod === 'なし' ? 'なし' : data.trialPeriod,
  })

  // 7. その他事項
  if (data.specialConditions) {
    clauses.push({ title: 'その他事項', body: data.specialConditions })
  }

  // Render clauses
  for (let i = 0; i < clauses.length; i++) {
    ensureSpace(40)
    const clause = clauses[i]
    const num = `第${i + 1}条`
    drawText(`${num}（${clause.title}）`, MARGIN, y, 11)
    y -= 18

    // Word-wrap the body text
    const maxLineWidth = CONTENT_WIDTH - 20
    const bodyLines = wrapText(clause.body, font, 10, maxLineWidth)
    for (const line of bodyLines) {
      ensureSpace(16)
      drawText(line, MARGIN + 20, y, 10)
      y -= 16
    }
    y -= 10
  }

  // --- Benefits ---
  if (data.benefits && data.benefits.length > 0) {
    ensureSpace(40)
    const benefitNum = clauses.length + 1
    drawText(`第${benefitNum}条（福利厚生）`, MARGIN, y, 11)
    y -= 18
    for (const benefit of data.benefits) {
      ensureSpace(16)
      drawText(`・${benefit}`, MARGIN + 20, y, 10)
      y -= 16
    }
    y -= 10
  }

  // --- Signature section ---
  ensureSpace(120)
  y -= 10
  drawLine(y)
  y -= 30

  drawText('上記の条件にて、甲乙双方合意のうえ本契約を締結する。', MARGIN, y, 10)
  y -= 30

  // Signature boxes
  const boxWidth = (CONTENT_WIDTH - 30) / 2
  const boxHeight = 60
  const boxY = y - boxHeight

  // Left box: 甲
  page.drawRectangle({
    x: MARGIN,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.4, 0.4, 0.4),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  })
  drawText('甲（会社）印', MARGIN + boxWidth / 2 - 30, boxY + boxHeight - 16, 9)

  // Right box: 乙
  const rightBoxX = MARGIN + boxWidth + 30
  page.drawRectangle({
    x: rightBoxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.4, 0.4, 0.4),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  })
  drawText('乙（従業員）印', rightBoxX + boxWidth / 2 - 35, boxY + boxHeight - 16, 9)

  // Date lines below boxes
  const dateLineY = boxY - 18
  drawText(`日付:　　　年　　月　　日`, MARGIN, dateLineY, 9)
  drawText(`日付:　　　年　　月　　日`, rightBoxX, dateLineY, 9)

  return await doc.save()
}

/**
 * Simple word-wrap: splits text to fit within maxWidth at the given font size.
 */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  try {
    const chars = [...text]
    let current = ''
    for (const char of chars) {
      const test = current + char
      const width = font.widthOfTextAtSize(test, size)
      if (width > maxWidth && current.length > 0) {
        lines.push(current)
        current = char
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  } catch {
    // If width measurement fails, return the whole text as one line
    lines.push(text)
  }
  return lines.length > 0 ? lines : [text]
}
