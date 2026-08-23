import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

let poolPromise: Promise<Pool> | null = null;

async function loadMysql() {
  if (typeof window !== "undefined") throw new Error("MySQL server module was executed in the browser.");
  const runtimeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
  return runtimeImport("mysql2/promise");
}

export async function getDb(): Promise<Pool> {
  if (poolPromise) return poolPromise;
  poolPromise = (async () => {
    const mod = await loadMysql();
    const mysql = mod.default ?? mod;
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME;
    if (!host || !user || !database) throw new Error("MySQL is not configured. Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME.");
    return mysql.createPool({ host, port, user, password, database, waitForConnections:true, connectionLimit:Number(process.env.DB_POOL_SIZE||10), queueLimit:0, timezone:"Z", decimalNumbers:true, enableKeepAlive:true, keepAliveInitialDelay:0 });
  })();
  try { return await poolPromise; } catch (error) { poolPromise=null; throw error; }
}

export async function queryRows<T extends RowDataPacket[]>(sql:string, params:unknown[]=[]):Promise<T>{ const db=await getDb(); const [rows]=await db.execute<T>(sql,params); return rows; }
export async function withTransaction<T>(fn:(conn:PoolConnection)=>Promise<T>):Promise<T>{ const db=await getDb(); const conn=await db.getConnection(); try{await conn.beginTransaction();const result=await fn(conn);await conn.commit();return result}catch(error){await conn.rollback();throw error}finally{conn.release()} }
