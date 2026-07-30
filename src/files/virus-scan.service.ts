import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';

@Injectable()
export class VirusScanService {
  constructor(private readonly configService: ConfigService) {}

  assertClean(buffer: Buffer): Promise<void> {
    const host = this.configService.getOrThrow<string>('CLAMAV_HOST');
    const port = this.configService.getOrThrow<number>('CLAMAV_PORT');
    const timeoutMs = this.configService.get<number>(
      'CLAMAV_TIMEOUT_MS',
      10_000,
    );

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      const responseChunks: Buffer[] = [];
      let settled = false;

      const fail = (error: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(error);
      };

      const succeed = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve();
      };

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        const size = Buffer.alloc(4);

        size.writeUInt32BE(buffer.length, 0);
        socket.write('zINSTREAM\0');
        socket.write(size);
        socket.write(buffer);
        socket.write(Buffer.alloc(4));
        socket.end();
      });

      socket.on('data', (chunk: Buffer) => {
        responseChunks.push(chunk);
      });

      socket.on('timeout', () => {
        socket.destroy();
        fail(new ServiceUnavailableException('Virus scanner timed out'));
      });

      socket.on('error', () => {
        fail(new ServiceUnavailableException('Virus scanner is unavailable'));
      });

      socket.on('end', () => {
        const response = Buffer.concat(responseChunks).toString('utf8');

        if (response.includes('FOUND')) {
          fail(new BadRequestException('File failed virus scan'));
          return;
        }

        if (response.includes('OK')) {
          succeed();
          return;
        }

        fail(new ServiceUnavailableException('Virus scan failed'));
      });
    });
  }
}
