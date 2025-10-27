import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { resumeProcessingQueue, emailQueue, candidateMatchingQueue } from './queues';

export function setupBullDashboard(app: any) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const { addQueue, removeQueue, replaceQueues } = createBullBoard({
    queues: [
      new BullMQAdapter(resumeProcessingQueue),
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(candidateMatchingQueue),
    ],
    serverAdapter: serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  return { addQueue, removeQueue, replaceQueues };
}