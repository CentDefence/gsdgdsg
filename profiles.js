const {get,redis,json}=require("./_lib/auth");
function publicProfile(profile){
 const d=profile.discord||{};
 return {discord:{id:d.id,username:d.username||d.handle,handle:d.handle||d.username,avatar:d.avatar||""},roblox:{id:profile.roblox.id,username:profile.roblox.username,displayName:profile.roblox.displayName,profile:profile.roblox.profile,avatar:profile.roblox.avatar||""},verifiedAt:profile.verifiedAt,discordCreatedAt:profile.discordCreatedAt||null,url:"/profile.html?u="+encodeURIComponent(d.id)};
}
module.exports=async function handler(req,res){
 if(req.method!=="GET")return res.status(405).end("Method not allowed");
 try{
  const username=String(req.query.username||"").trim().replace(/^@/,"");
  if(username){
   let id=await get("tcl:profile:roblox-name:"+username.toLowerCase());
   if(!id)id=await get("tcl:profile:discord-name:"+username.toLowerCase());
   if(!id&&/^[0-9]+$/.test(username))id=username;
   const profile=id?await get("tcl:profile:"+id):null;
   if(!profile?.roblox?.id)return json(res,404,{error:"profile_not_found"});
   return json(res,200,{profile:publicProfile(profile)});
  }
  const q=String(req.query.q||"").trim().toLowerCase(),offset=Math.max(0,Number.parseInt(req.query.offset||"0",10)||0);
  const ids=await redis(["ZREVRANGE","tcl:profiles:index",String(offset),String(offset+99)]),matches=[];
  for(const id of ids||[]){
   const profile=await get("tcl:profile:"+id);if(!profile?.discord||!profile?.roblox?.id)continue;
   const d=profile.discord,hay=[d.username,d.handle,d.id].join(" ").toLowerCase();
   if(!q||hay.includes(q))matches.push(publicProfile(profile));
   if(matches.length>=40)break;
  }
  return json(res,200,{profiles:matches,nextOffset:(ids||[]).length===100?offset+100:null});
 }catch(error){console.error("Public profile lookup failed:",error.message);return json(res,503,{error:"profiles_unavailable"})}
};
