import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordChange, verifyPasswordResetOtp } from "@/lib/password-reset.functions";
import { toast } from "sonner";
export const Route=createFileRoute("/auth/change-password")({component:Page});
function Page(){
 const request=useServerFn(requestPasswordChange),verify=useServerFn(verifyPasswordResetOtp);
 const [current,setCurrent]=useState(""),[reason,setReason]=useState(""),[email,setEmail]=useState(""),[code,setCode]=useState(""),[step,setStep]=useState(0),[busy,setBusy]=useState(false);
 const run=async(fn:()=>Promise<any>,next:number)=>{setBusy(true);try{await fn();setStep(next);toast.success("Request processed")}catch(e:any){toast.error(e.message||"Request failed")}finally{setBusy(false)}};
 return <main className="max-w-md mx-auto px-6 py-16 space-y-5"><h1 className="font-display text-3xl">Request password change</h1>
 {step===0&&<><p>Verify your existing password. Your new password will be chosen after IT approval.</p>
 <input type="password" autoComplete="current-password" className="input-luxe" placeholder="Existing password" value={current} onChange={e=>setCurrent(e.target.value)}/>
 <textarea className="input-luxe" placeholder="Reason for change" value={reason} onChange={e=>setReason(e.target.value)}/>
 <button className="w-full bg-noir-deep text-white p-3 rounded" disabled={busy||!current||reason.trim().length<5} onClick={()=>run(()=>request({data:{current_password:current,reason}}),1)}>Send verification email</button></>}
 {step===1&&<><p>Enter your registered account email and the verification code sent to it.</p>
 <input className="input-luxe" type="email" placeholder="Registered email" value={email} onChange={e=>setEmail(e.target.value)}/>
 <input className="input-luxe" inputMode="numeric" maxLength={6} placeholder="Six-digit code" value={code} onChange={e=>setCode(e.target.value)}/>
 <button className="w-full bg-noir-deep text-white p-3 rounded" disabled={busy||code.length!==6} onClick={()=>run(()=>verify({data:{email,code}}),2)}>Verify email</button></>}
 {step===2&&<p>Email verified. IT has been notified. When IT approves, you will receive a secure link to set your new password.</p>}
 <Link to="/auth" className="underline text-sm">Back to sign in</Link></main>;
}
