// ~~/src/server/routes/dashboard.route.ts

// imports
import type { LNDKrubRequest, LNDKrubRouteFunc } from '@/server/routes'
import type { LightningService } from '@/server/services/lightning'
import type { Response } from 'express'
import { errorLnd } from '@/server/exceptions'
import { promisify } from 'node:util'

export default (lightning: LightningService): LNDKrubRouteFunc =>
  /**
   *
   * @param request
   * @param response
   * @returns
   */
  async (request: LNDKrubRequest, response: Response) => {
    console.log('/dashboard', [request.id])
    let result = await Promise.all([
      promisify(lightning.getInfo).bind(lightning)({}),
      promisify(lightning.listChannels).bind(lightning)({}),
    ]).catch(() => errorLnd(response))
    return response.send(result)
  }