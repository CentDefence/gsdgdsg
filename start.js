const crypto=require("node:crypto");
const {get,put,sessionId,json}=require("../_lib/auth");
function code(){return "TCL-"+crypto.randomBytes(5).toString("hex").toUpperCase().slice(0,8)}
module.exports=async function handler(req,res){
 if(req.method!=="POST")return res.status(405).end("Method not allowed");
 try{
  const sid=sessionId(req),session=sid?await get("tcl:session:"+sid):null;
  if(!session||!session.discord)return json(res,401,{error:"discord_required"});
  const existing=await get("tcl:profile:"+session.discord.id);
  if(existing&&existing.roblox&&existing.roblox.id)return json(res,409,{error:"already_verified",profileUrl:"/profile.html?u="+encodeURIComponent(existing.roblox.username)});
  const value=code(),expiresAt=Date.now()+15*60*1000;
  await put("tcl:verification:challenge:"+sid,{code:value,discordId:session.discord.id,expiresAt},900);
  return json(res,200,{code:value,expiresAt,expiresIn:900});
 }catch(e){console.error("Challenge creation failed:",e.message);return json(res,503,{error:"service_unavailable"})}
};
