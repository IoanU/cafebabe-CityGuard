import bundled from './walking-graph.json';
import { distance } from './routing';

const cache = [];
export const MAX_DISTANCE = 2000;
const walkingWays = ['footway','path','pedestrian','living_street','residential','service','unclassified','tertiary','secondary','primary'];
export function graphFromOsm(osm) {
  const positions = new Map(osm.elements.filter(e => e.type === 'node').map(n => [n.id, [n.lat, n.lon]]));
  const nodes = [], indices = new Map(), edges = [];
  const allowed = new Set(walkingWays);
  const index = id => {
    if (!indices.has(id)) { indices.set(id,nodes.length); nodes.push(positions.get(id)); }
    return indices.get(id);
  };
  for (const way of osm.elements.filter(e => e.type === 'way')) {
    const t = way.tags || {};
    if (!allowed.has(t.highway) || ['no','private'].includes(t.foot) || t.wheelchair === 'no' ||
      (['no','private'].includes(t.access) && !['yes','designated','permissive'].includes(t.foot))) continue;
    for(let i=1;i<way.nodes.length;i++) {
      const a=way.nodes[i-1],b=way.nodes[i];
      if(positions.has(a)&&positions.has(b)) edges.push([index(a),index(b)]);
    }
  }
  if(!edges.length) throw new Error('No mapped walking network found here. Choose points closer to mapped paths or streets.');
  return {nodes,edges};
}

export async function loadNetwork(start,end) {
  if(distance(start,end)>MAX_DISTANCE) throw new Error('Local routing supports points up to 2 km apart in a straight line. Choose closer points.');
  if(Math.max(Math.abs(start[0]),Math.abs(end[0]))>80) throw new Error('Local routing currently supports latitudes between 80°S and 80°N.');
  const near = point => bundled.nodes.some(n=>distance(n,point)<=75);
  if(near(start)&&near(end)) return bundled;
  for(const item of cache) if([start,end].every(([lat,lon])=>lat>=item.bounds[1]&&lat<=item.bounds[3]&&lon>=item.bounds[0]&&lon<=item.bounds[2])) return item.graph;
  // Include 300 m around endpoints so nearby detours can be explored.
  const padLat=300/111195,padLon=padLat/Math.cos((start[0]+end[0])/2*Math.PI/180);
  const bounds=[Math.min(start[1],end[1])-padLon,Math.min(start[0],end[0])-padLat,Math.max(start[1],end[1])+padLon,Math.max(start[0],end[0])+padLat];
  if(bounds[0]<-180||bounds[2]>180) throw new Error('Local routing does not support areas across the international date line.');
  const [west,south,east,north]=bounds.map(value=>Number(value.toFixed(6)));
  const europe=west>=-12&&east<=43&&south>=35&&north<=72;
  const endpoint=process.env.REACT_APP_OVERPASS_URL || (europe ? 'https://ovp.dresel.systems/api/interpreter' : 'https://overpass.private.coffee/api/interpreter');
  const query=`[out:json][timeout:20];way["highway"~"^(${walkingWays.join('|')})$"](${south},${west},${north},${east});out body;>;out skel qt;`;
  const url=new URL(endpoint);url.searchParams.set('data',query);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try {
    const response=await fetch(url.toString(),{signal:controller.signal});
    if(!response.ok) throw new Error('OSM data could not be downloaded. Try again later or use the included Cișmigiu network.');
    const osm=await response.json();
    if(osm.remark) throw new Error('Overpass could not complete the data request. Try closer points or try again later.');
    const graph=graphFromOsm(osm);
    cache.unshift({bounds,graph});cache.splice(3);
    return graph;
  } catch(e) {
    if(e.name==='AbortError') throw new Error('OSM download timed out. Choose closer points or try again later.');
    if(e instanceof TypeError) throw new Error('Could not reach the OSM data provider. Check your connection or try again later.');
    throw e;
  } finally {clearTimeout(timer);}
}
