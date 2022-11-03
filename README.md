Stellar Quest Bot 
---

Required Enviroment Variables:
| Variable | Description |
| -------- | ----------- |
| DISCORD_BOT_TOKEN  |  Token of the bot, copy from the discord dev page |
| VERIFICATION_CHANNEL_ID | Channel ID of the channel where the bot should setup the verification message. Must be read- and writeable by the bot user |
| VERIFIED_ROLE_ID | Role ID of the  role to be granted to verified users |
| DATABASE_URL  | Postgres Database URI: `postgresql://user:password@host:port/db-name?schema=public` |

### Initialising the db:
* 1:  Setup `DATABASE_URL` in your .env-file or environment
* 2: run `npx prisma migrate deploy`

Alternative: run the migrations in `prisma/migrate` as plain  SQL on your DB (won't be feasiable if we have more migrations one day)
