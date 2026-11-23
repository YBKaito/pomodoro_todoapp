(() => {
  const doneWords = new Set(['done', 'complete', 'completed', 'finished']);
  const months = new Map([
    ['jan',0],['january',0],['feb',1],['february',1],['mar',2],['march',2],['apr',3],['april',3],['may',4],
    ['jun',5],['june',5],['jul',6],['july',6],['aug',7],['august',7],['sep',8],['sept',8],['september',8],
    ['oct',9],['october',9],['nov',10],['november',10],['dec',11],['december',11]
  ]);
  const weekdays = new Map([['sunday',0],['monday',1],['tuesday',2],['wednesday',3],['thursday',4],['friday',5],['saturday',6]]);
  const statusOf = word => doneWords.has(word.toLowerCase().replace(/\s+/g, ' ')) ? 'done' : 'todo';

  function parseDueAt(text, now = new Date()) {
    const source = String(text || '');
    const lower = source.toLowerCase();
    let year = now.getFullYear(), month = -1, day = -1, explicitYear = false, weekdayDate = false, forceNextWeek = false;
    let match = source.match(/\b((?:19|20|21)\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if (match) {
      year = Number(match[1]); month = Number(match[2]) - 1; day = Number(match[3]); explicitYear = true;
    } else {
      const monthPattern = [...months.keys()].join('|');
      match = source.match(new RegExp(`\\b(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+((?:19|20|21)\\d{2}))?\\b`, 'i'));
      if (match) {
        month = months.get(match[1].toLowerCase()); day = Number(match[2]);
        if (match[3]) { year = Number(match[3]); explicitYear = true; }
      } else {
        match = source.match(new RegExp(`\\b(\\d{1,2})[/-](\\d{1,2})(?:[/-]((?:19|20|21)?\\d{2}))?\\b`));
        if (match) {
          month = Number(match[1]) - 1; day = Number(match[2]);
          if (match[3]) { year = Number(match[3]); if (year < 100) year += 2000; explicitYear = true; }
        } else if (/\btoday\b/i.test(source) || /\btomorrow\b/i.test(source)) {
          const offset = /\btomorrow\b/i.test(source) ? 1 : 0;
          const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
          year = base.getFullYear(); month = base.getMonth(); day = base.getDate(); explicitYear = true;
        } else {
          match = source.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
          if (!match) return null;
          const target = weekdays.get(match[2].toLowerCase());
          let offset = (target - now.getDay() + 7) % 7;
          forceNextWeek = !!match[1];
          if (forceNextWeek && offset === 0) offset = 7;
          const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
          year = base.getFullYear(); month = base.getMonth(); day = base.getDate(); explicitYear = true; weekdayDate = !forceNextWeek;
        }
      }
    }

    let hour = 9, minute = 0, hasTime = false;
    let time = source.match(/\b(?:at\s*)?(\d{1,2})(?::([0-5]\d))?\s*(a\.?m?\.?|p\.?m?\.?)\b/i);
    if (time) {
      hour = Number(time[1]); minute = Number(time[2] || 0);
      const pm = /^p/i.test(time[3]);
      if (hour < 1 || hour > 12) return null;
      hour = hour % 12 + (pm ? 12 : 0); hasTime = true;
    } else {
      time = source.match(/\b(?:at\s*)?([01]?\d|2[0-3]):([0-5]\d)\b/);
      if (time) { hour = Number(time[1]); minute = Number(time[2]); hasTime = true; }
    }
    let due = new Date(year, month, day, hour, minute, 0, 0);
    if (due.getFullYear() !== year || due.getMonth() !== month || due.getDate() !== day) return null;
    if (!explicitYear) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (new Date(year, month, day) < today) { year += 1; due = new Date(year, month, day, hour, minute, 0, 0); }
    } else if (weekdayDate && due <= now) {
      due.setDate(due.getDate() + 7);
    }
    return due.getTime();
  }

  function parseLine(raw) {
    let line = raw.trim();
    if (!line) return null;
    let status = null;
    const checkbox = line.match(/^(?:[-*\u2022]\s*)?\[([ xX])\]\s*(.*)$/);
    if (checkbox) {
      status = checkbox[1].toLowerCase() === 'x' ? 'done' : 'todo';
      line = checkbox[2];
    } else {
      line = line.replace(/^(?:[-*\u2022]|\d+[.)])\s+/, '');
    }
    const prefix = line.match(/^(todo|to[ -]?do|open|pending|done|complete|completed|finished)\s*[:\-]\s*/i);
    if (prefix) { status = statusOf(prefix[1]); line = line.slice(prefix[0].length); }
    const suffix = line.match(/\s*(?:[-\u2013\u2014:]\s*|\[\s*|\(\s*)?(todo|to[ -]?do|open|pending|done|complete|completed|finished)(?:\s*[\])])?\s*$/i);
    if (suffix) {
      status = statusOf(suffix[1]);
      line = line.slice(0, suffix.index).replace(/[\s\-\u2013\u2014:]+$/, '');
    } else if (/\s*(?:[-\u2013\u2014]\s*)?[\u2713\u2714]\s*$/.test(line)) {
      status = 'done'; line = line.replace(/\s*(?:[-\u2013\u2014]\s*)?[\u2713\u2714]\s*$/, '');
    }
    line = line.trim().replace(/^['"\u201c\u201d]+|['"\u201c\u201d]+$/g, '').trim();
    if (!line || line.length > 180) return null;
    const dueAt = status === 'done' ? null : parseDueAt(raw);
    return { title: line, status: status || 'todo', ...(dueAt ? { dueAt } : {}) };
  }

  function parse(text) {
    const tasks = []; let skipped = 0;
    for (const line of String(text || '').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const task = parseLine(line);
      if (task) tasks.push(task); else skipped++;
    }
    return { tasks, skipped };
  }

  function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  window.TaskImport = { parse, parseDueAt, formatDateTime };
})();
