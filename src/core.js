(function (root) {
  const durations = { focus: 25, short: 5, long: 15 };
  function remaining(timer, now = Date.now()) {
    return timer.running ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : timer.remaining;
  }
  function nextMode(mode, completed) { return mode === 'focus' ? (completed % 4 === 0 ? 'long' : 'short') : 'focus'; }
  function validTask(task) {
    return task && typeof task.id === 'string' && typeof task.title === 'string' && task.title.trim() && ['todo', 'doing', 'done'].includes(task.status);
  }
  const api = { durations, remaining, nextMode, validTask };
  if (typeof module !== 'undefined') module.exports = api;
  else root.FocusCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
