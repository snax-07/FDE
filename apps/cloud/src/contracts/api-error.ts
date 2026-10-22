import {FastifyError, FastifyInstance} from 'fastify'

export default async function errorHandler(app : FastifyInstance) {
    app.setErrorHandler((error : FastifyError, request , response) => {
        const statusCode = error.statusCode ?? 500;

        request.log.error(error);



            response.status(statusCode).send({
                success: false,
                message: statusCode >= 500
                    ? "Internal Server Error"
                    : error.message,
            });
    })
}