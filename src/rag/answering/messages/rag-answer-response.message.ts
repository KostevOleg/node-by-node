import { RagSearchResult } from 'src/rag/core/qdrant-vector-store.service';

export type RagAnswerSuccessResponseMessage = {
  ok: true;
  fileId: string;
  question: string;
  answer: string;
  citations: RagSearchResult[];
};

export type RagAnswerErrorResponseMessage = {
  ok: false;
  statusCode: number;
  message: string;
};

export type RagAnswerResponseMessage =
  | RagAnswerSuccessResponseMessage
  | RagAnswerErrorResponseMessage;
