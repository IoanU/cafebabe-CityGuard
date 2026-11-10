const { test, expect } = require('@playwright/test');
const fs = require('fs');
const graph = require('../src/walking-graph.json');
test('local routing, obstacle detour, photo persistence and Pages reload', async ({ page }) => {
  await page.setViewportSize({width:1280,height:1200});
  const errors=[], backendRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/localhost:8000|openrouteservice/.test(r.url()))backendRequests.push(r.url());});
  await page.route('**/*.tile.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')}));
  const {findRoute,distance} = await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(require.resolve('../src/routing.js'),'utf8')).toString('base64'));
  const nearest=p=>graph.nodes.reduce((best,n)=>distance(p,n)<distance(p,best)?n:best);
  const start=nearest([44.4365,26.089]), end=nearest([44.439,26.091]);
  const baseline=findRoute(graph,start,end);
  let obstacle;
  for(const p of baseline.coordinates.slice(2,-2)) {
    try {const alt=findRoute(graph,start,end,[{latitude:p[0],longitude:p[1]}]);if(alt.meters>baseline.meters+5){obstacle=p;break;}} catch {}
  }
  expect(obstacle).toBeTruthy();
  await page.goto('./#/map');
  await expect(page.getByRole('heading',{name:'Walking routes',exact:true})).toBeVisible();
  const map=page.locator('.leaflet-container');
  const project=([lat,lon])=>{const s=256*2**16,sin=Math.sin(lat*Math.PI/180);return [(lon+180)/360*s,(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*s];};
  async function pick(p){await map.scrollIntoViewIfNeeded();const box=await map.boundingBox(),a=project(p),c=project([44.4375,26.09]);await page.mouse.click(box.x+box.width/2+a[0]-c[0],box.y+box.height/2+a[1]-c[1]);}
  await pick(start);await pick(end);
  await page.getByRole('button',{name:'Calculate route'}).click();
  await expect(page.getByText(/^Route: /)).toContainText(`${Math.round(baseline.meters)} m`);
  await page.getByRole('button',{name:'Report obstacle',exact:true}).click();await pick(obstacle);
  const dialog=page.getByRole('dialog');
  await dialog.locator('[name=name]').fill('Browser test obstacle');
  await dialog.locator('[name=category]').selectOption('blocked_sidewalk');
  await dialog.locator('[name=description]').fill('Test blockage on the walking path');
  await dialog.locator('[name=image]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  await dialog.getByRole('button',{name:'Save report'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText:'saved reports'})).toContainText('1 saved reports');
  await expect(page.getByText(/^Route: /)).toHaveCount(0);
  await page.getByRole('button',{name:'Calculate route'}).click();
  const text=await page.getByText(/^Route: /).textContent();expect(Number(text.match(/Route: (\d+)/)[1])).toBeGreaterThan(Math.round(baseline.meters));
  await page.reload();
  await expect(page.getByRole('status').filter({hasText:'saved reports'})).toContainText('1 saved reports');
  const saved=await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('cityguard-local',1);r.onsuccess=()=>{const q=r.result.transaction('reports').objectStore('reports').getAll();q.onsuccess=()=>resolve({count:q.result.length,photo:q.result[0].images[0].size,type:q.result[0].images[0].type});};}));
  expect(saved.count).toBe(1);expect(saved.photo).toBeGreaterThan(0);expect(saved.type).toBe('image/png');
  await pick(start);await pick(end);await page.getByRole('button',{name:'Calculate route'}).click();
  await expect(page.getByText(/^Route: /)).toBeVisible();
  await page.route('**/nominatim.openstreetmap.org/**',r=>r.fulfill({json:[{lat:'45',lon:'27'}]}));
  await page.getByRole('textbox',{name:'Search address'}).fill('outside demo');await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.getByRole('button',{name:'Calculate route'})).toBeEnabled();
  await page.getByRole('button',{name:'Select destination'}).click();await map.click({position:{x:400,y:250}});
  await page.getByRole('button',{name:'Calculate route'}).click();
  await expect(page.getByRole('alert').filter({hasText:'up to 2 km apart'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);expect(backendRequests).toEqual([]);
});

test('downloads a walking graph outside Cișmigiu and routes in the browser', async ({page})=>{
  await page.setViewportSize({width:1280,height:1200});
  await page.route('**/*.tile.openstreetmap.org/**',r=>r.fulfill({status:204}));
  const center=[46.77,23.59],end=[46.771,23.591];
  await page.route('**/nominatim.openstreetmap.org/**',r=>r.fulfill({json:[{lat:center[0],lon:center[1]}]}));
  let requested;
  const pattern='https://ovp.dresel.systems/api/interpreter?**';
  page.on('request',r=>{
    if(new URL(r.url()).hostname!=='ovp.dresel.systems') return;
    requested=new URL(r.url()).searchParams.get('data').match(/\]\(([^)]+)\)/)[1].split(',').map(Number);
  });
  if(!process.env.CITYGUARD_LIVE_OSM) await page.route(pattern,r=>{
    return r.fulfill({json:{elements:[
      {type:'node',id:1,lat:center[0],lon:center[1]},
      {type:'node',id:2,lat:46.7705,lon:23.5905},
      {type:'node',id:3,lat:end[0],lon:end[1]},
      {type:'way',id:4,nodes:[1,2,3],tags:{highway:'footway'}},
    ]}});
  });
  await page.goto('./#/map');
  await page.getByRole('textbox',{name:'Search address'}).fill('Cluj');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.getByRole('button',{name:'Search',exact:true})).toBeEnabled();
  const map=page.locator('.leaflet-container');await map.scrollIntoViewIfNeeded();
  const box=await map.boundingBox();
  const project=([lat,lon])=>{const s=256*2**17,sin=Math.sin(lat*Math.PI/180);return [(lon+180)/360*s,(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*s];};
  const a=project(center),b=project(end);
  await map.click({position:{x:box.width/2,y:box.height/2}});
  await map.click({position:{x:box.width/2+b[0]-a[0],y:box.height/2+b[1]-a[1]}});
  await page.getByRole('button',{name:'Calculate route'}).click();
  await expect(page.getByText(/^Route: /)).toContainText(process.env.CITYGUARD_LIVE_OSM ? /\d+ m/ : '135 m',{timeout:30000});
  expect(requested[1]).toBeLessThan(center[1]);expect(requested[3]).toBeGreaterThan(end[1]);
  expect(requested[0]).toBeLessThan(center[0]);expect(requested[2]).toBeGreaterThan(end[0]);
});

test('test obstacles are reversible and fullscreen retains the map and header', async ({page}) => {
  await page.route('**/*.tile.openstreetmap.org/**', request => request.fulfill({status:204}));
  await page.goto('./#/map');
  const toggle = page.getByRole('button', {name:'Test obstacles'});
  const obstacles = page.locator('.cityguard-test-obstacle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(obstacles).toHaveCount(0);
  await toggle.click();
  await expect(obstacles).toHaveCount(50);
  await expect(page.getByRole('status')).toContainText('0 saved reports');
  await page.getByRole('button', {name:'Enter fullscreen'}).click();
  await expect(toggle).toBeHidden();
  await expect(page.getByRole('link', {name:'CityGuard'})).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(obstacles).toHaveCount(50);
  await page.getByRole('button', {name:'Exit fullscreen'}).click();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(obstacles).toHaveCount(0);
  await page.getByRole('button', {name:'Enter fullscreen'}).click();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeVisible();
});
