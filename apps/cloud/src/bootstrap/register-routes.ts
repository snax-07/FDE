import { FastifyInstance } from "fastify";
import registerAuthRoutes from "../modules/auth/auth.routes";

export default async function registerRoutes(app : FastifyInstance) {
    app.get('/health' , (req , res) => {
        return res.status(200).send({
            message : "server is live",
            status : true
        })
    })

    await app.register(registerAuthRoutes, {prefix: '/api/v1/auth'})
}