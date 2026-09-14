import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskRagQuestionDto {
  @ApiProperty({
    example: 'What is this document about?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question: string;
}

export class RagAnswerCitationDto {
  @ApiProperty()
  chunkIndex: number;

  @ApiProperty()
  sourceName: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  text: string;
}

export class RagAnswerResponseDto {
  @ApiProperty()
  fileId: string;

  @ApiProperty()
  question: string;

  @ApiProperty()
  answer: string;

  @ApiProperty({ type: [RagAnswerCitationDto] })
  citations: RagAnswerCitationDto[];
}
