import {strict as assert} from 'node:assert';
import {mkdir} from 'node:fs/promises';
import {createBrowser,attachRenderer,freezeAndCapture} from './browser-support.mjs';
const browser=await createBrowser(),errors=[],requests=[];
const page=await browser.newPage({viewport:{width:800,height:600}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(r.url().includes('/models/'))requests.push(r.url());});
const origin=process.env.TEST_URL||'http://localhost:5173';
try{
 await mkdir('.playwright',{recursive:true});await page.addInitScript(()=>localStorage.setItem('luxury-drive-v1',JSON.stringify({quality:'low',sound:false})));await page.goto(origin);await page.locator('.model-loading-overlay').waitFor({state:'hidden',timeout:120000});await attachRenderer(page);
 await page.getByRole('button',{name:'Explore garage'}).click();
 for(const [name,root,source,wheels] of [['BMW M3 E30','BMW_M3_E30','bmw',4],['Mercedes W140','Mercedes_W140','mrc140',0],['Toyota Supra','Toyota_Supra','supra',4]]){
  await page.locator('.vehicle-row').filter({hasText:name}).click();await page.locator('.model-loading-overlay').waitFor({state:'hidden',timeout:120000});
  const details=await page.evaluate(root=>{const model=window.testRender.scene.getObjectByName(root);let tris=0,textures=new Set();model.traverse(o=>{if(o.isMesh){tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const value of Object.values(o.material))if(value?.isTexture&&value.image?.width)textures.add(value.uuid);}});return {asset:model.userData.asset,wheels:model.userData.wheelCount,tris,textures:textures.size};},root);
  assert.equal(details.asset,`3d/${source}.glb`);assert.equal(details.wheels,wheels);assert.ok(details.tris>25000);assert.ok(details.textures>=2);
  if(source==='mrc140')assert.ok(await page.locator('.original-finish-note').isVisible());
  await page.getByRole('button',{name:`Drive ${name}`,exact:true}).click();await page.locator('.phase-playing').waitFor({timeout:90000});await page.keyboard.down('w');await page.waitForFunction(()=>window.testGame.getState().hud.speed>115,null,{timeout:90000});
  const before=await page.evaluate(root=>window.testRender.scene.getObjectByName(root).parent.parent.position.x,root);await page.keyboard.down('d');await page.waitForFunction(({root,before})=>window.testRender.scene.getObjectByName(root).parent.parent.position.x>before+.1,{root,before},{timeout:60000});await page.keyboard.up('d');
  if(wheels){assert.ok(await page.evaluate(root=>{let spinning=false;window.testRender.scene.getObjectByName(root).traverse(o=>{if(o.name.endsWith('_rolling')&&Math.abs(o.rotation.x)>.1)spinning=true;});return spinning;},root));}
  await page.keyboard.down('Shift');await page.waitForFunction(()=>window.testGame.getState().hud.nitro<96,null,{timeout:60000});assert.equal(await page.evaluate(()=>window.testRender.scene.getObjectByName('vehicle_nitro_exhaust').visible),true);await page.keyboard.up('Shift');await page.keyboard.up('w');
  await page.keyboard.press('p');const distance=await page.evaluate(()=>window.testGame.getState().hud.distance);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.testGame.getState().hud.distance),distance);
  console.log('PASS actual imported model, garage, driving, steering, nitro and pause:',name,details);
  if(source!=='supra'){await page.getByRole('button',{name:/^Main menu/}).click();await page.getByRole('button',{name:'Explore garage'}).click();}
 }
 assert.equal(requests.filter(u=>u.includes('/models/bmw.glb')).length,1);console.log('PASS selected-model lazy loading and cached BMW reuse');
 await page.getByRole('button',{name:'Resume drive'}).click();await page.keyboard.down('a');await page.keyboard.down('w');await page.locator('.phase-game_over').waitFor({timeout:180000});await page.keyboard.up('a');await page.keyboard.up('w');assert.equal(await page.evaluate(()=>window.testGame.getState().hud.health),0);await page.keyboard.press('r');await page.locator('.phase-countdown').waitFor();assert.equal(await page.evaluate(()=>window.testGame.getState().hud.distance),0);console.log('PASS real collision sequence, saved results and instant restart with imported Supra');
 await page.evaluate(()=>window.testGame.getState().setPhase('GARAGE'));await freezeAndCapture(page,'.playwright/supra-garage.png');await page.close();
 const retry=await browser.newPage({viewport:{width:640,height:480}});await retry.addInitScript(()=>localStorage.setItem('luxury-drive-v1',JSON.stringify({quality:'low',sound:false})));
 await retry.route('**/models/bmw.glb',r=>r.fulfill({status:404,body:'missing'}));await retry.goto(origin);await retry.getByRole('heading',{name:'The vehicle couldn’t load.'}).waitFor({timeout:120000});assert.ok(await retry.getByText(/HTTP 404/).isVisible());await retry.unroute('**/models/bmw.glb');await retry.getByRole('button',{name:'Retry original model'}).click();await retry.locator('.model-loading-overlay').waitFor({state:'hidden',timeout:120000});await retry.close();console.log('PASS failed deployment asset reports an error; retry loads the original optimized BMW');
 assert.deepEqual(errors,[]);console.log('PASS no browser/WebGL runtime errors during normal three-car gameplay');
}finally{await browser.close();}
