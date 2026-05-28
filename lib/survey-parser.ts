export type Question =
  | { id: string; type: "scale"; text: string; min: number; max: number; minLabel?: string; maxLabel?: string }
  | { id: string; type: "choice"; text: string; options: string[] }
  | { id: string; type: "text"; text: string };

export type Section = {
  number: string;
  title: string;
  questions: Question[];
};

export type Survey = {
  title: string;
  sections: Section[];
};

function parseQuestion(rawLine: string, id: string): Question {
  const text = rawLine.replace(/^[-•]\s+/, "").trim();

  // scale 1~5점 or 1-5점
  if (/[15][~\-]5\s*점\s*$/.test(text)) {
    return {
      id,
      type: "scale",
      text: text.replace(/\s*[15][~\-]5\s*점\s*$/, "").trim(),
      min: 1,
      max: 5,
    };
  }

  // scale 0~10점 (NPS)
  if (/0[~\-]10\s*점\s*$/.test(text)) {
    return {
      id,
      type: "scale",
      text: text.replace(/\s*0[~\-]10\s*점\s*$/, "").trim(),
      min: 0,
      max: 10,
    };
  }

  // explicit (1=..., 5=...) labels → scale with labels
  const labelMatch = text.match(/\(\s*1\s*=\s*([^,)]+)[,，]\s*(\d+)\s*=\s*([^)]+)\)\s*$/);
  if (labelMatch) {
    const max = parseInt(labelMatch[2], 10);
    return {
      id,
      type: "scale",
      text: text.replace(/\s*\([^)]*\)\s*$/, "").trim(),
      min: 1,
      max,
      minLabel: labelMatch[1].trim(),
      maxLabel: labelMatch[3].trim(),
    };
  }

  // Yes/No
  if (/예\s*\/\s*아니오/.test(text)) {
    return {
      id,
      type: "choice",
      text: text.replace(/\s*예\s*\/\s*아니오\s*$/, "").trim(),
      options: ["예", "아니오"],
    };
  }

  // em-dash MC: "질문 — 옵션1 / 옵션2 / ..."
  const dashIdx = text.indexOf("—");
  if (dashIdx !== -1) {
    const qPart = text.slice(0, dashIdx).trim();
    const optPart = text.slice(dashIdx + 1).trim();
    const options = optPart.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
    if (options.length >= 2) {
      return { id, type: "choice", text: qPart, options };
    }
  }

  // MC after final "?": "...? 옵션1 / 옵션2 / ..."
  const qIdx = text.lastIndexOf("?");
  if (qIdx !== -1 && qIdx < text.length - 1) {
    const after = text.slice(qIdx + 1).trim();
    if (after && !after.startsWith("(")) {
      const opts = after.split(/\s+\/\s+/).map((s) => s.trim()).filter(Boolean);
      if (opts.length >= 2 && opts.every((o) => o.length > 0 && o.length < 20)) {
        return {
          id,
          type: "choice",
          text: text.slice(0, qIdx + 1).trim(),
          options: opts,
        };
      }
    }
  }

  return { id, type: "text", text };
}

export function parseSurvey(md: string): Survey {
  const rawLines = md.split("\n");
  const lines = rawLines.map((l) => l.trim());

  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    if (/^-{3,}$/.test(line)) {
      if (current) {
        sections.push(current);
        current = null;
      }
      continue;
    }
    const sectionMatch = line.match(/^(\d+)\.\s*(.+)/);
    if (sectionMatch) {
      if (current) sections.push(current);
      current = {
        number: sectionMatch[1],
        title: sectionMatch[2].trim(),
        questions: [],
      };
      continue;
    }
    if (current && /^[-•]\s+/.test(line)) {
      const id = `q_${current.number}_${current.questions.length + 1}`;
      current.questions.push(parseQuestion(line, id));
    }
  }
  if (current) sections.push(current);

  // Survey title: first non-empty content line that isn't a separator / section / list / tip
  let title = "설문지";
  for (const line of lines) {
    if (!line) continue;
    if (/^-{3,}$/.test(line)) continue;
    if (/^\d+\./.test(line)) continue;
    if (/^[-•]/.test(line)) continue;
    if (line.startsWith("진행 팁") || line.startsWith("빼거나")) continue;
    title = line;
    break;
  }

  return { title, sections };
}
