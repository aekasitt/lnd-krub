// ~~/tests/lndhub/auth.spec.ts

// imports
import { Express } from 'express'
import { createLNDHub } from 'τ/mocks/lndhub'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import supertest from 'supertest'

let lndhub: Express
let testLogin: string | null = null
let testPassword: string | null = null

afterAll(() => {
  lndhub.emit('event:shutdown')
})

beforeAll(async () => {
  lndhub = createLNDHub()
  lndhub.emit('event:startup')
  await supertest(lndhub)
    .post('/create')
    .send({})
    .set('Accept', 'application/json')
    .then((response: { body: { login: string; password: string; userId: string } }) => {
      let { login, password } = response.body
      // persistence
      testLogin = login
      testPassword = password
    })
})

describe('POST /auth x 2', () => {
  it('responds with accessToken and refreshToken key-values', async () => {
    let testAccessToken: string | null = null
    let testRefreshToken: string | null = null
    await supertest(lndhub)
      .post('/auth')
      .query({ type: 'auth' })
      .send({ login: testLogin, password: testPassword })
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response: { body: { access_token: string; refresh_token: string } }) => {
        let { access_token, refresh_token } = response.body
        expect(access_token).toBeTruthy()
        expect(access_token.length).toBe(40)
        expect(refresh_token).toBeTruthy()
        expect(refresh_token.length).toBe(40)
        // persistence
        testAccessToken = access_token
        testRefreshToken = refresh_token
      })
    await supertest(lndhub)
      .post('/auth')
      .query({ type: 'auth' })
      .send({ refresh_token: testRefreshToken })
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((response: { body: { access_token: string; refresh_token: string } }) => {
        let { access_token, refresh_token } = response.body
        expect(access_token).toBeTruthy()
        expect(access_token.length).toBe(40)
        expect(refresh_token).toBeTruthy()
        expect(refresh_token.length).toBe(40)
        expect(access_token).toStrictEqual(testAccessToken)
        expect(refresh_token).toStrictEqual(testRefreshToken)
      })
  })
})
