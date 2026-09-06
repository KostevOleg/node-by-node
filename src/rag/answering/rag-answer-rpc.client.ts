import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import {
  DOCUMENT_PROCESSING_EXCHANGE,
  RAG_ANSWER_ROUTING_KEY,
} from 'src/queue/document-processing/constants';
import { assertDocumentProcessingTopology } from 'src/queue/document-processing/topology';
import { RagAnswerResponseDto } from '../dto/ask-rag-question.dto';
import { RagAnswerRequestMessage } from './messages/rag-answer-request.message';
import { RagAnswerResponseMessage } from './messages/rag-answer-response.message';

const RAG_ANSWER_TIMEOUT_MS = 30_000;

@Injectable()
export class RagAnswerRpcClient implements OnModuleInit, OnModuleDestroy {
  private channel?: Channel;
  private connection?: ChannelModel;
  private replyQueue?: string;
  private readonly pending = new Map<
    string,
    {
      resolve: (value: RagAnswerResponseDto) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await assertDocumentProcessingTopology(this.channel);

    const replyQueue = await this.channel.assertQueue('', {
      exclusive: true,
      autoDelete: true,
    });
    this.replyQueue = replyQueue.queue;

    await this.channel.consume(
      this.replyQueue,
      (message) => this.handleReply(message),
      { noAck: true },
    );
  }

  ask(
    organizationId: string,
    fileId: string,
    question: string,
  ): Promise<RagAnswerResponseDto> {
    if (!this.channel || !this.replyQueue) {
      throw new ServiceUnavailableException('RAG answer client is not ready');
    }

    const correlationId = randomUUID();
    const request: RagAnswerRequestMessage = {
      fileId,
      organizationId,
      question,
      correlationId,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(correlationId);
        reject(new ServiceUnavailableException('RAG answer request timed out'));
      }, RAG_ANSWER_TIMEOUT_MS);

      this.pending.set(correlationId, { resolve, reject, timer });

      const published = this.channel?.publish(
        DOCUMENT_PROCESSING_EXCHANGE,
        RAG_ANSWER_ROUTING_KEY,
        Buffer.from(JSON.stringify(request)),
        {
          persistent: true,
          contentType: 'application/json',
          correlationId,
          replyTo: this.replyQueue,
        },
      );

      if (!published) {
        clearTimeout(timer);
        this.pending.delete(correlationId);
        reject(new ServiceUnavailableException('RAG answer request failed'));
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new ServiceUnavailableException('RAG client closed'));
    }

    this.pending.clear();
    await this.channel?.close();
    await this.connection?.close();
  }

  private handleReply(message: ConsumeMessage | null): void {
    if (!message) {
      return;
    }

    const correlationId =
      typeof message.properties.correlationId === 'string'
        ? message.properties.correlationId
        : undefined;

    if (!correlationId) {
      return;
    }

    const pending = this.pending.get(correlationId);

    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(correlationId);

    try {
      const parsedResponse: unknown = JSON.parse(message.content.toString());

      if (!this.isRagAnswerResponse(parsedResponse)) {
        pending.reject(new ServiceUnavailableException('Invalid RAG response'));
        return;
      }

      const response = parsedResponse;

      if (response.ok) {
        pending.resolve(response);
        return;
      }

      if (response.statusCode === 404) {
        pending.reject(new NotFoundException(response.message));
        return;
      }

      if (response.statusCode === 400) {
        pending.reject(new BadRequestException(response.message));
        return;
      }

      pending.reject(new ServiceUnavailableException(response.message));
    } catch {
      pending.reject(new ServiceUnavailableException('Invalid RAG response'));
    }
  }

  private isRagAnswerResponse(
    response: unknown,
  ): response is RagAnswerResponseMessage {
    if (
      typeof response !== 'object' ||
      response === null ||
      !('ok' in response)
    ) {
      return false;
    }

    if (response.ok === true) {
      return (
        'fileId' in response &&
        typeof response.fileId === 'string' &&
        'question' in response &&
        typeof response.question === 'string' &&
        'answer' in response &&
        typeof response.answer === 'string' &&
        'citations' in response &&
        Array.isArray(response.citations)
      );
    }

    return (
      response.ok === false &&
      'statusCode' in response &&
      typeof response.statusCode === 'number' &&
      'message' in response &&
      typeof response.message === 'string'
    );
  }
}
