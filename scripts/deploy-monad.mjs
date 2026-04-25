import fs from 'node:fs'
import path from 'node:path'
import solc from 'solc'
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatEther,
  http,
  parseAbi,
  parseEther,
} from 'viem'
import { monadTestnet } from 'viem/chains'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'

const root = process.cwd()
const envPath = path.join(root, '.env.local')

function readEnvFile() {
  if (!fs.existsSync(envPath)) return {}
  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf('=')
        return [line.slice(0, idx), line.slice(idx + 1)]
      }),
  )
}

function upsertEnv(next) {
  const current = readEnvFile()
  const merged = { ...current, ...next }
  const serialized = Object.entries(merged)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  fs.writeFileSync(envPath, `${serialized}\n`, { mode: 0o600 })
}

function findImports(importPath) {
  const localPath = path.resolve(root, importPath)
  const nodeModulePath = path.resolve(root, 'node_modules', importPath)

  if (fs.existsSync(localPath)) {
    return { contents: fs.readFileSync(localPath, 'utf8') }
  }
  if (fs.existsSync(nodeModulePath)) {
    return { contents: fs.readFileSync(nodeModulePath, 'utf8') }
  }
  return { error: `File not found: ${importPath}` }
}

function compileContract() {
  const contractPath = path.join(root, 'contracts', 'BioReactorHub.sol')
  const source = fs.readFileSync(contractPath, 'utf8')

  const input = {
    language: 'Solidity',
    sources: {
      'contracts/BioReactorHub.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'prague',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
  if (output.errors?.length) {
    const fatal = output.errors.filter((entry) => entry.severity === 'error')
    if (fatal.length) {
      throw new Error(fatal.map((entry) => entry.formattedMessage).join('\n'))
    }
  }

  const contract = output.contracts['contracts/BioReactorHub.sol'].BioReactorHub
  return { abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` }
}

async function requestFaucet(address) {
  const response = await fetch('https://agents.devnads.com/v1/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainId: 10143, address }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Faucet failed: ${response.status} ${text}`)
  }

  return response.json()
}

async function waitForFunding(client, address) {
  for (let i = 0; i < 20; i += 1) {
    const balance = await client.getBalance({ address })
    if (balance > 0n) return balance
    await new Promise((resolve) => setTimeout(resolve, 4000))
  }
  throw new Error('Wallet was not funded in time. Use https://faucet.monad.xyz and rerun the deploy script.')
}

async function main() {
  const env = { ...readEnvFile(), ...process.env }
  let privateKey = env.DEPLOYER_PRIVATE_KEY

  if (!privateKey) {
    privateKey = generatePrivateKey()
    upsertEnv({ DEPLOYER_PRIVATE_KEY: privateKey })
    console.log(`Generated deployer wallet and saved it to ${envPath}`)
  }

  const account = privateKeyToAccount(privateKey)
  const publicClient = createPublicClient({ chain: monadTestnet, transport: http() })
  const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http() })

  let balance = await publicClient.getBalance({ address: account.address })
  if (balance === 0n) {
    console.log(`Requesting testnet MON from faucet for ${account.address}...`)
    await requestFaucet(account.address)
    balance = await waitForFunding(publicClient, account.address)
  }

  console.log(`Deployer balance: ${formatEther(balance)} MON`)

  const { abi, bytecode } = compileContract()
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [account.address],
    account,
    chain: monadTestnet,
  })

  console.log(`Deployment tx: ${hash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const contractAddress = receipt.contractAddress
  if (!contractAddress) {
    throw new Error('No contract address returned after deployment')
  }

  upsertEnv({ VITE_BRT_CONTRACT_ADDRESS: contractAddress })

  console.log(`Contract deployed at: ${contractAddress}`)
  console.log(`Explorer: https://testnet.monadscan.com/address/${contractAddress}`)

  const explorerAbi = parseAbi([
    'function reactorCount() view returns (uint256)',
    'function totalHarvestedKg() view returns (uint256)',
  ])

  const reactorCount = await publicClient.readContract({
    address: contractAddress,
    abi: explorerAbi,
    functionName: 'reactorCount',
  })
  const totalHarvestedKg = await publicClient.readContract({
    address: contractAddress,
    abi: explorerAbi,
    functionName: 'totalHarvestedKg',
  })

  console.log(`Seeded reactors: ${reactorCount.toString()}`)
  console.log(`Harvested biomass: ${totalHarvestedKg.toString()} kg`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
