import {FastifyInstance} from 'fastify'
import fastifyCors from '@fastify/cors'
import errorHandler from '../contracts/api-error'

export async function registerPlugins(app : FastifyInstance) {
    await app.register(fastifyCors, {
        origin: "*",
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })

    await app.register(errorHandler)
}

// IN THIS I NEED TO ADD THE ALL KIND OF SECURITY CHECKS TO MAKE SURE THAT APPLICATION IS WORKING OR NOT