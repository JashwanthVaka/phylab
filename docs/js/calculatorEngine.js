import { escapeHTML } from './utils.js';
const tools = [
  ['SUVAT','v = u + at',[['u','Initial velocity',0],['a','Acceleration',0],['t','Time',0]],v=>v.u+v.a*v.t,'m s⁻¹'],
  ['Projectile motion','R = v²sin(2θ)/g',[['v','Launch speed',20],['theta','Angle (°)',45],['g','Gravity',9.81]],v=>v.v**2*Math.sin(2*v.theta*Math.PI/180)/v.g,'m'],
  ['Momentum','p = mv',[['m','Mass',1],['v','Velocity',1]],v=>v.m*v.v,'kg m s⁻¹'],
  ['Energy','Eₖ = ½mv²',[['m','Mass',1],['v','Velocity',1]],v=>.5*v.m*v.v**2,'J'],
  ['Electric fields','E = F/q',[['F','Force',1],['q','Charge',1]],v=>v.F/v.q,'N C⁻¹'],
  ['Capacitance','C = Q/V',[['Q','Charge',1],['V','Potential difference',1]],v=>v.Q/v.V,'F'],
  ['Magnetic force','F = Bqv sinθ',[['B','Flux density',1],['q','Charge',1],['v','Speed',1],['theta','Angle (°)',90]],v=>v.B*v.q*v.v*Math.sin(v.theta*Math.PI/180),'N'],
  ['Circular motion','F = mv²/r',[['m','Mass',1],['v','Speed',1],['r','Radius',1]],v=>v.m*v.v**2/v.r,'N'],
  ['Gravitation','F = GMm/r²',[['M','Primary mass',5.972e24],['m','Secondary mass',1],['r','Distance',6.371e6]],v=>6.674e-11*v.M*v.m/v.r**2,'N'],
  ['Thermodynamics','ΔU = Q − W',[['Q','Heat added',1],['W','Work done by system',1]],v=>v.Q-v.W,'J'],
  ['Gas laws','PV = nRT',[['n','Amount (mol)',1],['T','Temperature (K)',273],['V','Volume (m³)',1]],v=>v.n*8.314*v.T/v.V,'Pa'],
  ['Waves','v = fλ',[['f','Frequency',1],['lambda','Wavelength',1]],v=>v.f*v.lambda,'m s⁻¹'],
  ['Quantum','E = hf',[['f','Frequency',1e14]],v=>6.626e-34*v.f,'J'],
  ['Nuclear','N = N₀(1/2)^(t/T½)',[['N0','Initial nuclei',1000],['t','Time',1],['half','Half-life',1]],v=>v.N0*Math.pow(.5,v.t/v.half),'nuclei']
].map(([name,formula,fields,calculate,unit],id)=>({id,name,formula,fields,calculate,unit}));
export const calculatorTools = () => tools;
export function renderCalculator(selected='SUVAT') { const tool=tools.find(item=>item.name===selected)||tools[0]; return `<article class="calculator-card"><div class="calculator-head"><span class="tag">PHYSICS CALCULATOR</span><select data-calculator-select>${tools.map(item=>`<option ${item.name===tool.name?'selected':''}>${escapeHTML(item.name)}</option>`).join('')}</select></div><code>${escapeHTML(tool.formula)}</code><form data-calculator-form data-calculator-id="${tool.id}">${tool.fields.map(([key,label,value])=>`<label>${escapeHTML(label)}<input required type="number" step="any" name="${escapeHTML(key)}" value="${value}"></label>`).join('')}<button class="button">Calculate</button></form><output class="calculator-result" aria-live="polite">Enter values and calculate.</output></article>`; }
export function bindCalculator(render) { const select=document.querySelector('[data-calculator-select]');select?.addEventListener('change',()=>render(select.value));const form=document.querySelector('[data-calculator-form]');form?.addEventListener('submit',event=>{event.preventDefault();const tool=tools[Number(form.dataset.calculatorId)];const values=Object.fromEntries(new FormData(form).entries());Object.keys(values).forEach(key=>values[key]=Number(values[key]));const result=tool.calculate(values);form.parentElement.querySelector('output').textContent=Number.isFinite(result)?`${result.toPrecision(5)} ${tool.unit}`:'Check your values; this calculation is undefined.';}); }
