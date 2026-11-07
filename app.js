(() => {
"use strict";
const $ = id => document.getElementById(id);
const video = $("source"), canvas = document.createElement("canvas");
let videoURL = null, musicURL = null, renderedBlob = null, renderedURL = null, recorder = null;
let audioCtx = null, musicElement = null, raf = 0, stopRequested = false;

const ratioSize = ratio => ratio === "9:16" ? [720,1280] : ratio === "1:1" ? [1080,1080] : [1280,720];
const escapeText = s => String(s || "").replace(/\s+/g," ").trim();
const setStatus = s => $("status").textContent = s;
function durationLabel(s){ if(!Number.isFinite(s)) return "unknown duration"; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")} min`; }
function updatePreview(){
  $("pvBrand").textContent = escapeText($("brand").value).toUpperCase() || " ";
  $("pvHeadline").textContent = escapeText($("headline").value) || " ";
  $("pvSub").textContent = escapeText($("subline").value) || " ";
  $("pvCta").textContent = escapeText($("cta").value).toUpperCase() || " ";
  const theme = $("theme").value;
  $("overlay").style.background = theme === "light" ? "linear-gradient(transparent 40%,#1c211bd9)" : theme === "sage" ? "linear-gradient(transparent 40%,#12251edb)" : "linear-gradient(transparent 40%,#07100bd9)";
  $("overlay").style.color = theme === "light" ? "#fff8eb" : "#fff";
}
["brand","headline","subline","cta","theme"].forEach(id => $(id).addEventListener("input",updatePreview));
$("ratio").addEventListener("change", () => updatePreview());

$("videoFile").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0]; if(!file) return;
  if(!file.type.startsWith("video/")) return setStatus("Please select a video file.");
  if(videoURL) URL.revokeObjectURL(videoURL);
  videoURL = URL.createObjectURL(file);
  video.src = videoURL; video.hidden = false; $("empty").hidden = true; $("overlay").hidden = false;
  video.onloadedmetadata = () => {
    $("sourceInfo").textContent = `${video.videoWidth}×${video.videoHeight} · ${durationLabel(video.duration)}`;
    $("end").value = video.duration.toFixed(1);
    $("start").max = video.duration; $("end").max = video.duration;
    $("play").disabled = false; $("render").disabled = false;
    setStatus("Footage ready. Adjust your message and render.");
  };
  video.onerror = () => setStatus("This video could not be decoded by the browser. Try MP4/H.264.");
});
$("musicFile").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0]; if(!file) return;
  if(musicURL) URL.revokeObjectURL(musicURL);
  musicURL = URL.createObjectURL(file);
  setStatus("Background music loaded.");
});
$("play").addEventListener("click", async () => {
  if(!video.src) return;
  const start = Math.max(0, Number($("start").value)||0);
  video.currentTime = start;
  try { await video.play(); } catch(err){ setStatus("Tap the source video to start playback."); }
});

