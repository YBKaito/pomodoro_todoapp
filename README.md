# Focus Dock

Blue Windows task board, Pomodoro timer, and floating sticky note.

## Run

Requires Node.js 24 and npm. In this repository:

```sh
npm ci
npm test
npm start
```

The approved UI is `src/desktop.html`. For browser development, serve `src` and open `/desktop.html`. Its browser mini view stays inside the tab. Electron adds the native always-on-top window.

## Windows app

```sh
npm run dist:win
```

Output: `dist/Focus-Dock-1.1.0-Windows.exe` (portable, Windows x64). Run it without installation. The build is unsigned; Windows may display an unknown publisher warning. Native Windows testing is still required.

Click **Mini sticky note** to open the always-on-top companion. Drag its header to move it. Hide/show the note independently of the timer. Tasks are shared with the main board and saved in this Windows account's local app data. An active focus session locks both the mini dismiss button and native window close, including while paused. Complete the session or return to **Main app → Stop / reset** to unlock. The OS can still terminate the application. This is not a system-wide lock.

Closing the main app exits. Timer deadlines and tasks survive reopening, but completion messages are only processed while open. The mini window stays above normal windows, not the Windows lock screen or secure desktop. No account, backend, or startup-at-login setting is required.

## GitHub downloads

**Build Windows app** can be run manually from GitHub Actions; download its **Focus-Dock-Windows** artifact. Pushing a `v*` tag builds and publishes a GitHub release with the executable attached. This publishes repository content and a release, so publication is a separate action from local building.

## Validation

Node tests exercise timer helpers and native window geometry/close locking with a mocked Electron runtime. The approved standalone renderer has also been checked in Chromium for task creation, checkbox completion, mini collapse, focus pause/close locking, main stop/unlock, and reload persistence. Browser testing does not establish native Windows behavior.
