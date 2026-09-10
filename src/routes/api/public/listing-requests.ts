import {createFileRoute} from "@tanstack/react-router";
import {submitListing} from "@/lib/listing-requests.server";
export const Route=createFileRoute("/api/public/listing-requests")({server:{handlers:{
 POST:async({request})=>{
  try{
   const length=Number(request.headers.get("content-length")||0);
   if(length>34*1024*1024)return Response.json({error:"Submission is too large"},{status:413});
   const form=await request.formData();
   const files=form.getAll("images");
   if(files.length>8||files.some(f=>typeof f==="string"||f.size>8*1024*1024))return Response.json({error:"Maximum 8 valid images, 8 MB each"},{status:413});
   return Response.json(await submitListing(request,form),{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(e:any){
   const message=e?.message||"Unable to submit listing";
   const status=/too many/i.test(message)?429:/large|maximum|size/i.test(message)?413:400;
   return Response.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
  }
 }
}}});
