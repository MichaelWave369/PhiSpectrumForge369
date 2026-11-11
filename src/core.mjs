/** SpectrumForge369 scientific data model; no hardware or browser dependencies. */
export const SPEED_OF_LIGHT = 299_792_458;
export const BANDS = [
  {id:'radio',      name:'RADIO',      min:3e3,  max:3e8,  color:'#6ba6ff', desc:'Long-wavelength electromagnetic signals. Antennas and software-defined radios can measure parts of this range.'},
  {id:'microwave',  name:'MICROWAVE',  min:3e8,  max:3e11, color:'#64e7df', desc:'Radar, communications and microwave radiation. Requires a frequency-compatible receiver.'},
  {id:'infrared',   name:'INFRARED',   min:3e11, max:4e14, color:'#ff9e6d', desc:'Beyond red visible light. Thermal cameras generally detect long-wave IR; near-IR sensors cover a different sub-band.'},
  {id:'visible',    name:'VISIBLE',    min:4e14, max:7.9e14,color:'#e6c7ff', desc:'Light the human visual system can detect. Camera images are not full spectral measurements.'},
  {id:'ultraviolet',name:'ULTRAVIOLET',min:7.9e14,max:3e16,color:'#b68cff', desc:'Shorter wavelengths than violet. Specialized UV-sensitive optics and detectors are required.'},
  {id:'xray',       name:'X-RAY',      min:3e16, max:3e19,color:'#f880cc', desc:'High-energy radiation. Use professionally calibrated systems; not a DIY emitter project.'},
  {id:'gamma',      name:'GAMMA',      min:3e19, max:3e25,color:'#ffe18e', desc:'Extremely high-energy radiation. Dedicated radiation instruments report events or energy bins.'}
];
export const BAND_BY_ID = Object.fromEntries(BANDS.map(b=>[b.id,b]));
export const toHz = (nm)=> SPEED_OF_LIGHT/(nm * 1e-9);
export const toNm = (hz)=> SPEED_OF_LIGHT/hz * 1e9;
export const clamp = (v, min=0, max=1)=>Math.min(max,Math.max(min,v));
export function valueRange(values){let min=Infinity,max=-Infinity;for(const v of values){if(v<min)min=v;if(v>max)max=v;}return {min,max};}
export const logT = (freq,band)=>clamp((Math.log10(freq)-Math.log10(band.min))/(Math.log10(band.max)-Math.log10(band.min)));
export function formatHz(x){
  if (!Number.isFinite(x) || x<=0) return '—';
  const units=[['YHz',1e24],['ZHz',1e21],['EHz',1e18],['PHz',1e15],['THz',1e12],['GHz',1e9],['MHz',1e6],['kHz',1e3],['Hz',1]];
  const [unit,scale]=units.find(([,scale])=>x>=scale) || units.at(-1);
  return `${(x/scale).toLocaleString('en-US',{maximumFractionDigits:2})} ${unit}`;
}
export function bandForHz(hz){ return BANDS.find((b,i)=>hz>=b.min && (hz < b.max || i===BANDS.length-1))?.id ?? null; }
export function normalizeFrame(raw,{origin='file',receivedAt=Date.now()}={}){
  if(!raw || typeof raw!=='object') throw new Error('Expected a JSON object');
  const type=raw.type||raw.kind;
  if(type==='image'){
    const width=Number(raw.width),height=Number(raw.height);
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>2e6) throw new Error('Invalid image dimensions (max 2 million pixels)');
    if(!Array.isArray(raw.pixels)||raw.pixels.length!==width*height||raw.pixels.some(v=>!Number.isFinite(Number(v)))) throw new Error('Image pixels must be finite numbers matching width×height');
    const band=raw.band||'infrared';
    if(!BAND_BY_ID[band]) throw new Error('Unknown image band');
    return {type:'image',band,unit:String(raw.unit||'relative'),width,height,pixels:raw.pixels.map(Number),origin,receivedAt,source:String(raw.source||origin).slice(0,90),timestamp:String(raw.timestamp||new Date(receivedAt).toISOString())};
  }
  if(type!=='spectrum') throw new Error('Supported frame types: spectrum, image');
  const frequencies=raw.frequencies_hz ?? (Array.isArray(raw.wavelengths_nm)?raw.wavelengths_nm.map(toHz):null);
  if(!Array.isArray(frequencies)||!Array.isArray(raw.values)||frequencies.length<1||frequencies.length!==raw.values.length||frequencies.length>8192) throw new Error('Spectrum requires matched frequencies_hz (or wavelengths_nm) and values arrays, length 1–8192');
  const points=frequencies.map((f,i)=>({hz:Number(f),value:Number(raw.values[i])}));
  if(points.some(p=>!Number.isFinite(p.hz)||p.hz<=0||!Number.isFinite(p.value))) throw new Error('Spectrum contains an invalid numeric value');
  points.sort((a,b)=>a.hz-b.hz);
  const unit=String(raw.unit||'relative').slice(0,30);
  return {type:'spectrum',frequencies_hz:points.map(p=>p.hz),values:points.map(p=>p.value),unit,origin,receivedAt,source:String(raw.source||origin).slice(0,90),timestamp:String(raw.timestamp||new Date(receivedAt).toISOString())};
}
export function sliceIntoBands(frame){
  if(frame.type==='image')return [{...frame}];
  return BANDS.map(b=>{
    const indexes=frame.frequencies_hz.map((hz,i)=>(hz>=b.min && hz<=b.max)?i:-1).filter(i=>i>=0);
    return indexes.length ? {...frame,band:b.id,frequencies_hz:indexes.map(i=>frame.frequencies_hz[i]),values:indexes.map(i=>frame.values[i])}:null;
  }).filter(Boolean);
}
export function parseInputText(text, filename='data.jsonl'){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  if(!lines.length)throw new Error('File is empty');
  if(filename.toLowerCase().endsWith('.csv')){
    const rows=lines.map(l=>l.split(',').map(x=>x.trim()));
    const header=rows.shift().map(x=>x.toLowerCase());
    const fi=header.indexOf('frequency_hz'),wi=header.indexOf('wavelength_nm'),vi=header.indexOf('value');
    if((fi<0&&wi<0)||vi<0)throw new Error('CSV needs frequency_hz,value or wavelength_nm,value headers');
    const frequencies_hz=[],values=[];
    for(const row of rows){ const x=Number(fi>=0?row[fi]:toHz(Number(row[wi]))),v=Number(row[vi]);if(Number.isFinite(x)&&x>0&&Number.isFinite(v)){frequencies_hz.push(x);values.push(v);}}
    if(!frequencies_hz.length)throw new Error('No valid numeric CSV rows');
    return [{type:'spectrum',frequencies_hz,values,unit:'relative',source:filename}];
  }
  let records=[];
  if(lines.length===1 && lines[0].startsWith('[')){
    const arr=JSON.parse(lines[0]);if(!Array.isArray(arr))throw new Error('Expected a JSON array');records=arr;
  }else records=lines.map((line,i)=>{try{return JSON.parse(line)}catch{throw new Error(`Invalid JSON at line ${i+1}`)}});
  return records;
}
export function createDemoFrame(bandId,tick=0){
  const band=BAND_BY_ID[bandId];if(!band)throw new Error('Unknown band');
  const n=170,frequencies_hz=[],values=[];
  const center=[0.24,0.54,0.77], widths=[0.028,0.07,0.014];
  for(let i=0;i<n;i++){
    const x=i/(n-1),logMin=Math.log10(band.min),logMax=Math.log10(band.max);
    frequencies_hz.push(10**(logMin+(logMax-logMin)*x));
    let v=-100+6*Math.sin(x*31+tick*.11)+3*Math.sin(x*103-tick*.08);
    for(let k=0;k<3;k++){
      const c=center[k]+0.04*Math.sin(tick*(0.012+k*.009)+k);
      v+=(25+8*Math.sin(tick*.037+k))*Math.exp(-.5*((x-c)/widths[k])**2);
    }
    values.push(Number(v.toFixed(2)));
  }
  return normalizeFrame({type:'spectrum',frequencies_hz,values,unit:'synthetic dB',source:'Deterministic demo generator'},{origin:'simulation'});
}
export function createDemoImage(tick=0){
  const width=120,height=90,pixels=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const blob=Math.exp(-(((x-42-8*Math.sin(tick*.03))**2)/(2*17**2)+((y-45)**2)/(2*24**2)));
    const blob2=Math.exp(-(((x-92)**2)/(2*12**2)+((y-24)**2)/(2*10**2)));
    pixels.push(Number((19+46*blob+21*blob2+2*Math.sin(x*.23+y*.17+tick*.05)).toFixed(2)));
  }
  return normalizeFrame({type:'image',band:'infrared',width,height,pixels,unit:'synthetic °C',source:'Synthetic thermal scene'},{origin:'simulation'});
}
