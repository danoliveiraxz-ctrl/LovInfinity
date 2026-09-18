let nativePort=null;
let nativeReady=false;

function ensureNativePort(){
  return new Promise((resolve,reject)=>{
    if(nativePort&&nativeReady){resolve();return}
    try{
      nativePort=chrome.runtime.connectNative("com.lovinfinity.oauth");
      nativeReady=false;
      nativePort.onMessage.addListener(msg=>{
        if(msg?.ok)nativeReady=true;
      });
      nativePort.onDisconnect.addListener(()=>{
        nativeReady=false;
        nativePort=null;
      });
      nativePort.postMessage({action:"ensure_server"});
      const started=Date.now();
      const poll=()=>{
        if(nativeReady){resolve();return}
        if(Date.now()-started>3000){reject(Error("Não foi possível iniciar o componente local LovInfinity."));return}
        setTimeout(poll,50);
      };
      poll();
    }catch(e){reject(e)}
  });
}

async function setLovInfinityIcon(){
  try{
    const res=await fetch(chrome.runtime.getURL("icon.png"));
    const blob=await res.blob();
    const bitmap=await createImageBitmap(blob);
    const imageData={};
    for(const size of [16,32,48]){
      const canvas=new OffscreenCanvas(size,size);
      const ctx=canvas.getContext("2d");
      ctx.drawImage(bitmap,0,0,size,size);
      imageData[size]=ctx.getImageData(0,0,size,size);
    }
    await chrome.action.setIcon({imageData});
    bitmap.close();
  }catch(e){console.warn("LovInfinity icon error",e);}
}

chrome.runtime.onInstalled.addListener(()=>{
  chrome.storage.local.get(["license"],data=>{
    if(!data.license)chrome.storage.local.set({license:null});
  });
  setLovInfinityIcon();
});
chrome.runtime.onStartup.addListener(setLovInfinityIcon);
setLovInfinityIcon();

chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
  if(msg?.action!=="ensure_lovable_host")return;
  ensureNativePort().then(()=>sendResponse({ok:true})).catch(e=>sendResponse({ok:false,error:e.message}));
  return true;
});
