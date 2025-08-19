declare module '@google-cloud/tasks' {
  export interface CreateTaskRequest {
    parent: string;
    task: {
      httpRequest: {
        httpMethod: string;
        url: string;
        headers?: Record<string, string>;
        body?: Buffer | Uint8Array | string;
      };
      scheduleTime?: {
        seconds: number;
        nanos?: number;
      };
    };
  }

  export class CloudTasksClient {
    constructor();
    queuePath(project: string, location: string, queue: string): string;
    createTask(request: CreateTaskRequest): Promise<[any]>;
  }
}
