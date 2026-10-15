const {get,sessionId,json}=require("../_lib/auth");
module.exports=async function handler(req,res){
 if(req.method!=="GET")return res.status(405).end("Method not allowed");
 try{const sid=sessionId(req),s=sid?await get("tcl:session:"+sid):null;if(!s?.discord)return json(res,200,{authenticated:false,verified:false});
 const profile=await get("tcl:profile:"+s.discord.id),verified=Boolean(profile?.roblox?.id);
 return json(res,200,{authenticated:true,verified,profileUrl:verified?"/profile.html?u="+encodeURIComponent(profile.roblox.username):null,discord:{id:s.discord.id,username:s.discord.username,handle:s.discord.handle,avatar:s.discord.avatar||""},profile:verified?profile:null})
 }catch(e){console.error("Status failed:",e.message);return json(res,503,{error:"service_unavailable"})}
};
