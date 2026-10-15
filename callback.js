const { required, publicUrl, put, get, remove, sessionId, redirect, errorRedirect, avatarUrl } = require("../../_lib/auth");
module.exports = async function handler(req,res){
 if(req.method!=="GET")return res.status(405).end("Method not allowed");
 const code=req.query.code,state=req.query.state;if(!code||!state)return errorRedirect(res,"discord");
 try{
  const sid=sessionId(req),pending=await get("tcl:oauth:discord:"+state);await remove("tcl:oauth:discord:"+state);
  if(!sid||!pending||pending.sid!==sid)return errorRedirect(res,"state");
  const body=new URLSearchParams({client_id:required("DISCORD_CLIENT_ID"),client_secret:required("DISCORD_CLIENT_SECRET"),grant_type:"authorization_code",code:String(code),redirect_uri:publicUrl("/api/auth/discord/callback")});
  const tr=await fetch("https://discord.com/api/oauth2/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
  if(!tr.ok)return errorRedirect(res,"discord");const token=await tr.json();
  const ur=await fetch("https://discord.com/api/v10/users/@me",{headers:{authorization:"Bearer "+token.access_token}});
  if(!ur.ok)return errorRedirect(res,"discord");const u=await ur.json(),id=String(u.id),handle=u.username||"member";
  const discord={id,username:u.global_name||handle,handle,avatar:avatarUrl(u)};
  await put("tcl:session:"+sid,{discord,authenticatedAt:Date.now()},60*60*24*30);
  if(token.access_token&&process.env.DISCORD_BOT_TOKEN&&process.env.DISCORD_GUILD_ID&&process.env.DISCORD_VERIFIED_ROLE_ID)await put("tcl:discord:oauth-access:"+sid,{accessToken:token.access_token},1800);
  const profile=await get("tcl:profile:"+id);
  redirect(res,publicUrl(profile&&profile.roblox&&profile.roblox.id?(pending.returnTo==="support"?"/support.html":"/profile.html?u="+encodeURIComponent(profile.roblox.username)):"/verify.html?step=roblox"+(pending.returnTo==="support"?"&return=support":"")));
 }catch(e){console.error("Discord OAuth callback failed:",e.message);errorRedirect(res,"setup")}
};
