import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, Packer,
  PageNumber, Paragraph, SectionType, ShadingType, Table, TableCell, TableRow, TextRun,
  VerticalAlign, WidthType,
} from 'docx';
import type { Score, StudentArchive } from '../../../shared/contracts';

const BLUE = '135F9E';
const ORANGE = 'E77817';
const PALE = 'EEF5FA';
const FONT = 'Microsoft YaHei';
const borders = { top: { style: BorderStyle.SINGLE, size: 1, color: 'C9D6E1' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C9D6E1' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'C9D6E1' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'C9D6E1' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDE6ED' }, insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDE6ED' } };

function run(text: string, options: { bold?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({ text, font: FONT, ...options });
}
function title(text: string, pageBreakBefore = false) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore, keepNext: true, spacing: { before: 120, after: 260 }, children: [run(text, { bold: true, color: BLUE, size: 32 })] });
}
function body(text: string) {
  return new Paragraph({ spacing: { after: 130, line: 360 }, keepLines: true, children: [run(text || '—', { size: 21 })] });
}
function cell(text: string, heading = false) {
  return new TableCell({ verticalAlign: VerticalAlign.CENTER, shading: heading ? { type: ShadingType.CLEAR, fill: BLUE } : undefined, margins: { top: 100, bottom: 100, left: 110, right: 110 }, children: [new Paragraph({ children: [run(text, { bold: heading, color: heading ? 'FFFFFF' : '263746', size: 19 })] })] });
}
function metaTable(archive: StudentArchive) {
  const student = archive.student;
  const rows = [['学生姓名', student.name], ['学校', student.school || '—'], ['年级', student.grade], ['入学日期', student.join_date || '—']];
  return new Table({ width: { size: 88, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER, borders, rows: rows.map(([label, value]) => new TableRow({ cantSplit: true, children: [cell(label, true), cell(value)] })) });
}
function scoreTable(scores: Score[]) {
  const subjects = [...new Map(scores.flatMap((score) => score.values.map((value) => [value.subject_id, value.subject_name] as const))).values()];
  const header = new TableRow({ tableHeader: true, cantSplit: true, children: [cell('考试', true), cell('日期', true), ...subjects.map((subject) => cell(subject, true)), cell('备注', true)] });
  const rows = scores.map((score) => new TableRow({ cantSplit: true, children: [cell(score.exam_name), cell(score.exam_date), ...subjects.map((subject) => cell(String(score.values.find((value) => value.subject_name === subject)?.value ?? '—'))), cell(score.remark || '—')] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: [header, ...rows] });
}
function recordBlock(label: string, date: string, content: string) {
  return [
    new Paragraph({ keepNext: true, spacing: { before: 180, after: 80 }, shading: { type: ShadingType.CLEAR, fill: PALE }, children: [run(`${date}  ${label}`, { bold: true, color: BLUE, size: 22 })] }),
    body(content),
  ];
}

export async function buildArchiveDocx(archive: StudentArchive, logo: Uint8Array): Promise<Blob> {
  const logoRun = () => new ImageRun({ data: logo, type: 'jpg', transformation: { width: 230, height: 230 } });
  const content: Array<Paragraph | Table> = [title('第一章  成绩成长记录')];
  if (archive.scores.length === 0) content.push(body('暂无成绩记录'));
  else content.push(scoreTable(archive.scores));
  content.push(title('第二章  晚辅成长记录', true));
  if (archive.studyRecords.length === 0) content.push(body('暂无晚辅记录'));
  else archive.studyRecords.forEach((record, index) => content.push(...recordBlock(`第 ${index + 1} 则`, record.record_date, record.content)));
  archive.courseSections.forEach((section, sectionIndex) => {
    content.push(title(`第 ${sectionIndex + 3} 章  ${section.subject}课程档案`, true));
    section.records.forEach((record, index) => content.push(...recordBlock(`第 ${index + 1} 课${record.course_content ? ` · ${record.course_content}` : ''}`, record.record_date, record.feedback)));
  });

  const document = new Document({
    creator: '创新学苑教育', title: `${archive.student.name}学生成长档案`, description: '创新学苑教育学生成长档案',
    styles: { default: { document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { line: 320 } } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1100, bottom: 1000, left: 1250, right: 1250 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [logoRun()] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [run('创新学苑教育', { bold: true, color: BLUE, size: 26 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 140, after: 120 }, children: [run('学生成长档案', { bold: true, color: BLUE, size: 52 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 520 }, children: [run('STUDENT GROWTH ARCHIVE', { color: ORANGE, size: 19 })] }),
          metaTable(archive),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700 }, children: [run('成长有迹 · 记录每一次进步', { color: '647789', size: 19 })] }),
        ],
      },
      {
        properties: { type: SectionType.NEXT_PAGE, page: { margin: { top: 1000, bottom: 900, left: 950, right: 950 } } },
        headers: { default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE } }, children: [new ImageRun({ data: logo, type: 'jpg', transformation: { width: 48, height: 48 } }), run('  创新学苑教育 · 学生成长档案', { bold: true, color: BLUE, size: 18 })] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: FONT, color: '6E7D89', size: 17, children: [`${archive.student.name}  ·  第 `, PageNumber.CURRENT, ' 页'] })] })] }) },
        children: content,
      },
    ],
  });
  return Packer.toBlob(document);
}
