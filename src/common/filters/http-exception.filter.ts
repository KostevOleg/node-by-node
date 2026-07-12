import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorBody = isHttpException ? exception.getResponse() : null;

    let title = 'HTTP Error';
    let detail = 'Request failed';
    let errors: { message: string }[] | undefined;

    if (status === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      title = 'Internal Server Error';
      detail = 'An unexpected error occurred';
    }

    if (errorBody && typeof errorBody === 'object') {
      if ('error' in errorBody) {
        title = String(errorBody.error);
      }

      if ('message' in errorBody) {
        const message = errorBody.message;

        if (Array.isArray(message)) {
          detail = 'Request validation failed';
          errors = message.map((item) => ({ message: String(item) }));
        } else {
          detail = String(message);
        }
      }
    }

    response.status(status).json({
      type: `https://node-by-node.local/errors/http-${status}`,
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
      ...(errors ? { errors } : {}),
    });
  }
}
