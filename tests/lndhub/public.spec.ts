// ~~/tests/lndhub/public.spec.ts

// imports
import { Express } from 'express'
import { createLNDHub } from 'τ/mocks/lndhub'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'

let lndhub: Express

afterAll(() => {
  lndhub.emit('event:shutdown')
})

beforeAll(() => {
  lndhub = createLNDHub()
  lndhub.emit('event:startup')
})

// public routes
describe('GET /getinfo', () => {
  it('responds with lightning node daemon information', async () => {
    await supertest(lndhub)
      .get('/getinfo')
      .expect(200)
      .expect('Content-Type', /json/)
      .then(
        (response: { body: { uris: string[]; chains: { chain: string; network: string }[] } }) => {
          let { chains, uris } = response.body
          expect(chains).toBeTruthy()
          expect(chains).toBeTypeOf('object') // array
          expect(chains.length).toBe(1)
          expect(chains[0].chain).toBe('bitcoin')
          expect(chains[0].network).toBe('regtest')
          expect(uris).toBeTruthy()
          expect(uris).toBeTypeOf('object') // array
          expect(uris.length).toBe(1)
        }
      )
  })
})
