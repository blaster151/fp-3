const all = require('../allTS');
console.log(Object.keys(all).slice(0,20));
const g = all.GraphTerminal;
console.log('GraphTerminal.nodes typeof', typeof g.nodes);
console.log('GraphTerminal.nodes isArray', Array.isArray(g.nodes));
console.log('GraphTerminal.nodes.has', g.nodes.has);
console.log('GraphTerminal.nodes length', g.nodes.length);
console.log('GraphTerminal.nodes entries', g.nodes);
