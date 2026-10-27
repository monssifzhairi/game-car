import {chromium} from 'playwright';
import bundled from '@sparticuz/chromium';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export async function createBrowser(){
 const dir=await mkdtemp(join(tmpdir(),'luxury-browser-'));await writeFile(join(dir,'libs.tar'),brotliDecompressSync(readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')));execFileSync('tar',['xf',join(dir,'libs.tar'),'-C',dir]);
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||await bundled.executablePath(),args:[...bundled.args.filter(a=>!['--single-process','--in-process-gpu'].includes(a)),'--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true,env:{...process.env,LD_LIBRARY_PATH:join(dir,'lib')+':'+(process.env.LD_LIBRARY_PATH||'')}});
 const close=browser.close.bind(browser);browser.close=async()=>{await close();await rm(dir,{recursive:true,force:true});};return browser;
}
export async function attachRenderer(page){
 await page.evaluate(async()=>{const text=await(await fetch('/src/game/GameScene.tsx')).text();const fiber=text.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)?.[1],store=text.match(/from ["']([^"']*store\/gameStore\.ts[^"']*)["']/)?.[1];if(!fiber||!store)throw new Error('Could not inspect the running dev renderer.');const {_roots}=await import(fiber);window.testGame=(await import(store)).useGame;window.testRoot=()=>_roots.get(document.querySelector('canvas'))?.store.getState();});
 await page.waitForFunction(()=>!!window.testRoot(),null,{timeout:90000});await page.evaluate(()=>{window.testRender=window.testRoot();});
}
export async function freezeAndCapture(page,path){await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});await page.waitForTimeout(400);await page.screenshot({path,timeout:120000});}
