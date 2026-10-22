import {configDotenv} from 'dotenv'
import {fileURLToPath} from 'node:url'

const envPath = fileURLToPath(new URL('../../.env', import.meta.url))

configDotenv({path: envPath})

const ENV = {
    db_url: process.env.DATABASE_URL,
    resend_api_key: process.env.RESEND_API_KEY,
    auth_email_from: process.env.AUTH_EMAIL_FROM,
    auth_reset_url: process.env.AUTH_RESET_URL,
}

export default ENV;