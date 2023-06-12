// ~~/src/server/routes/balance.route.ts

// imports
import type { BitcoinService } from '@/server/services/bitcoin'
import type { LNDKrubRequest } from '@/types/LNDKrubRequest'
import type { LNDKrubRouteFunc } from '@/types/LNDKrubRouteFunc'
import type { LightningService } from '@/server/services/lightning'
import type { Redis as RedisService } from 'ioredis'
import type { Response } from 'express'
import { User } from '@/server/models'
import { errorBadAuth, errorGeneralServerError } from '@/server/exceptions'

export default (
    bitcoin: BitcoinService,
    lightning: LightningService,
    redis: RedisService
  ): LNDKrubRouteFunc =>
  /**
   *
   * @param {LNDKrubRequest} request
   * @param {Express.Response} response
   * @returns {Express.Response}
   */
  async (request: LNDKrubRequest, response: Response): Promise<Response> => {
    let user = new User(bitcoin, lightning, redis)
    try {
      console.log('/balance', [request.uuid])
      if (!(await user.loadByAuthorization(request.headers.authorization))) {
        return errorBadAuth(response)
      }
      console.log('/balance', [request.uuid, 'userid: ' + user.getUserId()])
      if (!(await user.getAddress())) await user.generateAddress() // onchain address needed further
      let balance = await user.getBalance()
      if (balance < 0) balance = 0
      return response.send({ BTC: { AvailableBalance: balance } })
    } catch (err) {
      console.error('', [request.uuid, 'error getting balance:', err, 'userid:', user.getUserId()])
      return errorGeneralServerError(response)
    }
  }
