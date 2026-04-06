import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

export type QueueMessageType =
  | 'DECOMPOSE'
  | 'CONSENSUS'
  | 'MAP'
  | 'AGGREGATE'
  | 'INSIGHTS';

export interface QueueMessage {
  type: QueueMessageType;
  hotelId: string;
  payload: Record<string, unknown>;
}

// ── Local dev queue (in-memory, logs to console) ──
const localQueue: QueueMessage[] = [];

async function enqueueLocal(message: QueueMessage): Promise<void> {
  localQueue.push(message);
  console.log(`[LOCAL QUEUE] ${message.type} for hotel ${message.hotelId} (queue depth: ${localQueue.length})`);
}

export function getLocalQueue(): QueueMessage[] {
  return localQueue;
}

// ── Production SQS queue ──
async function enqueueSQS(message: QueueMessage): Promise<void> {
  const sqs = new SQSClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL!,
      MessageBody: JSON.stringify(message),
      MessageGroupId: message.hotelId,
    })
  );
}

// ── Auto-switch based on environment ──
export async function enqueue(message: QueueMessage): Promise<void> {
  if (process.env.SQS_QUEUE_URL === 'local' || !process.env.SQS_QUEUE_URL) {
    return enqueueLocal(message);
  }
  return enqueueSQS(message);
}