function drawCover(ctx, v, w, h) {
  const scale = Math.max(w/v.videoWidth,h/v.videoHeight), sw=v.videoWidth*scale, sh=v.videoHeight*scale;
  ctx.drawImage(v,(w-sw)/2,(h-sh)/2,sw,sh);
}
function wrapLines(ctx, text, maxWidth, maxLines=3) {
  const words = escapeText(text).split(" "); let lines=[], line="";
  for(const word of words){ const test=line ? line+" "+word : word;
    if(ctx.measureText(test).width>maxWidth && line){ lines.push(line); line=word; } else line=test;
  }
  if(line) lines.push(line);
  if(lines.length>maxLines){ lines=lines.slice(0,maxLines); lines[maxLines-1]=lines[maxLines-1].replace(/[.,;:]?$/,"")+"…"; }
  return lines;
}
function paintFrame(ctx, w, h, progress) {
  const theme=$("theme").value, isLight=theme==="light";
  const pad=w*.075, bandY=h*.64;
  const gradient=ctx.createLinearGradient(0,bandY,w,h);
  gradient.addColorStop(0,"rgba(5,12,8,0)"); gradient.addColorStop(.38,theme==="sage"?"rgba(12,31,23,.78)":isLight?"rgba(31,31,24,.72)":"rgba(4,10,7,.82)"); gradient.addColorStop(1,"rgba(4,9,6,.94)");
  ctx.fillStyle=gradient; ctx.fillRect(0,bandY,w,h-bandY);
  const brand=escapeText($("brand").value).toUpperCase(), headline=escapeText($("headline").value), sub=escapeText($("subline").value), cta=escapeText($("cta").value).toUpperCase();
  const finalPhase=progress>.86;
  ctx.save(); ctx.globalAlpha=Math.min(1,progress*5,(1-progress)*6+0.18);
  ctx.fillStyle="#d9eadc"; ctx.font=`700 ${Math.round(w*.018)}px system-ui`; ctx.letterSpacing="2px";
  ctx.fillText(brand,pad,h*.72);
  ctx.fillStyle="#fff"; ctx.font=`800 ${Math.round(w*(finalPhase?.045:.052))}px system-ui`;
  const lines=wrapLines(ctx,finalPhase?brand:headline,w-pad*2,2);
  let y=h*.80; for(const line of lines){ctx.fillText(line,pad,y);y+=w*.059;}
  ctx.fillStyle="#e6e9e5";ctx.font=`${Math.round(w*.018)}px system-ui`;
  if(!finalPhase){const sublines=wrapLines(ctx,sub,w-pad*2,2);sublines.forEach((line,i)=>ctx.fillText(line,pad,y+ i*w*.027));}
  const ctaY=h*.93, ctaW=Math.min(w*.58,ctx.measureText(cta).width+w*.06), ctaH=h*.045;
  ctx.strokeStyle="#e7eee8";ctx.lineWidth=Math.max(1,w*.0012);ctx.strokeRect(pad,ctaY-ctaH,ctaW,ctaH);
  ctx.font=`700 ${Math.round(w*.015)}px system-ui`;ctx.fillStyle="#fff";ctx.fillText(cta,pad+w*.025,ctaY-ctaH*.32);
  ctx.restore();
}
async function setupAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return null;
  audioCtx=new AC(); await audioCtx.resume();
  const dest=audioCtx.createMediaStreamDestination();
  const source=audioCtx.createMediaElementSource(video); source.connect(dest); source.connect(audioCtx.destination);
  if(musicURL){
    musicElement=new Audio(musicURL);musicElement.loop=true;musicElement.volume=.22;
    const musicSource=audioCtx.createMediaElementSource(musicElement);musicSource.connect(dest);musicSource.connect(audioCtx.destination);
  }
  return dest.stream;
}
function chooseMime(){
  const types=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"];
  return types.find(t=>window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}
$("render").addEventListener("click", async () => {
  if(!video.src || !window.MediaRecorder || !canvas.captureStream) return setStatus("This browser does not support local recording. Try the latest Chrome on Android.");
  $("render").disabled=true;$("download").disabled=true;$("share").disabled=true;
  try{
    const [w,h]=ratioSize($("ratio").value);canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{alpha:false});
    const start=Math.max(0,Number($("start").value)||0);
    const endRaw=Number($("end").value), end=Number.isFinite(endRaw)&&endRaw>start?Math.min(endRaw,video.duration):video.duration;
    if(end-start<1) throw new Error("Select at least one second of footage.");
    video.pause();video.currentTime=start;
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error("Video seek timed out.")),10000);video.onseeked=()=>{clearTimeout(timeout);resolve();};});
    const audioStream=await setupAudio();
    const stream=canvas.captureStream(30);
    if(audioStream) audioStream.getAudioTracks().forEach(track=>stream.addTrack(track));
    const mimeType=chooseMime(); if(!mimeType) throw new Error("No supported recording format found.");
    const chunks=[],bps=Number($("quality").value)*1000000;
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:bps,audioBitsPerSecond:160000});
    recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
    recorder.onerror=e=>setStatus("Recorder error: "+(e.error?.message||"unknown"));
    recorder.onstop=()=>{
      renderedBlob=new Blob(chunks,{type:recorder.mimeType||mimeType});
      if(renderedURL)URL.revokeObjectURL(renderedURL);
      renderedURL=URL.createObjectURL(renderedBlob);
$("output").src = renderedURL;
$("output").hidden = false;
$("outputHint").hidden = true;
      $("download").disabled=false;$("share").disabled=false;$("render").disabled=false;
      setStatus(`Render ready · ${(renderedBlob.size/1024/1024).toFixed(1)} MB · ${recorder.mimeType||mimeType}`);
      stream.getTracks().forEach(t=>t.stop());
      if(audioCtx){audioCtx.close().catch(()=>{});audioCtx=null;}
      if(musicElement){musicElement.pause();musicElement=null;}
    };
    recorder.start(1000);
    if(musicElement) musicElement.play().catch(()=>{});
    await video.play();
    const frame=()=>{
      if(recorder.state!=="recording")return;
      if(video.currentTime>=end || video.ended){video.pause();if(recorder.state==="recording")recorder.stop();return;}
      ctx.fillStyle="#050806";ctx.fillRect(0,0,w,h);
      if(video.readyState>=2)drawCover(ctx,video,w,h);
      const p=(video.currentTime-start)/(end-start);paintFrame(ctx,w,h,p);
      raf=requestAnimationFrame(frame);
    };
    frame();setStatus("Rendering locally… keep this tab open and your screen awake.");
  }catch(err){$("render").disabled=false;setStatus(err.message||String(err));if(audioCtx){audioCtx.close().catch(()=>{});audioCtx=null;}}
});
$("download").addEventListener("click",()=>{
  if(!renderedBlob)return;
  const ext=renderedBlob.type.includes("mp4")?"mp4":"webm";
  const a=document.createElement("a");a.href=renderedURL;a.download=`studioforge-product-ad.${ext}`;a.click();
});
$("share").addEventListener("click",async()=>{
  if(!renderedBlob)return;
  const ext=renderedBlob.type.includes("mp4")?"mp4":"webm",file=new File([renderedBlob],`studioforge-product-ad.${ext}`,{type:renderedBlob.type});
  if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:"StudioForge product ad"});}catch(e){if(e.name!=="AbortError")setStatus("Sharing was not available. Use Download instead.");}}
  else setStatus("File sharing is not supported here. Use Download instead.");
});
updatePreview();
if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();