import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppRole = "customer" | "agent" | "owner" | "admin" | "it" | "receptionist";
export interface AuthProfile { id:string; full_name:string|null; email:string|null; phone:string|null; avatar_url:string|null; business_email?:string|null; secondary_email?:string|null }
export interface AuthUser extends AuthProfile { roles: AppRole[]; email_verified_at?: string | null; must_change_password?: boolean | number }
interface AuthState { loading:boolean; session:{access_token:string;user:AuthUser}|null; user:AuthUser|null; profile:AuthProfile|null; roles:AppRole[]; rolesLoaded:boolean; primaryRole:AppRole|null; refresh:()=>Promise<void>; signOut:()=>Promise<void> }
const Ctx=createContext<AuthState|undefined>(undefined);
const PRIORITY:AppRole[]=["it","admin","receptionist","agent","owner","customer"];
const primary=(roles:AppRole[])=>PRIORITY.find(r=>roles.includes(r))??null;

export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<AuthUser|null>(null); const [loading,setLoading]=useState(true);
 const refresh=async()=>{const token=localStorage.getItem("novaworks_session");if(!token){setUser(null);setLoading(false);return;}try{const r=await fetch("/api/auth/me",{headers:{Authorization:`Bearer ${token}`}});if(!r.ok){localStorage.removeItem("novaworks_session");setUser(null);}else setUser((await r.json()).user);}catch{setUser(null);}finally{setLoading(false)}};
 useEffect(()=>{refresh()},[]);
 const signOut=async()=>{const token=localStorage.getItem("novaworks_session");try{if(token)await fetch("/api/auth/logout",{method:"POST",headers:{Authorization:`Bearer ${token}`}})}finally{localStorage.removeItem("novaworks_session");setUser(null);window.location.href="/"}};
 const roles=user?.roles??[];
 const value=useMemo<AuthState>(()=>({loading,session:user?{access_token:localStorage.getItem("novaworks_session")||"",user}:null,user,profile:user,roles,rolesLoaded:!loading,primaryRole:primary(roles),refresh,signOut}),[loading,user]);
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(){const c=useContext(Ctx);if(!c)throw new Error("useAuth must be used within AuthProvider");return c}
export function dashboardPathFor(role:AppRole|null){switch(role){case"it":return"/dashboard/it";case"admin":return"/dashboard/admin";case"receptionist":return"/dashboard/receptionist";case"agent":return"/dashboard/agent";case"owner":return"/dashboard/owner";case"customer":return"/dashboard/buyer";default:return"/auth/welcome"}}
