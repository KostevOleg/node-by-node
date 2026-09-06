import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ObjectStorageService } from '../src/files/storage/object-storage.service';
import { DocumentProcessingPublisher } from '../src/queue/document-processing/publisher';
import { QdrantVectorStoreService } from '../src/rag/core/qdrant-vector-store.service';
import { RagStatusEventsConsumer } from '../src/rag/realtime/rag-status-events.consumer';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ObjectStorageService)
      .useValue({})
      .overrideProvider(DocumentProcessingPublisher)
      .useValue({})
      .overrideProvider(QdrantVectorStoreService)
      .useValue({})
      .overrideProvider(RagStatusEventsConsumer)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
