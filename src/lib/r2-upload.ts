import { signR2Upload } from "./r2.functions";
import { createClientOnlyFn } from "@tanstack/react-start";
export type UploadResult={url:string;path:string;provider:"r2"};

const optimizeImageForUpload = createClientOnlyFn(
  async (file: File) => {
    const { optimizeImageFile } = await import("./image-optimize.client");

    return optimizeImageFile(file, {
      maxWidth: 2400,
      maxHeight: 2000,
      quality: 0.8,
    });
  },
);

export async function uploadPropertyMedia(userId:string,file:File,subdir:string,onProgress?:(pct:number)=>void):Promise<UploadResult>{
  if(file.size>20*1024*1024)throw new Error("Image/file is too large (20 MB maximum)");
  const allowed=/^(image\/(jpeg|png|webp|avif)|application\/pdf|video\/)/i;
  if(!allowed.test(file.type||""))throw new Error("Unsupported media type");
  let outgoing=file;
if (file.type.startsWith("image/")) {
  onProgress?.(2);

  try {
    const optimized = await optimizeImageForUpload(file);
    outgoing = optimized ?? file;
  } catch {
    outgoing = file;
  }
}

  const ext=(outgoing.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
  const key=`properties/${userId}/${subdir}/${crypto.randomUUID()}.${ext}`;
  const contentType=outgoing.type||"application/octet-stream";
  const {uploadUrl,publicUrl}=await signR2Upload({data:{key,contentType}});
  await xhrPut(uploadUrl,outgoing,contentType,onProgress);
  return{url:publicUrl,path:key,provider:"r2"};
}
function xhrPut(url:string,file:File,contentType:string,onProgress?:(pct:number)=>void){return new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("PUT",url);xhr.setRequestHeader("Content-Type",contentType);xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress?.(Math.min(95,Math.round(e.loaded/e.total*95)))};xhr.onload=()=>xhr.status>=200&&xhr.status<300?(onProgress?.(100),resolve()):reject(new Error(`R2 upload failed (${xhr.status})`));xhr.onerror=()=>reject(new Error("R2 network error"));xhr.onabort=()=>reject(new Error("R2 upload aborted"));xhr.send(file)})}
