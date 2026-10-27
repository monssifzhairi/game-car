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
const errors=[];const page=await browser.newPage({viewport:{width:960,height:640}});page.on('pageerror',e=>errors.push(e.message));

const state=()=>page.evaluate(async()=>{const {useGame}=await import('/src/store/gameStore.ts');return useGame.getState();});
const waitPhase=phase=>page.waitForFunction(phase=>window.testGame.getState().phase===phase,phase,{timeout:180000});
try {
await page.addInitScript(()=>{if(!localStorage.getItem('luxury-drive-v1'))localStorage.setItem('luxury-drive-v1',JSON.stringify({quality:'low',sound:false}));});
await page.goto(process.env.TEST_URL||'http://localhost:5173');await page.evaluate(async()=>{window.testGame=(await import('/src/store/gameStore.ts')).useGame;});
await page.getByRole('button',{name:'Start driving',exact:true}).waitFor();
assert.equal(await page.locator('canvas').count(),1);
await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Toggle sound'}).click();await page.getByRole('button',{name:'All set'}).click();console.log('PASS menu, settings and canvas render');
await page.getByRole('button',{name:'Start driving',exact:true}).click();await waitPhase('PLAYING');
await page.keyboard.down('w');await page.waitForFunction(()=>window.testGame.getState().hud.speed>100,null,{timeout:90000});await page.keyboard.up('w');
let s=await state();assert.ok(s.hud.distance>0&&s.hud.score>0);console.log('PASS countdown, keyboard acceleration, distance and score');
await page.keyboard.down('d');assert.equal(await page.evaluate(async()=>{const {input}=await import('/src/game/engine.ts');return input.right;}),true);await page.keyboard.up('d');
await page.keyboard.down('Shift');const nitroBefore=(await state()).hud.nitro;await page.waitForFunction(()=>window.testGame.getState().hud.nitro<90,null,{timeout:90000});await page.keyboard.up('Shift');assert.ok((await state()).hud.nitro<nitroBefore);console.log('PASS steering input and nitro consumption');
await page.keyboard.press('p');await waitPhase('PAUSED');const paused=(await state()).hud;await page.waitForTimeout(800);assert.equal((await state()).hud.distance,paused.distance);assert.equal((await state()).hud.score,paused.score);await mkdir('.playwright',{recursive:true});await page.addStyleTag({content:'.overlay{display:none!important}'});await page.screenshot({path:'.playwright/desktop-game.png',timeout:120000});await page.evaluate(()=>document.querySelectorAll('style').forEach(el=>{if(el.textContent==='.overlay{display:none!important}')el.remove();}));await page.getByRole('button',{name:'Resume drive'}).click();await waitPhase('PLAYING');console.log('PASS pause freezes simulation and resume works');
await page.keyboard.down('a');await page.keyboard.down('w');await waitPhase('GAME_OVER');await page.keyboard.up('a');await page.keyboard.up('w');s=await state();assert.equal(s.hud.health,0);assert.ok(s.save.runs.length===1);assert.ok(s.save.best>0);assert.ok(await page.getByRole('button',{name:'One more drive'}).isVisible());console.log('PASS actual barrier collisions, recovery, game over and local run saving');
await page.keyboard.press('r');await waitPhase('COUNTDOWN');assert.equal((await state()).hud.distance,0);console.log('PASS instant R restart resets run');
await page.evaluate(async()=>{const {useGame}=await import('/src/store/gameStore.ts');useGame.getState().setPhase('MENU');});
await page.reload();await page.evaluate(async()=>{window.testGame=(await import('/src/store/gameStore.ts')).useGame;});await page.getByRole('button',{name:'Start driving',exact:true}).waitFor();assert.ok((await state()).save.best>0);console.log('PASS high score persists after reload');
await page.getByRole('button',{name:/Records/}).click();assert.ok(await page.getByRole('dialog').getByText('Your finest drives.').isVisible());await page.getByRole('button',{name:'Close dialog'}).click();
await page.getByRole('button',{name:'Explore garage'}).click();await waitPhase('GARAGE');await page.getByRole('button',{name:/02 Sovereign/}).click();assert.equal((await state()).save.selected,'sovereign');assert.ok(await page.getByRole('button',{name:/Earn.*more/}).isDisabled());
// Seed earned currency to exercise the actual purchase UI without farming runs.
await page.evaluate(async()=>{const {useGame}=await import('/src/store/gameStore.ts');useGame.getState().updateSave({cash:20000});});
await page.getByRole('button',{name:'Add to collection'}).click();assert.ok((await state()).save.unlocked.includes('sovereign'));await page.getByRole('button',{name:/British emerald/}).click();assert.ok((await state()).save.cosmetics.includes('#155b48'));assert.equal((await state()).save.paint,'#155b48');await page.getByRole('button',{name:'Rotate vehicle right'}).click();assert.equal(await page.evaluate(async()=>{const {presentation}=await import('/src/game/engine.ts');return presentation.rotation;}),.5);console.log('PASS garage preview, unlock gating, purchase, paint purchase and rotation');
await page.getByRole('button',{name:'Drive Sovereign'}).click();await waitPhase('PLAYING');assert.equal((await state()).save.selected,'sovereign');
await page.evaluate(async()=>{const {useGame}=await import('/src/store/gameStore.ts');useGame.getState().setPhase('MENU');});
await mkdir('.playwright',{recursive:true});
// Stop requesting new frames after the current one to avoid starving software-rendered screenshots.
await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});await page.waitForTimeout(500);await page.screenshot({path:'.playwright/desktop.png',timeout:120000});
await page.close();
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});mobile.on('pageerror',e=>errors.push(e.message));await mobile.addInitScript(()=>localStorage.setItem('luxury-drive-v1',JSON.stringify({quality:'low',sound:false})));await mobile.goto('http://localhost:5173');await mobile.evaluate(async()=>{window.testGame=(await import('/src/store/gameStore.ts')).useGame;});await mobile.getByRole('button',{name:'Start driving',exact:true}).click();await mobile.waitForFunction(()=>window.testGame.getState().phase==='PLAYING',null,{timeout:180000});
const gas=mobile.getByRole('button',{name:'Gas',exact:true}),left=mobile.getByRole('button',{name:'Left',exact:true});assert.ok(await gas.isVisible());assert.ok(await left.isVisible());
// Real multi-touch events exercise pointer capture and two simultaneous fingers.
const cdp=await mobile.context().newCDPSession(mobile);const gb=await gas.boundingBox(),lb=await left.boundingBox();const g={x:gb.x+gb.width/2,y:gb.y+gb.height/2,id:11},l={x:lb.x+lb.width/2,y:lb.y+lb.height/2,id:12};
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[g]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[g,l]});assert.equal(await mobile.evaluate(async()=>{const {input}=await import('/src/game/engine.ts');return input.accelerate&&input.left;}),true);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[g]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await mobile.evaluate(async()=>{const {input}=await import('/src/game/engine.ts');return input.accelerate||input.left;}),false);console.log('PASS responsive mobile controls, simultaneous touch input and cancellation');
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.evaluate(()=>{window.requestAnimationFrame=()=>0;});await mobile.waitForTimeout(500);await mobile.screenshot({path:'.playwright/mobile-game.png',timeout:120000});await mobile.close();assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
} finally {await browser.close();}
