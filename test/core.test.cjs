const { test } = require('node:test');
const assert = require('node:assert/strict');
const { remaining, nextMode, validTask } = require('../src/core.js');
test('timer catches up after sleep and clamps elapsed sessions to zero', () => {
 const timer = { running: true, endsAt: 100000, remaining: 1500 };
 assert.equal(remaining(timer, 70000), 30); assert.equal(remaining(timer, 120000), 0);
});
test('paused timer preserves remaining seconds', () => { assert.equal(remaining({ running: false, remaining: 81 }, 900000), 81); });
test('every fourth focus session gets a long break; breaks return to focus', () => {
 assert.equal(nextMode('focus', 1), 'short'); assert.equal(nextMode('focus', 4), 'long'); assert.equal(nextMode('focus', 8), 'long'); assert.equal(nextMode('short', 1), 'focus'); assert.equal(nextMode('long', 4), 'focus');
});
test('task validation rejects malformed records', () => {
 assert.ok(validTask({ id: 'a', title: 'Task', status: 'doing' }));
 for (const task of [null, {}, { id: 'a', title: ' ', status: 'todo' }, { id: 'a', title: 'Task', status: 'invalid' }]) assert.ok(!validTask(task));
});
