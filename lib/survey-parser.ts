/** 바로 앞 문항에서 이 보기를 골랐을 때만 보이는 문항 — 줄 앞에 [앞 답: 보기] (2026-11-10) */
export type ShowIf = { questionId: string; value: string };

export type Question = (
  | {
      id: string;
      type: "scale";
      text: string;
      min: number;
      max: number;
      minLabel?: string;
      maxLabel?: string;
      /** 점수마다 라벨 (min 부터 순서대로) — 있으면 숫자 대신 라벨 버튼 */
      labels?: string[];
    }
  | { id: string; type: "choice"; text: string; options: string[]; multi?: boolean }
  | { id: string; type: "text"; text: string; long?: boolean }
) & {
  showIf?: ShowIf;
  /** 줄에 (필수) — 답해야 제출된다. 없으면 선택 문항 */
  required?: boolean;
};

export type Section = {
  number: string;
  title: string;
  questions: Question[];
};

export type Survey = {
  title: string;
  /** 타이틀 아래·첫 섹션 위에 표시할 안내문(선택). 줄바꿈 유지, 리스트 항목(- ) 포함 가능. */
  intro?: string;
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

  // 점수마다 라벨 (1=전혀 그렇지 않다, 2=그렇지 않다, ..., 5=매우 그렇다) → 라벨 버튼 척도 (2026-11-10)
  const allLabels = text.match(/\(\s*(1\s*=[^)]*)\)\s*$/);
  if (allLabels) {
    const pairs = allLabels[1].split(/[,，]/).map((p) => p.match(/^\s*(\d+)\s*=\s*(.+?)\s*$/));
    if (pairs.length >= 3 && pairs.every((m, i) => m && parseInt(m[1], 10) === i + 1)) {
      const labels = pairs.map((m) => m![2]);
      return {
        id,
        type: "scale",
        text: text.replace(/\s*\([^)]*\)\s*$/, "").trim(),
        min: 1,
        max: labels.length,
        minLabel: labels[0],
        maxLabel: labels[labels.length - 1],
        labels,
      };
    }
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
      text: text
        .replace(/\s*예\s*\/\s*아니오\s*$/, "")
        .replace(/\s*[—\-]\s*$/, "")
        .trim(),
      options: ["예", "아니오"],
    };
  }

  // em-dash MC: "질문 — 옵션1 / 옵션2 / ..."
  //   질문에 (복수) 를 붙이면 여러 개 선택 — "질문 (복수) — 옵션1 / 옵션2" (2026-11-09)
  const dashIdx = text.indexOf("—");
  if (dashIdx !== -1) {
    let qPart = text.slice(0, dashIdx).trim();
    const optPart = text.slice(dashIdx + 1).trim();
    const options = optPart.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
    if (options.length >= 2) {
      const multi = /\(\s*복수\s*\)/.test(qPart);
      if (multi) qPart = qPart.replace(/\s*\(\s*복수\s*\)/, "").trim();
      return multi
        ? { id, type: "choice", text: qPart, options, multi: true }
        : { id, type: "choice", text: qPart, options };
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

  // (자유) 표기는 서술형(textarea) 힌트. 힌트 자체는 라벨에서 제거.
  const longMatch = text.match(/\s*\(\s*자유\s*\)\s*$/);
  if (longMatch) {
    return {
      id,
      type: "text",
      text: text.replace(/\s*\(\s*자유\s*\)\s*$/, "").trim(),
      long: true,
    };
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
      // "- [앞 답: 동의해요] 질문" → 바로 앞 문항 답이 그 보기일 때만 보임
      const cond = line.match(/^([-•]\s+)\[\s*앞\s*답\s*:\s*([^\]]+)\]\s*/);
      const prev = current.questions[current.questions.length - 1];
      let body = cond ? cond[1] + line.slice(cond[0].length) : line;
      const required = /\(\s*필수\s*\)/.test(body);
      if (required) body = body.replace(/\s*\(\s*필수\s*\)/, "");
      const q = parseQuestion(body, id);
      if (cond && prev) q.showIf = { questionId: prev.id, value: cond[2].trim() };
      if (required) q.required = true;
      current.questions.push(q);
    }
  }
  if (current) sections.push(current);

  // Survey title: 첫 유효 라인부터 연속된 유효 라인들을 \n 으로 이어붙임 (다중 라인 제목 지원).
  //   유효 = 빈 줄/---/N. 섹션/- 리스트/진행 팁 이 아닌 텍스트.
  //   빈 줄이 나오는 순간 제목 종료 → 이후는 intro 영역.
  let title = "설문지";
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (/^-{3,}$/.test(line)) continue;
    if (/^\d+\./.test(line)) continue;
    if (/^[-•]/.test(line)) continue;
    if (line.startsWith("진행 팁") || line.startsWith("빼거나")) continue;
    // 첫 유효 라인 발견 → 연속 라인 이어붙이기
    const titleLines: string[] = [line];
    let j = i + 1;
    while (j < lines.length) {
      const l = lines[j];
      if (!l) break;
      if (/^-{3,}$/.test(l)) break;
      if (/^\d+\./.test(l)) break;
      if (/^[-•]/.test(l)) break;
      titleLines.push(l);
      j++;
    }
    title = titleLines.join("\n");
    titleIdx = j - 1;
    break;
  }

  // Intro: title 다음 줄부터 첫 --- 구분자 또는 첫 섹션 헤더 이전까지의 원본 라인.
  // 줄바꿈·리스트(-) 포함 유지 (렌더 쪽에서 그대로 표시).
  let intro: string | undefined;
  if (titleIdx !== -1) {
    const introLines: string[] = [];
    for (let i = titleIdx + 1; i < rawLines.length; i++) {
      const trimmed = rawLines[i].trim();
      if (/^-{3,}$/.test(trimmed)) break;
      if (/^\d+\.\s/.test(trimmed)) break;
      introLines.push(rawLines[i]);
    }
    const joined = introLines.join("\n").trim();
    if (joined) intro = joined;
  }

  return { title, intro, sections };
}
