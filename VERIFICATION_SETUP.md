# Setup: Discord, Roblox, and support tickets

## 1. Discord OAuth

Create a Discord application in Developer Portal → Applications. Under OAuth2 → Redirects, add the exact URL https://YOUR-DOMAIN/api/auth/discord/callback. Put the application Client ID and Client Secret in Vercel. The normal sign-in uses identify. If the optional role integration is configured, the app also requests guilds.join.

## 2. Roblox ownership verification

No Roblox OAuth application or Roblox password is needed. After Discord sign-in, the site issues a temporary code such as TCL-1A2B3C4D. In Roblox, open the account Profile, select About, paste that code in the description and save. Back on the website, enter the Roblox username and submit verification. The server checks the Roblox username and profile description; when the code matches, the Discord and Roblox accounts are linked and their avatars are saved. Codes are single-use and expire after 15 minutes.

## 3. Redis and Vercel

Create an Upstash Redis database. Add these Vercel Environment Variables:
- PUBLIC_SITE_URL (exact public origin, no trailing slash)
- SESSION_SECRET (long random value, 32+ characters)
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- DISCORD_CLIENT_ID
- DISCORD_CLIENT_SECRET

Then redeploy the Vercel project.

## 4. Optional Discord bot role assignment

Set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, and DISCORD_VERIFIED_ROLE_ID. Invite the bot to the server with Manage Roles, and move its highest role above the verified role. When the user verifies, the bot can add them to the server and assign that role. Without these optional variables, Discord + Roblox linking still works.

## 5. Support tickets

Verified users can open Support and submit a request type, subject, and description. The site stores the request in Redis and lists it under My Requests. To send each submission to your staff channel, set DISCORD_SUPPORT_CHANNEL_ID and DISCORD_BOT_TOKEN. Grant the bot View Channel, Send Messages, and Embed Links in that channel. The request includes the ticket ID and both usernames. Players can send up to five tickets per hour.
