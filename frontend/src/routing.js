// Coordinates throughout this module are [latitude, longitude].
export function distance(a, b) {
  const rad = Math.PI / 180;
  const x = (b[1] - a[1]) * rad * Math.cos((a[0] + b[0]) * rad / 2);
  const y = (b[0] - a[0]) * rad;
  return Math.hypot(x, y) * 6371000;
}

export function segmentDistance(point, a, b) {
  const scale = Math.cos(point[0] * Math.PI / 180);
  const project = p => [(p[1] - point[1]) * scale * 111195, (p[0] - point[0]) * 111195];
  const [ax, ay] = project(a), [bx, by] = project(b);
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function findRoute(graph, start, end, reports = []) {
  if (!graph.nodes.length) throw new Error('The walking network is empty.');
  for (const p of [start, end]) {
    if (!p || p.length !== 2 || !p.every(Number.isFinite)) throw new Error('Choose a valid start and destination.');
  }
  const nearest = point => graph.nodes.reduce((best, p, i) => distance(point, p) < distance(point, graph.nodes[best]) ? i : best, 0);
  let source = nearest(start), target = nearest(end);
  if (distance(start, graph.nodes[source]) > 75 || distance(end, graph.nodes[target]) > 75) {
    throw new Error('Choose points closer to the loaded walking network (within 75 m of a network point).');
  }
  if (source === target) throw new Error('Choose two points farther apart on the walking network.');
  const obstacles = reports.map(r => [Number(r.latitude), Number(r.longitude)]).filter(p => p.every(Number.isFinite));
  const adjacent = graph.nodes.map(() => []);
  for (const [a, b] of graph.edges) {
    if (obstacles.some(p => segmentDistance(p, graph.nodes[a], graph.nodes[b]) <= 15)) continue;
    const cost = distance(graph.nodes[a], graph.nodes[b]);
    adjacent[a].push([b, cost]); adjacent[b].push([a, cost]);
  }
  // The geometrically closest nodes can be on disconnected paths (e.g. an
  // isolated mapped sidewalk). Snap to a nearby connected pair in that case.
  const components = new Int32Array(graph.nodes.length).fill(-1);
  for (let i = 0; i < adjacent.length; i++) {
    if (!adjacent[i].length || components[i] !== -1) continue;
    const queue = [i]; components[i] = i;
    for (let j = 0; j < queue.length; j++) for (const [n] of adjacent[queue[j]]) {
      if (components[n] === -1) { components[n] = i; queue.push(n); }
    }
  }
  const canSnap = (point, n) => !obstacles.some(o => segmentDistance(o, point, graph.nodes[n]) <= 15);
  if (components[source] === -1 || components[source] !== components[target] || !canSnap(start, source) || !canSnap(end, target)) {
    const candidates = point => graph.nodes.flatMap((n, i) => {
      const meters = distance(point,n);
      return meters <= 75 && components[i] !== -1 && canSnap(point,i) ? [{i,meters}] : [];
    });
    const starts = candidates(start), ends = candidates(end);
    let best = Infinity;
    for (const a of starts) for (const b of ends) {
      if (a.i !== b.i && components[a.i] === components[b.i] && a.meters + b.meters < best) {
        best = a.meters + b.meters; source = a.i; target = b.i;
      }
    }
    if (!Number.isFinite(best)) throw new Error('No walking route is available in the loaded network with the current obstacles.');
  }
  const open = new Set([source]), costs = new Map([[source, 0]]), previous = new Map();
  while (open.size) {
    let current, score = Infinity;
    for (const n of open) {
      const f = costs.get(n) + distance(graph.nodes[n], graph.nodes[target]);
      if (f < score) { score = f; current = n; }
    }
    if (current === target) {
      const path = [target];
      while (previous.has(path[0])) path.unshift(previous.get(path[0]));
      return { coordinates: path.map(n => graph.nodes[n]), meters: costs.get(target) };
    }
    open.delete(current);
    for (const [next, weight] of adjacent[current]) {
      const cost = costs.get(current) + weight;
      if (cost < (costs.get(next) ?? Infinity)) {
        costs.set(next, cost); previous.set(next, current); open.add(next);
      }
    }
  }
  throw new Error('No walking route is available between these points after excluding reported obstacles.');
}
