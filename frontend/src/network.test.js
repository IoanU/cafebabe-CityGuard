import { graphFromOsm, loadNetwork } from './network';
import { findRoute } from './routing';
const start=[46.77,23.59],end=[46.771,23.591];
const osm={elements:[
  {type:'node',id:1,lat:start[0],lon:start[1]},
  {type:'node',id:2,lat:end[0],lon:end[1]},
  {type:'node',id:3,lat:46.7705,lon:23.5901},
  {type:'way',id:4,nodes:[1,2],tags:{highway:'footway'}},
  {type:'way',id:5,nodes:[1,3],tags:{highway:'steps'}},
  {type:'way',id:6,nodes:[2,3],tags:{highway:'service',access:'private'}},
]};
test('OSM graph excludes stairs and private roads',()=>{
  expect(graphFromOsm(osm)).toEqual({nodes:[start,end],edges:[[0,1]]});
});
test('downloads and caches a graph outside the included area',async()=>{
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>osm});
  const graph=await loadNetwork(start,end);
  expect(findRoute(graph,start,end).meters).toBeGreaterThan(100);
  expect(await loadNetwork(end,start)).toBe(graph);
  expect(fetch).toHaveBeenCalledTimes(1);
  const request=new URL(fetch.mock.calls[0][0]);
  expect(request.pathname).toBe('/api/interpreter');
  expect(request.searchParams.get('data')).toMatch(/\[out:json\].*way.*footway/);
  await expect(loadNetwork(start,[47,24])).rejects.toThrow(/2 km/);
  expect(fetch).toHaveBeenCalledTimes(1);
});
