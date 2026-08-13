import { escapeHTML, slugify } from './utils.js';
const svg = (content, label) => `<div class="diagram" role="img" aria-label="${escapeHTML(label)}"><svg viewBox="0 0 360 190" aria-hidden="true">${content}</svg><p>${escapeHTML(label)}</p></div>`;
const arrow = (x1,y1,x2,y2,label='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrow)"/><text x="${(x1+x2)/2+5}" y="${(y1+y2)/2-5}">${label}</text>`;
const defs = '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z"/></marker></defs>';
export function diagramFor(lesson) {
  const topic = slugify(`${lesson.title} ${lesson.topicLabel}`);
  if (/force|momentum|rigid/.test(topic)) return svg(`${defs}<rect x="140" y="82" width="80" height="55" rx="4"/>${arrow(180,82,180,32,'N')}${arrow(180,137,180,174,'mg')}${arrow(140,110,70,110,'F')}`, 'Free-body diagram: forces acting on a body.');
  if (/wave|shm/.test(topic)) return svg(`${defs}<path d="M15 95 C45 25 75 25 105 95 S165 165 195 95 S255 25 285 95 S330 165 350 95" fill="none"/><line x1="15" y1="95" x2="350" y2="95" stroke-dasharray="5 5"/>${arrow(55,95,55,28,'A')}<line x1="55" y1="150" x2="195" y2="150"/><text x="110" y="170">λ</text>`, 'Wave diagram showing amplitude and wavelength.');
  if (/electric|field|magnetic/.test(topic)) return svg(`${defs}<circle cx="180" cy="95" r="22"/><text x="173" y="102">+</text>${arrow(155,95,65,95,'E')}${arrow(205,95,295,95,'E')}<line x1="180" y1="70" x2="180" y2="20"/><line x1="180" y1="120" x2="180" y2="170"/>`, 'Field-line diagram around a positive source.');
  if (/nuclear|quantum/.test(topic)) return svg(`${defs}<circle cx="130" cy="95" r="35"/><text x="112" y="101">parent</text>${arrow(170,95,270,95,'α / β / γ')}<circle cx="305" cy="95" r="30"/><text x="288" y="101">daughter</text>`, 'Nuclear transformation diagram.');
  return svg(`${defs}<circle cx="75" cy="120" r="9"/>${arrow(85,120,245,55,'v')}${arrow(85,120,85,48,'u')}${arrow(85,120,245,120,'x')}`, 'Vector diagram showing horizontal and vertical components.');
}
