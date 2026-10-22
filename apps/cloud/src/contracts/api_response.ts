import { FastifyReply } from "fastify";

export default function reply(
    message : string,
    statusCode : number,
    success : boolean,
    reply : FastifyReply
){

    return reply.status(statusCode ? statusCode : 200).send({
        message,
        success
    })
}