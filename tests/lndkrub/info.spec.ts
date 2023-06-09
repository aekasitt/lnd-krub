/* ~~/tests/lndkrub/info.spec.ts */

// imports
import { Dashblob, UserAuth } from '@/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import lndkrub from '@/index'
import supertest from 'supertest'

let authHeaders: { Authorization: string }

afterAll(() => {
  lndkrub.emit('event:shutdown')
})

beforeAll(async () => {
  lndkrub.emit('event:startup')
  let testLogin: null | string = null
  let testPassword: null | string = null
  await supertest(lndkrub)
    .post('/create')
    .set('Accept', 'application/json')
    .then((response: { body: { login: string; password: string } }) => {
      let { login, password } = response.body
      testLogin = login
      testPassword = password
    })
  await supertest(lndkrub)
    .post('/auth')
    .send({ login: testLogin, password: testPassword })
    .set('Accept', 'application/json')
    .then((response: { body: UserAuth }) => {
      let { accessToken } = response.body
      authHeaders = { Authorization: `Bearer ${accessToken}` }
    })
})

describe('GET /getinfo', () => {
  it('responds with lightning node daemon information', async () => {
    await supertest(lndkrub)
      .get('/getinfo')
      .set(authHeaders)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response: { body: Dashblob }) => {
        let { chains, uris } = response.body
        expect(chains).toBeTruthy()
        expect(chains).toBeTypeOf('object') // array
        expect(chains.length).toBe(1)
        expect(chains[0].chain).toBe('bitcoin')
        expect(chains[0].network).toBe('regtest')
        expect(uris).toBeTruthy()
        expect(uris).toBeTypeOf('object') // array
        expect(uris.length).toBe(1)
      })
  })
})
