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
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["license"], (data) => {
    if (!data.license) chrome.storage.local.set({ license: null });
  });
  setLovInfinityIcon();
});
chrome.runtime.onStartup.addListener(setLovInfinityIcon);
setLovInfinityIcon();
