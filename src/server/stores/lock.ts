/* ~~/src/server/stores/lock.ts */

// imports
import { cache } from '@/server/stores'

/**
 * Tries to obtain lock in single-threaded Redis.
 * Returns TRUE if success.
 *
 * @returns {Promise<boolean>}
 */
export const obtainLock = async (lockKey: string): Promise<boolean> => {
  const timestamp = +new Date()
  let setResult = await cache.setnx(lockKey, timestamp)
  if (!setResult) {
    // it already held a value - failed locking
    return false
  }

  // success - got lock
  await cache.expire(lockKey, 5 * 60)
  // lock expires in 5 mins just for any case
  return true
}

/**
 * Releases the lock set on redis
 */
export const releaseLock = async (lockKey: string): Promise<number> => await cache.del(lockKey)
