import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset, verifyPasswordResetOtp, completePasswordReset } from "@/lib/password-reset.functions";
import { toast } from "sonner";

export const Route=createFileRoute("/auth/password-reset")({head:()=>({meta:[{title:"Password security — NOVAWORKS"}]}),component:Page});
function Page(){
 const request=useServerFn(requestPasswordReset), verify=useServerFn(verifyPasswordResetOtp), complete=useServerFn(completePasswordReset);
 const params=typeof window!=="undefined"?new URLSearchParams(window.location.search):new URLSearchParams();
 const id=params.get("request")||"", token=params.get("token")||"";
 const [email,setEmail]=useState(""),[reason,setReason]=useState(""),[code,setCode]=useState("");
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[step,setStep]=useState<"request"|"verify"|"pending"|"complete">(id&&token?"complete":"request"),[busy,setBusy]=useState(false);
 const run=async(fn:()=>Promise<any>,next?:typeof step)=>{setBusy(true);try{await fn();if(next)setStep(next);toast.success("Request processed")}catch(e:any){toast.error(e.message||"Request failed")}finally{setBusy(false)}};
 return <main className="max-w-md mx-auto px-6 py-16 space-y-5">
 <h1 className="font-display text-3xl">Password security</h1>
 {step==="request"&&<><p>Verify your email before IT reviews your recovery request.</p>
 <input className="input-luxe" type="email" placeholder="Registered email" value={email} onChange={e=>setEmail(e.target.value)}/>
 <textarea className="input-luxe" placeholder="Reason for reset" value={reason} onChange={e=>setReason(e.target.value)}/>
 <button className="w-full bg-noir-deep text-white p-3 rounded" disabled={busy||reason.trim().length<5} onClick={()=>run(()=>request({data:{email,reason}}),"verify")}>Request verification</button></>}
 {step==="verify"&&<><p>If the account exists, enter the six-digit code sent to its registered email.</p>
 <input className="input-luxe" inputMode="numeric" maxLength={6} placeholder="Verification code" value={code} onChange={e=>setCode(e.target.value)}/>
 <button className="w-full bg-noir-deep text-white p-3 rounded" disabled={busy||code.length!==6} onClick={()=>run(()=>verify({data:{email,code}}),"pending")}>Verify email</button></>}
 {step==="pending"&&<p>Your email is verified. IT must approve the request. You will receive a single-use link if approved.</p>}
 {step==="complete"&&<><p>IT-approved password completion. The link is valid for 15 minutes.</p>
 <input className="input-luxe" type="password" autoComplete="new-password" placeholder="New strong password" value={password} onChange={e=>setPassword(e.target.value)}/>
 <input className="input-luxe" type="password" autoComplete="new-password" placeholder="Confirm password" value={confirm} onChange={e=>setConfirm(e.target.value)}/>
 <button className="w-full bg-noir-deep text-white p-3 rounded" disabled={busy||password!==confirm||!password} onClick={()=>run(async()=>{await complete({data:{id,token,new_password:password}});window.location.href="/auth";})}>Set new password</button></>}
 <Link to="/auth" className="underline text-sm">Back to sign in</Link>
 </main>;
}
