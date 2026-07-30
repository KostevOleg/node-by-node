import { describe, expect, it, jest } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import * as net from 'node:net';
import { VirusScanService } from './virus-scan.service';

jest.mock('node:net', () => ({
  createConnection: jest.fn(),
}));

class FakeSocket extends EventEmitter {
  destroy = jest.fn();
  end = jest.fn();
  setTimeout = jest.fn();
  write = jest.fn();
}

describe('VirusScanService', () => {
  it('fails closed when the ClamAV socket times out', async () => {
    const socket = new FakeSocket();
    const configService = {
      get: jest.fn().mockReturnValue(250),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'CLAMAV_HOST') {
          return '127.0.0.1';
        }

        if (key === 'CLAMAV_PORT') {
          return 3310;
        }

        throw new Error(`Unexpected key ${key}`);
      }),
    };

    jest
      .mocked(net.createConnection)
      .mockReturnValue(socket as unknown as net.Socket);

    const service = new VirusScanService(
      configService as unknown as ConfigService,
    );
    const scan = service.assertClean(Buffer.from('file'));

    socket.emit('timeout');

    await expect(scan).rejects.toThrow(ServiceUnavailableException);
    expect(socket.setTimeout).toHaveBeenCalledWith(250);
    expect(socket.destroy).toHaveBeenCalled();
  });
});
