/**
 * Captures README screenshots with headless Chrome at fixed phone dimensions.
 *
 * Why a standalone script instead of the in-editor browser:
 * the VS Code browser pane resizes its layout viewport independently of any
 * emulation override, which produced captures with large empty margins on the
 * right. Headless Chrome with an explicit --window-size is deterministic.
 *
 * Usage: node scripts/capture-screenshots.js
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const WIDTH = 390;
const HEIGHT = 844;
const SCALE = 2;

const BASE = 'http://localhost:8081';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');

/**
 * Reuse an already-installed Chrome/Edge instead of downloading a Playwright
 * browser build (~150 MB). Avoids a large download on every playwright bump.
 */
function findBrowserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

/** Realistic sample content so screenshots read like a used app. */
function seedNotes() {
  const hour = 3_600_000;
  const day = 86_400_000;
  const now = Date.now();
  return [
    {
      id: 'seed-1',
      title: 'Grocery list',
      body: 'Milk, eggs, bread, tomatoes, rice, cooking oil',
      createdAt: now - hour,
      updatedAt: now - 1_500_000,
    },
    {
      id: 'seed-2',
      title: 'App ideas',
      body: 'Habit tracker with streaks. Recipe planner with photo upload. Offline-first field app with sync.',
      createdAt: now - 2 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'seed-3',
      title: 'Meeting notes',
      body: 'Client wants a booking app with push notifications. Follow up Friday.',
      createdAt: now - 4 * day,
      updatedAt: now - 3 * day,
    },
  ];
}

/**
 * Verifies the app surface is full-bleed with no letterbox margin.
 *
 * Works on a DARK-mode capture: the app paints near-black across the whole
 * viewport, while any margin outside the app stays the browser's white default.
 * So a white edge column means a margin. (In light mode this test is impossible,
 * because the app background and a margin are both white.)
 */
async function verifyFullBleed(browser, file) {
  const base64 = fs.readFileSync(file).toString('base64');
  const page = await browser.newPage();

  await page.setContent(`<img id="shot" src="data:image/png;base64,${base64}">`);
  const result = await page.evaluate(async () => {
    const img = document.getElementById('shot');
    if (!img.complete) await new Promise((resolve) => { img.onload = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    /** Average luminance of a vertical strip of given width at an x offset. */
    const stripLuma = (xStart, stripW) => {
      let total = 0;
      let count = 0;
      for (let y = 0; y < height; y += 2) {
        for (let x = xStart; x < xStart + stripW; x++) {
          const i = (y * width + x) * 4;
          total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          count++;
        }
      }
      return Math.round(total / count);
    };

    return {
      width,
      leftLuma: stripLuma(0, 12),
      rightLuma: stripLuma(width - 12, 12),
    };
  });

  await page.close();
  return result;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: findBrowserExecutable(),
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
  });
  const page = await context.newPage();

  // Separate dark-mode context: gives a dark screenshot AND makes the
  // full-bleed check possible (see verifyFullBleed).
  const darkContext = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
  });
  const darkPage = await darkContext.newPage();

  /** Waits until the app has mounted and no loading spinner remains. */
  async function waitForApp(expectText) {
    await page.waitForFunction(
      (t) => {
        const body = document.body.innerText || '';
        const spinners = document.querySelectorAll('[role="progressbar"]').length;
        return body.includes(t) && spinners === 0;
      },
      expectText,
      { timeout: 60_000 },
    );
    // Let React finish layout and any transition settle.
    await page.waitForTimeout(1_200);
  }

  /** Asserts the layout is exactly the phone size, then captures. */
  async function capture(filename) {
    const size = await page.evaluate(() => ({
      w: window.innerWidth,
      h: window.innerHeight,
      rootW: Math.round(document.getElementById('root').getBoundingClientRect().width),
      rootH: Math.round(document.getElementById('root').getBoundingClientRect().height),
    }));

    if (size.w !== WIDTH || size.h !== HEIGHT || size.rootW !== WIDTH || size.rootH !== HEIGHT) {
      throw new Error(
        `Layout mismatch for ${filename}: viewport ${size.w}x${size.h}, root ${size.rootW}x${size.rootH}`,
      );
    }

    await page.screenshot({ path: path.join(OUT, filename) });
    console.log(`  captured ${filename} (${size.w}x${size.h} @${SCALE}x)`);
  }

  try {
    // 1. Notes list
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate((notes) => {
      localStorage.setItem('notes-app/notes/v1', JSON.stringify(notes));
    }, seedNotes());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp('Grocery list');
    await capture('01-notes-list.png');

    // 2. Note editor
    await page.goto(`${BASE}/note/seed-1`, { waitUntil: 'domcontentloaded' });
    await waitForApp('Saved automatically');
    await capture('02-note-editor.png');

    // 3. Empty state
    await page.evaluate(() => localStorage.setItem('notes-app/notes/v1', '[]'));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitForApp('No notes yet');
    await capture('03-empty-state.png');

    // 4. Note not found
    await page.goto(`${BASE}/note/does-not-exist`, { waitUntil: 'domcontentloaded' });
    await waitForApp('Note not found');
    await capture('04-note-not-found.png');

    // 5. Dark mode list (also the full-bleed verification artefact)
    console.log('\nCapturing dark mode:');
    await darkPage.goto(BASE, { waitUntil: 'domcontentloaded' });
    await darkPage.evaluate((notes) => {
      localStorage.setItem('notes-app/notes/v1', JSON.stringify(notes));
    }, seedNotes());
    await darkPage.reload({ waitUntil: 'domcontentloaded' });
    await darkPage.waitForFunction(
      () => {
        const body = document.body.innerText || '';
        return body.includes('Grocery list') && document.querySelectorAll('[role="progressbar"]').length === 0;
      },
      null,
      { timeout: 60_000 },
    );
    await darkPage.waitForTimeout(1_200);

    const darkSize = await darkPage.evaluate(() => ({
      w: window.innerWidth,
      h: window.innerHeight,
      rootW: Math.round(document.getElementById('root').getBoundingClientRect().width),
    }));
    if (darkSize.w !== WIDTH || darkSize.h !== HEIGHT || darkSize.rootW !== WIDTH) {
      throw new Error(`Dark layout mismatch: ${JSON.stringify(darkSize)}`);
    }
    await darkPage.screenshot({ path: path.join(OUT, '05-dark-mode.png') });
    console.log(`  captured 05-dark-mode.png (${darkSize.w}x${darkSize.h} @${SCALE}x)`);

    console.log('\nVerifying full-bleed (no letterbox margin) using the dark capture:');
    const { width, leftLuma, rightLuma } = await verifyFullBleed(
      browser,
      path.join(OUT, '05-dark-mode.png'),
    );

    // App is near-black in dark mode; a margin would be the white default.
    const ok = leftLuma < 60 && rightLuma < 60;
    console.log(
      `  ${ok ? 'OK  ' : 'FAIL'} 05-dark-mode.png (${width}px) -> edge luma: ` +
        `left ${leftLuma}, right ${rightLuma} (must be dark if full-bleed)`,
    );
    if (!ok) throw new Error('Detected a blank side margin in the capture');

    console.log('\nAll screenshots captured, size-verified and checked for margins.');
  } finally {
    await browser.close();
  }}

main().catch((error) => {
  console.error('Screenshot capture failed:', error.message);
  process.exit(1);
});
