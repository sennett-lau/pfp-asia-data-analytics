import { EventLog, ethers, formatEther } from 'ethers'
import fs from 'fs'
import path from 'path'
import { ERC20Transfer } from '../types'
import { provider } from '../utils'
import { PFP_ASIA_CONTRACT_ADDRESS, PFP_ASIA_CONTRACT_DEPLOY_BLOCK } from '../utils/config'

const contractABI = ['event ERC20Transfer(address indexed from, address indexed to, uint256 amount)']

const contract = new ethers.Contract(PFP_ASIA_CONTRACT_ADDRESS, contractABI, provider)

const SAVE_FILE_NAME = 'erc20-transfers'

const BLOCK_BATCH_SIZE = 1000

const getERC20TransferEvents = async (
  fromBlock: number,
  endBlock: number,
): Promise<{
  data: ERC20Transfer[]
  latestTransactionIndex: number
}> => {
  const transferEventFilter = contract.filters.ERC20Transfer()

  let latestTransactionIndex = 0

  const allData: ERC20Transfer[] = []

  while (fromBlock < endBlock) {
    const toBlock = fromBlock + BLOCK_BATCH_SIZE > endBlock ? endBlock : fromBlock + BLOCK_BATCH_SIZE

    console.log(`Fetching events from block ${fromBlock} to ${toBlock}, there are ${endBlock - fromBlock} blocks left`)

    const events = await contract.queryFilter(transferEventFilter, fromBlock, toBlock)

    const data = events.map((event) => {
      const e = event as EventLog
      return {
        from: e!.args![0],
        to: e!.args![1],
        amount: parseFloat(formatEther(e!.args![2])),
      }
    })

    latestTransactionIndex = events[events.length - 1].transactionIndex

    allData.push(...data)

    fromBlock = toBlock
  }

  return { data: allData, latestTransactionIndex }
}

const saveAsCsv = (data: ERC20Transfer[]) => {
  const csv = data.map((d) => `${d.from},${d.to},${d.amount}`).join('\n')

  const dataPath = path.join(__dirname, '..', 'data', `${SAVE_FILE_NAME}.csv`)

  fs.writeFileSync(dataPath, csv)

  console.log(`Data saved to ${dataPath}`)
}

const saveWaypoints = (endBlock: number, latestTransactionIndex: number) => {
  const waypoints = {
    latestBlock: endBlock,
    latestTransactionIndex,
  }

  const dataPath = path.join(__dirname, '..', 'data', 'waypoints', `${SAVE_FILE_NAME}.json`)

  fs.writeFileSync(dataPath, JSON.stringify(waypoints))

  console.log(`Waypoints saved to ${dataPath}`)
}

const main = async () => {
  const startBlock = PFP_ASIA_CONTRACT_DEPLOY_BLOCK
  const latestBlockNumber = await provider.getBlockNumber()

  const data = await getERC20TransferEvents(startBlock, latestBlockNumber)

  saveAsCsv(data.data)

  saveWaypoints(latestBlockNumber, data.latestTransactionIndex)
}

main()
