const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('desktop docking respects display work area and compact mode restores it', async () => {
 let handler, window; const handlers = {}; const events = {};
 const area = { x: 1920, y: 40, width: 1600, height: 860 };
 class Window {
  constructor(options) { this.bounds = {x:2000,y:80,width:options.width,height:options.height}; this.webContents={setWindowOpenHandler(){},on(){}}; window=this; }
  loadFile(){} on(name, fn){ events[name] = fn; } show(){} setMinimumSize(){} setAlwaysOnTop(value){this.top=value;} getBounds(){return {...this.bounds};} setBounds(bounds){this.bounds={...bounds};}
 }
 const electron = { app:{whenReady:()=>({then:fn=>fn()}),on(){}}, BrowserWindow:Window, ipcMain:{handle:(name,fn)=>{ handlers[name]=fn; if(name==='window-mode')handler=fn; }}, screen:{getDisplayMatching:()=>({workArea:area}),on(){}} };
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/main.cjs'),'utf8'), {require:name=>name==='electron'?electron:require(name),__dirname:'/app',process:{platform:'win32'}});
 const event = {sender:window.webContents};
 await handler(event,'right'); assert.equal(window.bounds.x,3070); assert.equal(window.bounds.height,860);
 await handler(event,'compact'); assert.equal(window.top,true); assert.equal(window.bounds.width,350);
 await handlers['focus-lock'](event,true);
 let prevented=false; events.close({preventDefault(){prevented=true;}}); assert.equal(prevented,true);
 await handlers['focus-lock'](event,false); prevented=false; events.close({preventDefault(){prevented=true;}}); assert.equal(prevented,false);
 await handler(event,'note'); assert.equal(window.bounds.height,560);
 await handler(event,'full'); assert.equal(window.top,false); assert.equal(window.bounds.x,3070); assert.equal(window.bounds.width,450);
 await handler(event,'left'); assert.equal(window.bounds.x,1920); assert.equal(window.bounds.y,40);
 const before = window.getBounds(); await handler({sender:{}},'none'); assert.deepEqual(window.bounds,before);
});
