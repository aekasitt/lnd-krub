/* ~~/src/server/services/lightning.ts */

// imports
import { lnd } from '@/configs'
import {
  CallCredentials,
  ChannelCredentials,
  GrpcObject,
  Metadata,
  credentials,
  loadPackageDefinition,
} from '@grpc/grpc-js'
import { readFileSync } from 'fs'
import { PackageDefinition, loadSync } from '@grpc/proto-loader'

// consts
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
}
const packageDefinition: PackageDefinition = loadSync(lnd.protoPath, loaderOptions)
const protoDescriptor: GrpcObject = loadPackageDefinition(packageDefinition)

interface LnSvc {
  LnSvc: LnSvc
  new (url: string, creds: ChannelCredentials): LnSvc
  addInvoice: Function
  decodePayReq: Function
  describeGraph: Function
  getInfo: Function
  getTransactions: Function
  listChannels: Function
  listInvoices: Function
  listPayments: Function
  lookupInvoice: Function
  newAddress: Function
  queryRoutes: Function
  sendPaymentSync: Function
  sendToRouteSync: Function
}
const LnRpc = protoDescriptor.lnrpc as { Lightning?: LnSvc }

export class LightningService extends LnRpc.Lightning {
  constructor(
    host: string = lnd.host,
    macaroonPath: string = lnd.macaroonPath,
    port: number = lnd.port,
    tlsCertPath: string = lnd.tlsCertPath
  ) {
    let lndCert: Buffer = readFileSync(tlsCertPath)
    let sslCreds: ChannelCredentials = credentials.createSsl(lndCert)
    let macaroon: string = readFileSync(macaroonPath).toString('hex')
    let macaroonCreds: CallCredentials = credentials.createFromMetadataGenerator((_, callback) => {
      let metadata: Metadata = new Metadata()
      metadata.add('macaroon', macaroon)
      callback(null, metadata)
    })
    let creds: ChannelCredentials = credentials.combineChannelCredentials(sslCreds, macaroonCreds)
    super(`${host}:${port}`, creds)
  }
}

export default LightningService
