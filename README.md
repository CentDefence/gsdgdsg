# TRS CIS League website

Classic Discord + Roblox verification, public player profiles, and a support request form. Existing league pages are available at /league.html.

## Deploy on Vercel

1. Upload the contents of this folder to the root of your GitHub repository. Keep api/ at the repository root.
2. Import that repository in Vercel. Set Root Directory to the repository root, then deploy.
3. Create an Upstash Redis database. Add required variables from .env.example in Vercel → Project Settings → Environment Variables.
4. In Discord Developer Portal, add https://YOUR-DOMAIN/api/auth/discord/callback under OAuth2 → Redirects. Set PUBLIC_SITE_URL, DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.
5. Set UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN and a unique SESSION_SECRET (at least 32 random characters).
6. Redeploy after saving variables.

Do not use GitHub Pages as the host. The server-side routes are Vercel Functions under api/.

## Verify Discord and Roblox

1. Open the site and select Verify account.
2. Select Continue with Discord and authorize the league app.
3. The verification page gives you a temporary TCL code.
4. On Roblox, open your profile, go to About, add the code to your description and save.
5. Return to the site, enter your Roblox username and select Verify Roblox account.
6. The site checks the public Roblox profile description and creates a profile with both Discord and Roblox avatars.

No Roblox password or Roblox OAuth client is requested. Codes expire after 15 minutes.

## Optional Discord bot features

Use the same Discord application for OAuth and bot features. Invite the bot with bot and applications.commands scopes. Give it Manage Roles for the verified-role feature, and View Channel, Send Messages, and Embed Links for ticket delivery.

For automatic server join and verified role assignment, set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID and DISCORD_VERIFIED_ROLE_ID. The bot's highest role must be above the verified role. When configured, OAuth also requests guilds.join.

For tickets, set DISCORD_SUPPORT_CHANNEL_ID to the staff text channel. Ticket requests are stored in Redis and posted to that channel; members see their own submissions on the Support page. Limit: five per hour.

For slash commands, set DISCORD_PUBLIC_KEY in Vercel, set the Discord Interactions Endpoint URL to https://YOUR-DOMAIN/api/discord/interactions, then run node scripts/register-discord-commands.js with DISCORD_CLIENT_ID, DISCORD_GUILD_ID, and DISCORD_BOT_TOKEN available in your terminal environment.

Required and optional variable names are listed in .env.example. Never commit actual secrets to GitHub.
