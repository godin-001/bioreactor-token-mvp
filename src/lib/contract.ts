import { http, createPublicClient, formatEther } from 'viem'
import { monadTestnet } from 'viem/chains'

export const contractAddress = import.meta.env.VITE_BRT_CONTRACT_ADDRESS as `0x${string}` | undefined

export const bioreactorAbi = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'reactorCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'totalHarvestedKg',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'totalSupported',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'getReactor',
    inputs: [{ name: 'reactorId', type: 'uint256' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'city', type: 'string' },
      { name: 'species', type: 'string' },
      { name: 'tagline', type: 'string' },
      { name: 'proteinPct', type: 'uint256' },
      { name: 'waterSavedPct', type: 'uint256' },
      { name: 'biomassKg', type: 'uint256' },
      { name: 'supporters', type: 'uint256' },
      { name: 'totalSupportedWei', type: 'uint256' },
      { name: 'proofURI', type: 'string' },
    ],
  },
  {
    type: 'function',
    stateMutability: 'payable',
    name: 'supportReactor',
    inputs: [
      { name: 'reactorId', type: 'uint256' },
      { name: 'backerName', type: 'string' },
    ],
    outputs: [{ name: 'minted', type: 'uint256' }],
  },
] as const

export type Reactor = {
  id: number
  name: string
  city: string
  species: string
  tagline: string
  proteinPct: number
  waterSavedPct: number
  biomassKg: number
  supporters: number
  totalSupportedWei: bigint
  proofURI: string
}

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
})

export const formatMon = (value: bigint) => Number(formatEther(value)).toFixed(2)
