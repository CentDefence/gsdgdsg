const crypto=require("node:crypto");
const {get,put,redis,sessionId,json}=require("./_lib/auth");
const categories=new Set(["Account & Verification","League & Registration","Match Report","Technical Issue","Other"]);
module.exports=async function handler(req,res){
 const sid=sessionId(req),session=sid?await get("tcl:session:"+sid):null,discord=session?.discord;
 if(!discord)return json(res,401,{error:"discord_required"});
 const profile=await get("tcl:profile:"+discord.id);if(!profile?.roblox?.id)return json(res,403,{error:"verification_required"});
 try{
  if(req.method==="GET"){
   const ids=await redis(["ZREVRANGE","tcl:tickets:user:"+discord.id,"0","24"]),tickets=[];
   for(const id of ids||[]){const t=await get("tcl:ticket:"+id);if(t)tickets.push({id:t.id,subject:t.subject,category:t.category,status:t.status,createdAt:t.createdAt})}
   return json(res,200,{tickets})
  }
  if(req.method!=="POST")return res.status(405).end("Method not allowed");
  const b=req.body&&typeof req.body==="object"?req.body:{},category=String(b.category||""),subject=String(b.subject||"").trim(),description=String(b.description||"").trim();
  if(!categories.has(category))return json(res,400,{error:"invalid_category"});
  if(subject.length<5||subject.length>120)return json(res,400,{error:"invalid_subject"});
  if(description.length<20||description.length>5000)return json(res,400,{error:"invalid_description"});
  const rateKey="tcl:tickets:rate:"+discord.id,rate=Number(await redis(["INCR",rateKey]));if(rate===1)await redis(["EXPIRE",rateKey,"3600"]);if(rate>5)return json(res,429,{error:"ticket_rate_limit"});
  const now=Date.now(),id="TCL-"+now.toString(36).toUpperCase()+"-"+crypto.randomBytes(3).toString("hex").toUpperCase();
  const ticket={id,userId:discord.id,discord:{username:discord.username,handle:discord.handle,id:discord.id},roblox:{username:profile.roblox.username,id:profile.roblox.id},category,subject,description,status:"Open",createdAt:new Date(now).toISOString()};
  await put("tcl:ticket:"+id,ticket,60*60*24*365*2);
  await redis(["ZADD","tcl:tickets:user:"+discord.id,String(now),id]);
  const bot=process.env.DISCORD_BOT_TOKEN,channel=process.env.DISCORD_SUPPORT_CHANNEL_ID;
  let notified=false;
  if(bot&&channel){
   const payload={embeds:[{title:"New support request · "+id,color:0x8262cf,fields:[{name:"Subject",value:subject.slice(0,250),inline:false},{name:"Category",value:category,inline:true},{name:"Member",value:discord.username+" (@"+discord.handle+")",inline:true},{name:"Roblox",value:profile.roblox.username,inline:true},{name:"Request",value:description.slice(0,1024),inline:false}],footer:{text:"TRS CIS League Support"},timestamp:ticket.createdAt}],allowed_mentions:{parse:[]}};
   try{const r=await fetch("https://discord.com/api/v10/channels/"+encodeURIComponent(channel)+"/messages",{method:"POST",headers:{authorization:"Bot "+bot,"content-type":"application/json"},body:JSON.stringify(payload)});notified=r.ok;if(!r.ok)console.error("Ticket notification failed:",r.status,await r.text())}catch(e){console.error("Ticket notification failed:",e.message)}
  }
  return json(res,201,{ok:true,ticket:{id,subject,category,status:ticket.status,createdAt:ticket.createdAt},notified})
 }catch(e){console.error("Ticket endpoint failed:",e.message);return json(res,503,{error:"tickets_unavailable"})}
};
