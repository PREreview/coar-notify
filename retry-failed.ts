import * as BullMq from 'bullmq'
import { Duration } from 'effect'
import IoRedis from 'ioredis'

// const redis = new IoRedis.Redis('redis://:94db86ae25fd478ea89dfae90983bc5c@0.0.0.0:16379', {
//   enableOfflineQueue: false,
// })

const redis = new IoRedis.Redis('redis://0.0.0.0:58493', {
  enableOfflineQueue: false,
})

const queue = new BullMq.Queue('coar-notify', {
  connection: redis,
  defaultJobOptions: { delay: Duration.toMillis('10 seconds'), removeOnComplete: true, removeOnFail: false },
})

const jobIds = ['01713dfda62daf4bbe3d05edbdb3e21d']

for (const jobId of jobIds) {
  const job = await queue.getJob(jobId)
  if (!job) {
    continue
  }

  const state = await job.getState()

  if (state !== 'failed') {
    continue
  }

  await job.retry()
}

await queue.close()

redis.disconnect()
