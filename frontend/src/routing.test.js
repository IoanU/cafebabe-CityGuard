import { findRoute, segmentDistance, distance } from './routing';
import graph from './walking-graph.json';
const small = { nodes: [[44,26],[44,26.002],[44.002,26],[44.002,26.002]], edges: [[0,1],[1,3],[0,2],[2,3]] };
test('routes along edges and detours around blocked segments', () => {
  const normal = findRoute(small,small.nodes[0],small.nodes[3]);
  const [a,b] = normal.coordinates;
  const report = {latitude:(a[0]+b[0])/2,longitude:(a[1]+b[1])/2};
  const detour = findRoute(small,small.nodes[0],small.nodes[3],[report]);
  expect(detour.coordinates).not.toEqual(normal.coordinates);
  for(let i=1;i<detour.coordinates.length;i++) expect(segmentDistance([report.latitude,report.longitude],detour.coordinates[i-1],detour.coordinates[i])).toBeGreaterThan(15);
});
test('rejects blocked, out-of-area, invalid and identical endpoints', () => {
  expect(() => findRoute(small,small.nodes[0],small.nodes[3],[{latitude:44,longitude:26}])).toThrow(/No walking route/);
  expect(() => findRoute(small,[45,27],small.nodes[3])).toThrow(/loaded walking network/);
  expect(() => findRoute(small,[NaN,26],small.nodes[3])).toThrow(/valid/);
  expect(() => findRoute(small,small.nodes[0],small.nodes[0])).toThrow(/farther apart/);
});
test('real OSM route follows actual edges', () => {
  const end = graph.nodes.reduce((best,p) => distance(graph.nodes[0],p)>distance(graph.nodes[0],best)?p:best);
  const route = findRoute(graph,graph.nodes[0],end);
  expect(graph.nodes.length).toBeGreaterThan(100);
  expect(route.meters).toBeGreaterThan(300);
  for(let i=1;i<route.coordinates.length;i++) {
    const a=graph.nodes.indexOf(route.coordinates[i-1]),b=graph.nodes.indexOf(route.coordinates[i]);
    expect(graph.edges.some(([x,y]) => (x===a&&y===b)||(x===b&&y===a))).toBe(true);
  }
});
test('snaps to connected nearby paths when the closest network points are disconnected',()=>{
  const graph={nodes:[[44,26],[44,26.0002],[44.0001,26],[44.0001,26.002]],edges:[[0,1],[2,3]]};
  expect(findRoute(graph,graph.nodes[0],graph.nodes[3]).coordinates).toEqual([graph.nodes[2],graph.nodes[3]]);
});
