import crypto from "node:crypto";
import mysql from "mysql2/promise";
const email=(process.env.IT_EMAIL||"it@novaworks.rw").trim().toLowerCase();
const name=process.env.IT_NAME||"NOVAWORKS IT";
const password=process.env.IT_PASSWORD;
if(!/^[^@\s]+@novaworks\.rw$/i.test(email)) throw new Error("IT_EMAIL must end with @novaworks.rw");
if(!password || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/.test(password)) throw new Error("IT_PASSWORD must be 9+ chars with uppercase, lowercase, number and symbol");
const salt=crypto.randomBytes(16).toString("hex");const hash=crypto.scryptSync(password,salt,64).toString("hex");const stored=`scrypt$${salt}$${hash}`;const id=crypto.randomUUID();
const db=await mysql.createConnection({host:process.env.DB_HOST||"127.0.0.1",port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,database:process.env.DB_NAME,password:process.env.DB_PASSWORD});
const [existing]=await db.execute("SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1",[email]);
let uid=id;if(existing.length){uid=existing[0].id;await db.execute("UPDATE users SET business_email=?,full_name=?,active=1,email_verified_at=COALESCE(email_verified_at,UTC_TIMESTAMP()) WHERE id=?",[email,name,uid]);}else{await db.execute("INSERT INTO users(id,email,business_email,password_hash,full_name,active,email_verified_at) VALUES(?,?,?,?,?,1,UTC_TIMESTAMP())",[uid,email,email,stored,name]);}
await db.execute("INSERT IGNORE INTO user_roles(user_id,role) VALUES(?,'it')",[uid]);await db.end();console.log(`IT user ready: ${email}`);
