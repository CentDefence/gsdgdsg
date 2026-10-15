const {get,put,remove,redis,sessionId,json,avatarUrl,required}=require("../_lib/auth");
async function findUser(username){
 const r=await fetch("https://users.roblox.com/v1/usernames/users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({usernames:[username],excludeBannedUsers:false})});
 if(!r.ok)throw Error("Roblox username lookup unavailable");const d=await r.json(),u=d.data&&d.data[0];if(!u)return null;
 const pr=await fetch("https://users.roblox.com/v1/users/"+encodeURIComponent(u.id));if(!pr.ok)throw Error("Roblox profile lookup unavailable");
 const p=await pr.json();return{id:String(u.id),username:u.name||username,displayName:u.displayName||u.name||username,description:p.description||""}
}
async function robloxAvatar(id){try{const r=await fetch("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds="+encodeURIComponent(id)+"&size=420x420&format=Png&isCircular=false");if(!r.ok)return"";const j=await r.json();return j.data?.[0]?.imageUrl||""}catch{return""}}
async function giveRole(discord,roleId,guildId,botToken){
 const url="https://discord.com/api/v10/guilds/"+encodeURIComponent(guildId)+"/members/"+encodeURIComponent(discord.id),headers={authorization:"Bot "+botToken,"content-type":"application/json"};
 const join=await fetch(url,{method:"PUT",headers,body:JSON.stringify({access_token:discord.accessToken})});if(!join.ok)throw Error("Could not join Discord guild");
 let member;if(join.status!==204)member=await join.json();else{const r=await fetch(url,{headers:{authorization:headers.authorization}});if(!r.ok)throw Error("Could not read Discord member");member=await r.json()}
 const roles=[...new Set([...(member.roles||[]),roleId])];const assigned=await fetch(url,{method:"PATCH",headers,body:JSON.stringify({roles})});if(!assigned.ok)throw Error("Could not assign Discord role");
}
module.exports=async function handler(req,res){
 if(req.method!=="POST")return res.status(405).end("Method not allowed");
 try{
  const sid=sessionId(req),session=sid?await get("tcl:session:"+sid):null;
  if(!session?.discord)return json(res,401,{error:"discord_required"});
  const body=req.body&&typeof req.body==="object"?req.body:{},username=String(body.username||"").trim(),submitted=String(body.code||"").trim().toUpperCase();
  if(!/^[A-Za-z0-9_]{3,20}$/.test(username))return json(res,400,{error:"invalid_username"});
  const challengeKey="tcl:verification:challenge:"+sid,challenge=await get(challengeKey);
  if(!challenge||challenge.expiresAt<Date.now()||challenge.discordId!==session.discord.id)return json(res,410,{error:"code_expired"});
  if(!/^TCL-[A-F0-9]{8}$/.test(submitted))return json(res,400,{error:"invalid_code"});
  const attemptKey="tcl:verification:attempts:"+sid,attempts=Number(await redis(["INCR",attemptKey]));if(attempts===1)await redis(["EXPIRE",attemptKey,"900"]);if(attempts>12)return json(res,429,{error:"too_many_attempts"});
  if(submitted!==challenge.code)return json(res,400,{error:"wrong_code"});
  const roblox=await findUser(username);if(!roblox)return json(res,404,{error:"roblox_not_found"});
  if(!roblox.description.toUpperCase().includes(submitted))return json(res,422,{error:"code_not_in_description"});
  const discordId=session.discord.id,prior=await get("tcl:profile:"+discordId);if(prior?.roblox?.id)return json(res,409,{error:"already_verified",profileUrl:"/profile.html?u="+encodeURIComponent(prior.roblox.username)});
  const other=await get("tcl:profile:roblox-name:"+roblox.username.toLowerCase());if(other&&other!==discordId)return json(res,409,{error:"roblox_linked"});
  let roleAssigned=false;
  const bot=process.env.DISCORD_BOT_TOKEN,guild=process.env.DISCORD_GUILD_ID,role=process.env.DISCORD_VERIFIED_ROLE_ID,oauth=await get("tcl:discord:oauth-access:"+sid);
  if(bot&&guild&&role&&oauth?.accessToken){try{await giveRole({...session.discord,accessToken:oauth.accessToken},role,guild,bot);roleAssigned=true}catch(e){console.error("Role assignment failed:",e.message)}}
  const profile={discord:{id:discordId,username:session.discord.username,handle:session.discord.handle,avatar:session.discord.avatar||""},roblox:{id:roblox.id,username:roblox.username,displayName:roblox.displayName,profile:"https://www.roblox.com/users/"+encodeURIComponent(roblox.id)+"/profile",avatar:await robloxAvatar(roblox.id)},roleAssigned,verifiedAt:new Date().toISOString()};
  await put("tcl:profile:"+discordId,profile,60*60*24*365*5);
  await put("tcl:profile:roblox-name:"+roblox.username.toLowerCase(),discordId,60*60*24*365*5);
  await put("tcl:profile:discord-name:"+profile.discord.handle.toLowerCase(),discordId,60*60*24*365*5);
  await put("tcl:roblox:"+roblox.id,{discordId},60*60*24*365*5);
  await redis(["ZADD","tcl:profiles:index",String(Date.now()),discordId]);
  await remove(challengeKey);await remove(attemptKey);await remove("tcl:discord:oauth-access:"+sid);
  await put("tcl:session:"+sid,{discord:{id:discordId,username:profile.discord.username,handle:profile.discord.handle,avatar:profile.discord.avatar},verified:true},60*60*24*30);
  return json(res,200,{ok:true,roleAssigned,profileUrl:"/profile.html?u="+encodeURIComponent(roblox.username)});
 }catch(e){console.error("Verification failed:",e.message);return json(res,503,{error:"verification_unavailable"})}
};
