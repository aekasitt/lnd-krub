// ~~/tests/lndkrub/pendingTransactions.spec.ts

// imports
import { BitcoinService } from '@/server/services/bitcoin'
import { Transaction, UserAuth } from '@/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import lndkrub from '@/index'
import supertest from 'supertest'

let bitcoin: BitcoinService
afterAll(() => {
  lndkrub.emit('event:shutdown')
})

beforeAll(async () => {
  lndkrub.emit('event:startup')
  bitcoin = new BitcoinService()
})

describe('GET /getpending when creating a fresh account', () => {
  let authHeaders: { Authorization: string }
  beforeAll(async () => {
    let login: string | null = null
    let password: string | null = null
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
  it('responds with a list of empty pending transactions', async () => {
    await supertest(lndkrub)
      .get('/getpending')
      .set(authHeaders)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response: { body: Transaction[] }) => {
        let transactions = response.body
        expect(transactions).toBeTruthy()
        expect(transactions).toBeTypeOf('object') // array
        expect(transactions.length).toBe(0)
      })
  })
})

describe('GET /getpending after sending new transaction to address', () => {
  let address: string | null = null
  let authHeaders: { Authorization: string }
  beforeAll(async () => {
    let login: string | null = null
    let password: string | null = null
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
      .get('/getbtc')
      .set(authHeaders)
      .then((response: { body: [{ address: string }] }) => {
        address = response.body[0].address
      })
    await bitcoin.sendToAddress(address, 10)
    await bitcoin.getRawMempool()
    await bitcoin.generateBlock(address)
  })
  it('responds with a list of one pending transaction', async () => {
    await supertest(lndkrub)
      .get('/getpending')
      .set(authHeaders)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response: { body: Transaction[] }) => {
        let transactions = response.body
        expect(transactions).toBeTruthy()
        expect(transactions).toBeTypeOf('object') // array
        expect(transactions.length).toBe(1)
      })
  })
})
