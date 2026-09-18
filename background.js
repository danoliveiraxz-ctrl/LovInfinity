let nativePort=null;
let nativeReady=false;
let activeRequest=null;
let nativeConnectPromise=null;
const requestQueue=[];

function ensureNativePort(){
  if(nativePort&&nativeReady)return Promise.resolve();
  if(nativeConnectPromise)return nativeConnectPromise;
  nativeConnectPromise=new Promise((resolve,reject)=>{
    let port=null,settled=false,started=Date.now();
    const finishOk=()=>{
      if(settled)return;
      settled=true;
      nativeReady=true;
      nativeConnectPromise=null;
      resolve();
      processNativeQueue();
    };
    const fail=(message)=>{
      if(settled)return;
      settled=true;
      nativeReady=false;
      nativeConnectPromise=null;
      if(nativePort===port)nativePort=null;
      reject(Error(message||"Não foi possível iniciar o componente local LovInfinity."));
    };
    try{
      port=chrome.runtime.connectNative("com.lovinfinity.oauth");
      nativePort=port;
      nativeReady=false;
      port.onMessage.addListener(msg=>{
        if(msg?.event==="codex_progress"){
          chrome.runtime.sendMessage({action:"codex_progress",text:msg.output||""});
          return;
        }
        if(msg?.ok&&msg?.port){
          finishOk();
          return;
        }
        if(activeRequest){
          const p=activeRequest;
          activeRequest=null;
          clearTimeout(p.timer);
          msg?.ok?p.resolve(msg):p.reject(Error(msg?.error||"Erro no componente local LovInfinity."));
          processNativeQueue();
          return;
        }
        if(msg?.ok){
          finishOk();
        }else if(!nativeReady){
          fail(msg?.error||"O componente local LovInfinity não respondeu corretamente.");
        }
      });
      port.onDisconnect.addListener(()=>{
        nativeReady=false;
        const runtimeError=chrome.runtime.lastError?.message||"";
        const reason=runtimeError||"Componente local LovInfinity desconectado.";
        if(activeRequest){
          clearTimeout(activeRequest.timer);
          activeRequest.reject(Error(reason));
          activeRequest=null;
        }
        while(requestQueue.length)requestQueue.shift().reject(Error(reason));
        if(nativePort===port)nativePort=null;
        fail(reason);
      });
      port.postMessage({action:"ensure_server"});
      const poll=()=>{
        if(settled)return;
        if(nativeReady){finishOk();return}
        if(Date.now()-started>8000){
          fail("O componente local LovInfinity não respondeu ao iniciar. Verifique se o instalador foi executado e se o Chrome foi reiniciado.");
          return;
        }
        setTimeout(poll,100);
      };
      poll();
    }catch(e){fail(e.message)}
  });
  return nativeConnectPromise;
}

function processNativeQueue(){
  if(activeRequest||!nativePort||!nativeReady||!requestQueue.length)return;
  const next=requestQueue.shift();
  activeRequest=next;
  try{
    nativePort.postMessage({action:next.action,prompt:next.prompt});
    next.timer=setTimeout(()=>{
      if(activeRequest===next){
        activeRequest=null;
        next.reject(Error("Tempo limite do componente local LovInfinity."));
        processNativeQueue();
      }
    },next.action==="run_codex"?10*60*1000:30000);
  }catch(e){
    activeRequest=null;
    next.reject(e);
    processNativeQueue();
  }
}

async function nativeRequest(action,prompt=""){
  await ensureNativePort();
  return new Promise((resolve,reject)=>{
    requestQueue.push({action,prompt,resolve,reject,timer:null});
    processNativeQueue();
  });
}

async function setLovInfinityIcon(){try{const res=await fetch(chrome.runtime.getURL("icon.png"));const blob=await res.blob();const bitmap=await createImageBitmap(blob);const imageData={};for(const size of [16,32,48]){const canvas=new OffscreenCanvas(size,size);const ctx=canvas.getContext("2d");ctx.drawImage(bitmap,0,0,size,size);imageData[size]=ctx.getImageData(0,0,size,size)}await chrome.action.setIcon({imageData});bitmap.close()}catch(e){console.warn("LovInfinity icon error",e)}}
chrome.runtime.onInstalled.addListener(()=>{chrome.storage.local.get(["license"],d=>{if(!d.license)chrome.storage.local.set({license:null})});setLovInfinityIcon()});
chrome.runtime.onStartup.addListener(setLovInfinityIcon);
setLovInfinityIcon();

chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
  if(msg?.action==="ensure_lovable_host"){
    ensureNativePort().then(()=>sendResponse({ok:true})).catch(e=>sendResponse({ok:false,error:e.message}));
    return true;
  }
  if(["codex_status","codex_install","codex_login","codex_mcp_login","run_codex"].includes(msg?.action)){
    nativeRequest(msg.action,msg.prompt||"").then(r=>sendResponse(r)).catch(e=>sendResponse({ok:false,error:e.message}));
    return true;
  }
});
