import * as nodeFileSystem from 'fs';
import * as nodePath from 'path';
import * as nodeHttp from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

export const httpServer = nodeHttp.createServer(function (
  incomingMessage: IncomingMessage,
  serverResponse: ServerResponse
) {
  const projectRootDirectory = nodePath.resolve(nodePath.dirname(''));
  const requestedFilePath =
    projectRootDirectory + (incomingMessage.url === '/' ? '/front/index.html' : '/front' + incomingMessage.url);

  nodeFileSystem.readFile(requestedFilePath, function (error: NodeJS.ErrnoException | null, fileData: Buffer) {
    if (error) {
      serverResponse.writeHead(404);
      serverResponse.end(JSON.stringify(error));
      return;
    }
    serverResponse.writeHead(200);
    serverResponse.end(fileData);
  });
});
