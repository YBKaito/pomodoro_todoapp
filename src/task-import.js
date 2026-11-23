(() => {
  const doneWords = new Set(['done', 'complete', 'completed', 'finished']);
  const statusOf = word => doneWords.has(word.toLowerCase().replace(/\s+/g, ' ')) ? 'done' : 'todo';
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
    if (prefix) {
      status = statusOf(prefix[1]);
      line = line.slice(prefix[0].length);
    }
    const suffix = line.match(/\s*(?:[-\u2013\u2014:]\s*|\[\s*|\(\s*)?(todo|to[ -]?do|open|pending|done|complete|completed|finished)(?:\s*[\])])?\s*$/i);
    if (suffix) {
      status = statusOf(suffix[1]);
      line = line.slice(0, suffix.index).replace(/[\s\-\u2013\u2014:]+$/, '');
    } else if (/\s*(?:[-\u2013\u2014]\s*)?[\u2713\u2714]\s*$/.test(line)) {
      status = 'done';
      line = line.replace(/\s*(?:[-\u2013\u2014]\s*)?[\u2713\u2714]\s*$/, '');
    }
    line = line.trim().replace(/^['"\u201c\u201d]+|['"\u201c\u201d]+$/g, '').trim();
    if (!line || line.length > 180) return null;
    return { title: line, status: status || 'todo' };
  }
  function parse(text) {
    const tasks = [];
    let skipped = 0;
    for (const line of String(text || '').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const task = parseLine(line);
      if (task) tasks.push(task); else skipped++;
    }
    return { tasks, skipped };
  }
  window.TaskImport = { parse };
})();
