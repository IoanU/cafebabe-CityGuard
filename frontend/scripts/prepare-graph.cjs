// Input: OSM API JSON (not a rendered map). Rebuild with:
// node scripts/prepare-graph.cjs path/to/osm-map.json
const fs = require('fs');
const path = require('path');
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const nodes = new Map(input.elements.filter(e => e.type === 'node').map(e => [e.id, [e.lat, e.lon]]));
const allowed = new Set(['footway', 'path', 'pedestrian', 'living_street']);
const edges = [], adjacency = new Map();
for (const way of input.elements.filter(e => e.type === 'way')) {
  const t = way.tags || {};
  if (!allowed.has(t.highway) || ['no', 'private'].includes(t.foot) ||
      (['no', 'private'].includes(t.access) && !['yes', 'designated', 'permissive'].includes(t.foot)) || t.wheelchair === 'no') continue;
  for (let i = 1; i < way.nodes.length; i++) {
    const a = way.nodes[i - 1], b = way.nodes[i];
    if (!nodes.has(a) || !nodes.has(b)) continue;
    edges.push([a, b]);
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a).push(b); adjacency.get(b).push(a);
  }
}
const seen = new Set(); let largest = [];
for (const start of adjacency.keys()) {
  if (seen.has(start)) continue;
  const component = [start]; seen.add(start);
  for (let i = 0; i < component.length; i++) for (const next of adjacency.get(component[i])) {
    if (!seen.has(next)) { seen.add(next); component.push(next); }
  }
  if (component.length > largest.length) largest = component;
}
const indices = new Map(largest.map((id, i) => [id, i]));
const graph = {
  attribution: '© OpenStreetMap contributors, ODbL 1.0',
  source: 'https://api.openstreetmap.org/api/0.6/map.json?bbox=26.084,44.434,26.097,44.442',
  extractedAt: new Date().toISOString(),
  description: 'Largest connected walking component near Cișmigiu. Steps, explicit wheelchair=no and private access excluded. Accessibility is not verified.',
  nodes: largest.map(id => nodes.get(id)),
  edges: edges.filter(([a,b]) => indices.has(a) && indices.has(b)).map(([a,b]) => [indices.get(a), indices.get(b)]),
};
if (graph.nodes.length < 100) throw new Error('Unexpectedly small walking network');
fs.writeFileSync(path.join(__dirname, '../src/walking-graph.json'), JSON.stringify(graph));
console.log(`${graph.nodes.length} nodes, ${graph.edges.length} edges`);
