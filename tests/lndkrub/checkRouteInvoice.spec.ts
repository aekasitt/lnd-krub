// ~~/tests/lndkrub/checkRouteInvoice.spec.ts

// imports
import { Invoice, UserAuth } from '@/types'
import { LightningService } from '@/server/services/lightning'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { externalLND } from 'τ/configs'
import lndkrub from '@/index'
import { promisify } from 'node:util'
import { randomBytes } from 'node:crypto'
import supertest from 'supertest'

let lnext: LightningService

afterAll(() => {
  lndkrub.emit('event:shutdown')
})

beforeAll(async () => {
  lndkrub.emit('event:startup')
  lnext = new LightningService(
    externalLND.host,
    externalLND.macaroonPath,
    externalLND.port,
    externalLND.tlsCertPath
  )
})

describe('GET /checkrouteinvoice with no query', () => {
  let authHeaders: { Authorization: string }
  let login: string | null = null
  let password: string | null = null
  beforeAll(async () => {
    await supertest(lndkrub)
      .post('/create')
      .then((response: { body: { login: string; password: string } }) => {
        login = response.body.login
        password = response.body.password
      })
    await supertest(lndkrub)
      .post('/auth')
      .send({ login, password })
      .then((response: { body: UserAuth }) => {
        let { accessToken } = response.body
        authHeaders = { Authorization: `Bearer ${accessToken}` }
      })
  })
  it('responds with bad arguments error`', async () => {
    await supertest(lndkrub)
      .get('/checkrouteinvoice')
      .set(authHeaders)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response: { body: { code: number; error: boolean; message: string } }) =>
        expect(response.body).toStrictEqual({
          code: 6,
          error: true,
          message: 'Something went wrong. Please try again later',
        })
      )
  })
})

describe('GET /checkrouteinvoice with test payment request created internally', () => {
  let amt: number = 200
  let authHeaders: { Authorization: string }
  let invoice: string | null = null
  let login: string | null = null
  let memo: string = 'internal invoice'
  let password: string | null = null
  let recipient: { accessToken?: string; login: string; password: string }
  beforeAll(async () => {
    await supertest(lndkrub)
      .post('/create')
      .then((response: { body: { login: string; password: string } }) => {
        login = response.body.login
        password = response.body.password
      })
    await supertest(lndkrub)
      .post('/auth')
      .send({ login, password })
      .then((response: { body: UserAuth }) => {
        let { accessToken } = response.body
        authHeaders = { Authorization: `Bearer ${accessToken}` }
      })

    await supertest(lndkrub)
      .post('/create')
      .then(
        (response: { body: { login: string; password: string } }) => (recipient = response.body)
      )
    await supertest(lndkrub)
      .post('/auth')
      .send({ ...recipient })
      .then((response: { body: UserAuth }) => {
        recipient.accessToken = response.body.accessToken
      })
    await supertest(lndkrub)
      .post('/addinvoice')
      .set({ Authorization: `Bearer ${recipient.accessToken}` })
      .send({ amt, memo })
      .then((response: { body: Invoice }) => {
        invoice = response.body.payment_request
      })
  })

  it('responds with decoded internal invoice', async () => {
    await supertest(lndkrub)
      .get('/checkrouteinvoice')
      .query({ invoice })
      .set(authHeaders)
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response: { body: { description: string; num_satoshis: string } }) => {
        let { description, num_satoshis } = response.body
        expect(description).toBeTypeOf('string')
        expect(description).toStrictEqual(memo)
        expect(num_satoshis).toBeTypeOf('string')
        expect(+num_satoshis).toBe(amt)
      })
  })
})

describe('GET /checkrouteinvoice with test payment request created externally', () => {
  let amt: number = 200
  let authHeaders: { Authorization: string }
  let invoice: string | null = null
  let login: string | null = null
  let memo: string = 'external invoice'
  let password: string | null = null
  beforeAll(async () => {
    await supertest(lndkrub)
      .post('/create')
      .then((response: { body: { login: string; password: string } }) => {
        login = response.body.login
        password = response.body.password
      })
    await supertest(lndkrub)
      .post('/auth')
      .send({ login, password })
      .then((response: { body: UserAuth }) => {
        let { accessToken } = response.body
        authHeaders = { Authorization: `Bearer ${accessToken}` }
      })
    // external invoice
    let { payment_request } = await promisify(lnext.addInvoice).bind(lnext)({
      expiry: 20,
      memo,
      r_preimage: randomBytes(32).toString('base64'),
      value: amt,
    })
    invoice = payment_request
  })
  it('responds with decoded external invoice', async () => {
    await supertest(lndkrub)
      .get('/checkrouteinvoice')
      .query({ invoice })
      .set(authHeaders)
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response: { body: { description: string; num_satoshis: string } }) => {
        let { description, num_satoshis } = response.body
        expect(description).toBeTypeOf('string')
        expect(description).toStrictEqual(memo)
        expect(num_satoshis).toBeTypeOf('string')
        expect(+num_satoshis).toBe(amt)
      })
  })
})
