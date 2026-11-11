import {BAND_BY_ID,clamp,logT,formatHz,valueRange} from './core.mjs';
export function palette(t,mode='inferno'){
  t=clamp(t);
  const stops=mode==='ocean'?[[0,[5,9,21]],[.25,[18,41,98]],[.5,[34,147,188]],[.74,[113,233,210]],[1,[246,255,234]]]:
    mode==='mono'?[[0,[8,13,28]],[1,[242,250,255]]]:
    [[0,[8,8,20]],[.15,[37,12,74]],[.36,[117,23,102]],[.55,[214,51,82]],[.76,[255,159,62]],[1,[255,251,192]]];
  for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){
    const [ta,a]=stops[i-1],[tb,b]=stops[i];const f=(t-ta)/(tb-ta);
    return a.map((v,j)=>Math.round(v+(b[j]-v)*f));
  }
  return stops.at(-1)[1];
}
export function prepCanvas(c){const dpr=Math.min(2,window.devicePixelRatio||1),rect=c.getBoundingClientRect(),w=Math.max(320,Math.round(rect.width)),h=Math.max(180,Math.round(rect.height));if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h};}
export function drawSpectrum(canvas,frames,bandId,{gain=0,paletteName='inferno'}={}){
  const {ctx,w,h}=prepCanvas(canvas),band=BAND_BY_ID[bandId];const left=56,right=17,top=22,bottom=36,plotW=w-left-right,plotH=h-top-bottom;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#09111d';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(166,198,224,.12)';ctx.lineWidth=1;
  for(let i=0;i<=5;i++){let y=top+plotH*i/5;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();}
  for(let i=0;i<=6;i++){let x=left+plotW*i/6;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,h-bottom);ctx.stroke();}
  ctx.font='11px ui-monospace, monospace';ctx.fillStyle='#91a4b9';
  for(let i=0;i<=6;i++){const hz=10**(Math.log10(band.min)+(Math.log10(band.max)-Math.log10(band.min))*i/6);const text=formatHz(hz);ctx.fillText(text,left+plotW*i/6-Math.min(29,text.length*3),h-12);}
  const frame=frames.at(-1);if(!frame||frame.type!=='spectrum')return drawEmpty(ctx,w,h,'NO SPECTRAL FRAME FOR THIS BAND');
  const {min,max}=valueRange(frame.values),span=Math.max(1e-8,max-min);
  ctx.fillStyle='#91a4b9';for(let i=0;i<=5;i++){const y=top+plotH*i/5;ctx.fillText((max-span*i/5).toFixed(1),6,y+3);}
  ctx.fillStyle='#4c6178';ctx.fillText('LEVEL',8,12);
  const sorted=frame.frequencies_hz.map((hz,i)=>({hz,v:frame.values[i]})).sort((a,b)=>a.hz-b.hz);
  ctx.lineWidth=2;ctx.shadowColor='#71eade';ctx.shadowBlur=9;ctx.strokeStyle='#7be9d9';ctx.beginPath();
  sorted.forEach((p,i)=>{const x=left+logT(p.hz,band)*plotW;const y=top+(1-clamp((p.v-min)/span+gain/100))*plotH; i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.stroke();ctx.shadowBlur=0;
  ctx.lineTo(left+logT(sorted.at(-1).hz,band)*plotW,h-bottom);ctx.lineTo(left+logT(sorted[0].hz,band)*plotW,h-bottom);ctx.closePath();
  const grd=ctx.createLinearGradient(0,top,0,h-bottom);grd.addColorStop(0,'rgba(77,233,205,.20)');grd.addColorStop(1,'rgba(77,233,205,.01)');ctx.fillStyle=grd;ctx.fill();
  ctx.fillStyle='#c3d7e8';ctx.font='12px ui-monospace, monospace';ctx.fillText(`${frame.unit} · ${frame.frequencies_hz.length} bins · ${frame.source}`,left,12);
}
export function drawWaterfall(canvas,frames,bandId,{gain=0,paletteName='inferno'}={}){
  const {ctx,w,h}=prepCanvas(canvas),band=BAND_BY_ID[bandId];const left=56,right=14,top=30,bottom=35,plotW=w-left-right,plotH=h-top-bottom;
  ctx.fillStyle='#070e17';ctx.fillRect(0,0,w,h);ctx.fillStyle='#91a4b9';ctx.font='11px ui-monospace,monospace';
  const N=Math.min(frames.length,180);const rows=frames.slice(-N).filter(f=>f.type==='spectrum');
  if(!rows.length)return drawEmpty(ctx,w,h,'NO FRAMES · RUN DEMO, IMPORT DATA OR CONNECT SENSOR');
  const nW=Math.min(900,Math.round(plotW)),nH=Math.max(1,rows.length),off=document.createElement('canvas');off.width=nW;off.height=nH;
  const oc=off.getContext('2d'),img=oc.createImageData(nW,nH);
  rows.forEach((f,j)=>{
    const values=f.values,{min,max}=valueRange(values),range=Math.max(1e-8,max-min);
    for(let i=0;i<nW;i++){
      const hz=10**(Math.log10(band.min)+(Math.log10(band.max)-Math.log10(band.min))*(i/(nW-1)));
      let k=0,hi=f.frequencies_hz.length-1;while(k<hi){const m=(k+hi+1)>>1;if(f.frequencies_hz[m]<=hz)k=m;else hi=m-1;}
      const near=Math.min(f.frequencies_hz.length-1,k),next=Math.min(f.frequencies_hz.length-1,k+1);
      const v=(hz<f.frequencies_hz[0]||hz>f.frequencies_hz.at(-1))?min:((f.values[near]+f.values[next])/2);
      const intensity=clamp(((v-min)/range)*.88+gain/100);const [r,g,b]=palette(intensity,paletteName);
      const ii=((nH-1-j)*nW+i)*4;img.data[ii]=r;img.data[ii+1]=g;img.data[ii+2]=b;img.data[ii+3]=255;
    }
  });oc.putImageData(img,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(off,left,top,plotW,plotH);ctx.imageSmoothingEnabled=true;
  ctx.strokeStyle='#263a4e';ctx.strokeRect(left,top,plotW,plotH);
  for(let i=0;i<=6;i++){const hz=10**(Math.log10(band.min)+(Math.log10(band.max)-Math.log10(band.min))*i/6);const t=formatHz(hz);ctx.fillText(t,left+i*plotW/6-Math.min(25,t.length*3),h-11);}
  ctx.fillText('LATEST',8,top+9);ctx.fillText(`${rows.length} FRAMES`,8,h-bottom-2);
  ctx.fillText(`FALSE COLOR · ${rows.at(-1).unit} · latest row at bottom`,left,16);
}
export function drawImage(canvas,frame,{paletteName='inferno',gain=0}={}){
  const {ctx,w,h}=prepCanvas(canvas);ctx.fillStyle='#08111b';ctx.fillRect(0,0,w,h);
  if(!frame||frame.type!=='image')return drawEmpty(ctx,w,h,'NO 2D SENSOR IMAGE FOR THIS BAND');
  const off=document.createElement('canvas');off.width=frame.width;off.height=frame.height;const oc=off.getContext('2d'),im=oc.createImageData(frame.width,frame.height);
  const {min:lo,max:hi}=valueRange(frame.pixels),range=Math.max(1e-6,hi-lo);
  frame.pixels.forEach((v,i)=>{const [r,g,b]=palette(clamp((v-lo)/range+gain/100),paletteName);im.data.set([r,g,b,255],i*4)});oc.putImageData(im,0,0);
  const margin=20,scale=Math.min((w-margin*2)/frame.width,(h-margin*2)/frame.height),dw=frame.width*scale,dh=frame.height*scale;
  ctx.imageSmoothingEnabled=false;ctx.drawImage(off,(w-dw)/2,(h-dh)/2,dw,dh);ctx.imageSmoothingEnabled=true;
  ctx.fillStyle='#d8e7f5';ctx.font='12px ui-monospace, monospace';ctx.fillText(`FALSE COLOR | ${frame.width}×${frame.height} | ${lo.toFixed(1)}–${hi.toFixed(1)} ${frame.unit}`,20,20);
  ctx.fillText(frame.source,20,h-12);
}
export function drawEmpty(ctx,w,h,msg){ctx.fillStyle='#7b91a6';ctx.font='13px ui-monospace, monospace';ctx.textAlign='center';ctx.fillText(msg,w/2,h/2);ctx.textAlign='left';}
