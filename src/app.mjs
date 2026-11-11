import {BANDS,BAND_BY_ID,formatHz,normalizeFrame,sliceIntoBands,createDemoFrame,createDemoImage,parseInputText,valueRange} from './core.mjs';
import {drawSpectrum,drawWaterfall,drawImage} from './render.mjs';
const $=s=>document.querySelector(s), data=Object.fromEntries(BANDS.map(b=>[b.id,[]]));
const state={band:'visible',view:'waterfall',paletteName:'inferno',gain:0,active:'simulation',running:false,tick:0,serialPort:null,serialReader:null,cameraStream:null,lastFrame:null};
let demoTimer=null,toastTimer=null,records=[];
const bands=$('#bandButtons');
for(const b of BANDS){const btn=document.createElement('button');btn.className='band';btn.dataset.band=b.id;btn.style.setProperty('--band',b.color);btn.innerHTML=`<strong>${b.name}</strong><small>${formatHz(b.min)}+</small>`;btn.addEventListener('click',()=>setBand(b.id));bands.append(btn);}
function notify(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4300);}
function stopDemo(){if(demoTimer!==null){clearInterval(demoTimer);demoTimer=null;}state.running=false;$('#demoBtn').textContent='◉ START SYNTHETIC DEMO';}
function setBand(id){state.band=id;const b=BAND_BY_ID[id];document.querySelectorAll('.band').forEach(el=>el.classList.toggle('active',el.dataset.band===id));$('#bandName').textContent=b.name;$('#bandRange').textContent=`${formatHz(b.min)} – ${formatHz(b.max)} (approximate boundaries)`;$('#bandDescription').textContent=b.desc;updateStats();draw();}
function changeStatus(origin,source=''){state.active=origin;const sim=origin==='simulation',camera=origin==='camera';$('#status').className='status '+(sim?'simulated':'measured');$('#status').textContent=sim?'● SIMULATED DATA':camera?'● VISIBLE CAMERA':origin==='serial'?'● LIVE SENSOR INPUT':'● IMPORTED DATA';$('#modeLabel').textContent=sim?'SYNTHETIC DEMO':camera?'VISIBLE CAMERA':origin==='serial'?'SERIAL LIVE':'FILE IMPORT';$('#modeLabel').style.color=sim?'#ffca87':'#75ead6';$('#lastSeen').textContent=source||'No hardware connected';$('#measurementType').textContent=sim?'SYNTHETIC':camera?'CAMERA PIXELS':origin==='file'?'IMPORTED / UNVERIFIED':'HARDWARE STREAM';$('#sensorLabel').textContent=sim?'NONE ATTACHED':source||'USER INPUT';$('#canvasWatermark').textContent=sim?'SYNTHETIC · NOT A PHYSICAL MEASUREMENT':camera?'VISIBLE ONLY · STANDARD RGB CAMERA':origin==='file'?'IMPORTED · DATA PROVENANCE UNVERIFIED':'LIVE DEVICE STREAM · USER-SUPPLIED';}
function ingest(input,origin='file'){
  const frame=normalizeFrame(input,{origin});const slices=sliceIntoBands(frame);
  if(!slices.length)throw new Error('No frequencies matched the supported band ranges');
  for(const sample of slices){const list=data[sample.band];list.push(sample);if(list.length>180)list.splice(0,list.length-180);state.lastFrame=sample;}
  records.push(frame);if(records.length>1500)records.splice(0,records.length-1500);
  updateStats();draw();return slices;
}
function updateStats(){
  const frames=data[state.band];const f=frames.at(-1);$('#frameCount').textContent=frames.length;$('#binCount').textContent=f?.type==='spectrum'?f.values.length:f?.type==='image'?`${f.width}×${f.height}`:0;
  const v=f?.type==='spectrum'?f.values:f?.type==='image'?f.pixels:null;
  const range=v?.length?valueRange(v):null;$('#levelRange').textContent=range?`${range.min.toFixed(1)} / ${range.max.toFixed(1)} ${f.unit}`:'—';
  $('#timestamp').textContent=f?new Date(f.receivedAt).toLocaleTimeString():'—';
  $('#coverage').textContent=f?.type==='spectrum'?`${formatHz(f.frequencies_hz[0])} → ${formatHz(f.frequencies_hz.at(-1))}`:f?.type==='image'?'2D sensor array':'—';
  $('#sourceReadout').textContent=`SOURCE: ${f?.source||'NO INPUT'}`;
}
function draw(){const f=data[state.band],opts={paletteName:state.paletteName,gain:state.gain};if(state.view==='spectrum')drawSpectrum($('#monitor'),f.filter(x=>x.type==='spectrum'),state.band,opts);else if(state.view==='image')drawImage($('#monitor'),f.filter(x=>x.type==='image').at(-1),opts);else drawWaterfall($('#monitor'),f.filter(x=>x.type==='spectrum'),state.band,opts);}
function demoTick(){state.tick++;
  if(state.band==='infrared'&&state.view==='image') ingest(createDemoImage(state.tick),'simulation');
  else ingest(createDemoFrame(state.band,state.tick),'simulation');
}
function startDemo(){stopDemo();stopCamera();state.active='simulation';changeStatus('simulation','DETERMINISTIC GENERATOR');demoTick();demoTimer=setInterval(demoTick,175);state.running=true;$('#demoBtn').textContent='◼ STOP SYNTHETIC DEMO';}
$('#demoBtn').addEventListener('click',()=>{if(state.running){stopDemo();notify('Demo stopped. Existing frames retained.')}else startDemo();});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{state.view=btn.dataset.view;document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===btn));if(state.cameraStream)stopCamera();draw();}));
$('#palette').addEventListener('change',e=>{state.paletteName=e.target.value;draw();});$('#gain').addEventListener('input',e=>{state.gain=Number(e.target.value);$('#gainLabel').textContent=state.gain>0?'+'+state.gain:state.gain;draw();});
$('#importBtn').addEventListener('click',()=>$('#fileInput').click());$('#fileInput').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;try{
    if(file.size>12e6)throw new Error('Maximum import size is 12 MB');
    const parsed=parseInputText(await file.text(),file.name);const normalized=parsed.map(raw=>normalizeFrame(raw,{origin:'file'}));
    stopDemo();stopCamera();for(const b of BANDS)data[b.id]=[];records=[];
    let band=null,count=0;for(const frame of normalized){const slices=ingest(frame,'file');if(!band)band=slices[0].band;count++;}
    changeStatus('file',file.name);if(band)setBand(band);notify(`Imported ${count} frames from ${file.name}. Source authenticity is not independently verified.`);
  }catch(err){notify(`Import error: ${err.message}`);}finally{e.target.value='';}
});
async function stopSerial(){if(state.serialReader){try{await state.serialReader.cancel()}catch{}state.serialReader=null;}if(state.serialPort){try{await state.serialPort.close()}catch{}state.serialPort=null;}$('#serialBtn').textContent='⌁ CONNECT SERIAL SENSOR';}
$('#serialBtn').addEventListener('click',async()=>{
 if(state.serialPort){await stopSerial();notify('Serial disconnected.');return;}
 if(!('serial' in navigator)){notify('Web Serial requires a compatible desktop browser on localhost or HTTPS. Chrome/Edge are recommended.');return;}
 try{
   const port=await navigator.serial.requestPort();await port.open({baudRate:115200});stopDemo();stopCamera();state.serialPort=port;
   changeStatus('serial','SERIAL / 115200 BAUD');$('#serialBtn').textContent='◼ DISCONNECT SERIAL SENSOR';
   notify('Connected. Waiting for newline-delimited JSON frames from your microcontroller.');
   const decoder=new TextDecoder();let buffer='';
   (async()=>{try{while(port.readable&&state.serialPort===port){const reader=port.readable.getReader();state.serialReader=reader;try{for(;;){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});if(buffer.length>2e6){buffer='';notify('Discarded oversized serial input');}let pos;while((pos=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,pos).trim();buffer=buffer.slice(pos+1);if(!line)continue;try{ingest(JSON.parse(line),'serial');}catch(err){notify(`Sensor frame rejected: ${err.message}`);}}}}finally{reader.releaseLock();state.serialReader=null;}break;}}catch(err){if(state.serialPort===port)notify(`Serial read stopped: ${err.message}`);}finally{if(state.serialPort===port)await stopSerial();}})();
 }catch(err){notify(`Serial connection: ${err.message}`);}
});
function stopCamera(){if(state.cameraStream){state.cameraStream.getTracks().forEach(t=>t.stop());state.cameraStream=null;}$('#camera').hidden=true;$('#cameraBtn').textContent='◎ VISIBLE CAMERA VIEW';}
$('#cameraBtn').addEventListener('click',async()=>{
 if(state.cameraStream){stopCamera();draw();return;}
 if(!navigator.mediaDevices?.getUserMedia){notify('Camera permission requires localhost/HTTPS and a supported browser.');return;}
 try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});stopDemo();state.cameraStream=stream;setBand('visible');const video=$('#camera');video.srcObject=stream;video.hidden=false;$('#cameraBtn').textContent='◼ STOP VISIBLE CAMERA';changeStatus('camera','STANDARD RGB CAMERA · NOT A SPECTROMETER');notify('Camera provides visible RGB imagery only, not UV, infrared, or other spectrum measurements.');}catch(err){notify(`Camera: ${err.message}`);}
});
function saveBlob(content,name,type){const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('#exportBtn').addEventListener('click',()=>{if(!records.length){notify('No frames to export.');return;}const result=records.map(({origin,receivedAt,...f})=>JSON.stringify({...f,origin,receivedAt})).join('\n')+'\n';saveBlob(result,'spectrumforge369-session.jsonl','application/x-ndjson');notify(`Exported ${records.length} frames with origin metadata.`);});
$('#snapshotBtn').addEventListener('click',()=>{if(state.cameraStream){notify('Camera view snapshot is not supported; select a plot first.');return;}$('#monitor').toBlob(blob=>blob?saveBlob(blob,'spectrumforge369-visualization.png','image/png'):notify('Snapshot failed'),'image/png');});
$('#clearBtn').addEventListener('click',()=>{stopDemo();stopCamera();for(const b of BANDS)data[b.id]=[];records=[];state.tick=0;updateStats();draw();notify('Session data cleared. No recordings retained.');});
window.addEventListener('resize',draw);window.addEventListener('beforeunload',()=>{stopDemo();stopCamera();if(state.serialPort)stopSerial();});
setBand('visible');startDemo();
