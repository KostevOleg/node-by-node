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

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      const responseChunks: Buffer[] = [];

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

      socket.on('error', () => {
        reject(new ServiceUnavailableException('Virus scanner is unavailable'));
      });

      socket.on('end', () => {
        const response = Buffer.concat(responseChunks).toString('utf8');

        if (response.includes('FOUND')) {
          reject(new BadRequestException('File failed virus scan'));
          return;
        }

        if (response.includes('OK')) {
          resolve();
          return;
        }

        reject(new ServiceUnavailableException('Virus scan failed'));
      });
    });
  }
}
