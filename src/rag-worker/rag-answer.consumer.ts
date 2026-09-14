import {
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { RAG_ANSWER_QUEUE } from 'src/queue/document-processing/constants';
import { assertDocumentProcessingTopology } from 'src/queue/document-processing/topology';
import { RagAnswerProcessorService } from 'src/rag/answering/rag-answer-processor.service';
import { RagAnswerRequestMessage } from 'src/rag/answering/messages/rag-answer-request.message';
import {
  RagAnswerErrorResponseMessage,
  RagAnswerResponseMessage,
} from 'src/rag/answering/messages/rag-answer-response.message';

@Injectable()
export class RagAnswerConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RagAnswerConsumer.name);
  private channel?: Channel;
  private connection?: ChannelModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly ragAnswerProcessorService: RagAnswerProcessorService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await assertDocumentProcessingTopology(this.channel);
    await this.channel.prefetch(1);
    await this.channel.consume(RAG_ANSWER_QUEUE, (message) => {
      void this.handleMessage(message);
    });

    this.logger.log('RAG answer consumer started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    let response: RagAnswerResponseMessage;

    try {
      const request = JSON.parse(
        message.content.toString(),
      ) as RagAnswerRequestMessage;

      response = {
        ok: true,
        ...(await this.ragAnswerProcessorService.answerQuestion(
          request.organizationId,
          request.fileId,
          request.question,
        )),
      };
    } catch (error) {
      const errorResponse = this.createErrorResponse(error);

      response = errorResponse;
      this.logger.error('RAG answer request failed', errorResponse.message);
    }

    this.reply(message, response);
    this.channel.ack(message);
  }

  private reply(
    message: ConsumeMessage,
    response: RagAnswerResponseMessage,
  ): void {
    const replyTo =
      typeof message.properties.replyTo === 'string'
        ? message.properties.replyTo
        : undefined;

    if (!replyTo) {
      return;
    }

    const correlationId =
      typeof message.properties.correlationId === 'string'
        ? message.properties.correlationId
        : undefined;

    this.channel?.sendToQueue(replyTo, Buffer.from(JSON.stringify(response)), {
      contentType: 'application/json',
      correlationId,
    });
  }

  private createErrorResponse(error: unknown): RagAnswerErrorResponseMessage {
    if (error instanceof HttpException) {
      const response: unknown = error.getResponse();
      const message =
        typeof response === 'object' &&
        response !== null &&
        'message' in response
          ? String(response.message)
          : error.message;

      return {
        ok: false,
        statusCode: error.getStatus(),
        message,
      };
    }

    return {
      ok: false,
      statusCode: 503,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
