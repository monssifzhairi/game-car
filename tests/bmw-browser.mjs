import { chromium } from 'playwright';
import bundled from '@sparticuz/chromium';
import { strict as assert } from 'node:assert';
import { mkdir,writeFile,mkdtemp } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// The npm-distributed browser allows testing in restricted-network environments.
const dir=await mkdtemp(join(tmpdir(),'luxury-browser-'));
await writeFile(join(dir,'libs.tar'),brotliDecompressSync(readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')));
execFileSync('tar',['xf',join(dir,'libs.tar'),'-C',dir]);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||await bundled.executablePath(),args:[...bundled.args.filter(a=>!['--single-process','--in-process-gpu'].includes(a)),'--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true,env:{...process.env,LD_LIBRARY_PATH:join(dir,'lib')+':'+(process.env.LD_LIBRARY_PATH||'')}});
const errors = [];
const origin = process.env.TEST_URL || 'http://localhost:5173';
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
page.on('pageerror', error => errors.push(error.message));
async function attach(page) {
  await page.evaluate(async () => {
    window.testGame = (await import('/src/store/gameStore.ts')).useGame;
    const text = await (await fetch('/src/game/GameScene.tsx')).text();
    const path = text.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)?.[1];
    if (!path) throw new Error('Could not locate the running Fiber renderer for browser inspection.');
    const { _roots } = await import(path);
    window.testRoot = () => _roots.get(document.querySelector('canvas'))?.store.getState();
  });
  await page.waitForFunction(() => !!window.testRoot(), null, {timeout:90000});
  await page.evaluate(() => { window.testRender=window.testRoot(); window.bmw=()=>window.testRender.scene.getObjectByName('BMW_M3_E30'); });
}
async function phase(name) { await page.waitForFunction(name => window.testGame.getState().phase === name, name, { timeout: 180000 }); }
async function screenshot(page, path) {
  // Pause request scheduling only after the final interactions on this page.
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(500);
  await page.screenshot({ path, timeout: 120000 });
}
try {
  await mkdir('.playwright', { recursive: true });
  await page.addInitScript(() => localStorage.setItem('luxury-drive-v1', JSON.stringify({quality:'low',sound:false})));
  await page.goto(origin);
  await page.locator('canvas').waitFor();
  await attach(page);
  await page.waitForFunction(() => !!window.bmw(), null, {timeout:120000});
  await page.locator('.model-loading-overlay').waitFor({ state: 'hidden' });
  let model = await page.evaluate(() => {
    const root = window.bmw(); let triangles = 0; const textures = new Set();
    root.traverse(object => { if (!object.isMesh) return; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count)/3; for (const value of Object.values(object.material)) if (value?.isTexture && value.image?.width) textures.add(value.uuid); });
    const paint = root.getObjectByProperty('type','Mesh');
    return {name:root.name,asset:root.userData.asset,triangles,textures:textures.size,wheels:root.userData.wheelCount};
  });
  assert.equal(model.name,'BMW_M3_E30');assert.equal(model.asset,'3d/bmw.glb');assert.equal(model.triangles,71421);assert.equal(model.wheels,4);assert.ok(model.textures>=20);console.log('PASS real BMW geometry, all four wheel assemblies, embedded textures and loader readiness',model);
  await page.getByRole('button',{name:'Explore garage'}).click();await phase('GARAGE');
  assert.ok(await page.getByRole('button',{name:'Drive BMW M3 E30'}).isVisible());
  const yaw = await page.evaluate(() => window.bmw().parent.parent.rotation.y);
  await page.getByRole('button',{name:'Rotate vehicle right'}).click();
  await page.waitForFunction(yaw => Math.abs(window.bmw().parent.parent.rotation.y-yaw)>.4,yaw,{timeout:30000});
  await page.evaluate(() => window.testGame.getState().updateSave({cash:500}));
  await page.getByRole('button',{name:/British emerald/}).click();
  assert.equal(await page.evaluate(() => {let color;window.bmw().traverse(object=>{if(object.material?.name==='BMW_E30_M3_PAINT')color=object.material.color.getHexString();});return color;}),'155b48');
  await page.getByRole('button',{name:'BMW factory red'}).click();
  assert.equal(await page.evaluate(() => {let color;window.bmw().traverse(object=>{if(object.material?.name==='BMW_E30_M3_PAINT')color=object.material.color.getHexString();});return color;}),'b81a1a');
  console.log('PASS same actual BMW in garage, rotation, paint selection and original-finish restore');
  await page.getByRole('button',{name:'Drive BMW M3 E30'}).click();await phase('PLAYING');
  await page.keyboard.down('w');await page.waitForFunction(()=>window.testGame.getState().hud.speed>100,null,{timeout:90000});
  const position = await page.evaluate(() => window.bmw().parent.parent.position.x);
  await page.keyboard.down('d');await page.waitForFunction(()=>Math.abs(window.bmw().getObjectByName('BMW_front_right_steering').rotation.y)>.03,null,{timeout:60000});
  assert.ok(await page.evaluate(x => window.bmw().parent.parent.position.x>x,position));await page.keyboard.up('d');
  assert.ok(await page.evaluate(()=>Math.abs(window.bmw().getObjectByName('BMW_front_right_steering_rolling').rotation.x)>.1));
  const alignment=await page.evaluate(()=>{const root=window.bmw();const m=root.matrixWorld.elements;return {frontZ:m[10],y:root.parent.parent.position.y};});assert.ok(alignment.frontZ<0);assert.ok(alignment.y>=0&&alignment.y<.1);
  await page.keyboard.down('Space');await page.keyboard.down('a');await page.waitForFunction(()=>window.testGame.getState().hud.drift>5,null,{timeout:60000});await page.keyboard.up('Space');await page.keyboard.up('a');
  await page.keyboard.down('Shift');await page.waitForFunction(()=>window.testGame.getState().hud.nitro<92,null,{timeout:60000});assert.ok(await page.evaluate(()=>window.testRender.scene.getObjectByName('BMW_nitro_exhaust').visible));await page.keyboard.up('Shift');await page.keyboard.up('w');console.log('PASS BMW is drivable: speed, score, lateral steering, wheel spin/steering, road alignment, drift, nitro and exhaust');
  await page.keyboard.press('p');await phase('PAUSED');
  const paused=await page.evaluate(()=>({distance:window.testGame.getState().hud.distance,wheel:window.bmw().getObjectByName('BMW_front_right_steering_rolling').rotation.x}));
  await page.waitForTimeout(700);assert.deepEqual(await page.evaluate(()=>({distance:window.testGame.getState().hud.distance,wheel:window.bmw().getObjectByName('BMW_front_right_steering_rolling').rotation.x})),paused);
  await page.addStyleTag({content:'.overlay{display:none!important}'});await page.screenshot({path:'.playwright/bmw-driving.png',timeout:120000});await page.evaluate(()=>document.querySelectorAll('style').forEach(el=>{if(el.textContent==='.overlay{display:none!important}')el.remove();}));
  await page.getByRole('button',{name:'Resume drive'}).click();await phase('PLAYING');
  await page.keyboard.down('a');await page.keyboard.down('w');await phase('GAME_OVER');await page.keyboard.up('a');await page.keyboard.up('w');assert.equal(await page.evaluate(()=>window.testGame.getState().hud.health),0);await page.keyboard.press('r');await phase('COUNTDOWN');assert.ok(await page.evaluate(()=>!!window.bmw()));console.log('PASS BMW wheels and simulation pause, real barrier collisions, game over and restart with the actual model');
  await page.evaluate(()=>window.testGame.getState().setPhase('MENU'));await page.waitForTimeout(2500);await screenshot(page,'.playwright/bmw-menu.png');await page.close();

  const retry = await browser.newPage({viewport:{width:800,height:600}});
  await retry.addInitScript(()=>localStorage.setItem('luxury-drive-v1',JSON.stringify({quality:'low',sound:false})));
  await retry.route('**/3d/bmw.glb*',route=>route.request().resourceType()==='fetch'&&!route.request().url().includes('import')?route.abort():route.continue());
  await retry.goto(origin);
  await retry.getByRole('heading',{name:'The BMW couldn’t load.'}).waitFor({timeout:120000});
  assert.ok(await retry.getByRole('button',{name:'Retry BMW model'}).isVisible());
  await retry.unroute('**/3d/bmw.glb*');await retry.getByRole('button',{name:'Retry BMW model'}).click();
  await retry.locator('.model-loading-overlay').waitFor({state:'hidden',timeout:120000});await attach(retry);assert.ok(await retry.evaluate(()=>!!window.bmw()));await retry.close();console.log('PASS explicit failed-GLB error UI and retry of the same real BMW, with no primitive fallback');
  assert.deepEqual(errors,[]);console.log('PASS no uncaught runtime errors in normal BMW gameplay');
} finally {await browser.close();}
