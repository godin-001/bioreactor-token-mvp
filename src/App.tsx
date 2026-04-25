import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Droplets,
  HeartPulse,
  Loader2,
  MapPin,
  Orbit,
  ShieldCheck,
  Sprout,
  Wallet,
  Waves,
} from 'lucide-react'
import {
  createWalletClient,
  custom,
  parseEther,
  type Address,
} from 'viem'
import { monadTestnet } from 'viem/chains'
import heroImage from './assets/hero.png'
import reactorDiagram from './assets/reactor-diagram.svg'
import './App.css'
import {
  bioreactorAbi,
  contractAddress,
  formatMon,
  publicClient,
  type Reactor,
} from './lib/contract'

declare global {
  interface Window {
    ethereum?: any
  }
}

const impactCards = [
  { label: 'Agua ahorrada', value: '89–94%', icon: Droplets },
  { label: 'Proteína estimada', value: '38–41%', icon: Sprout },
  { label: 'Señal onchain', value: 'Monad', icon: Orbit },
]

const reactorVisuals = ['lagoon', 'canopy', 'sunrise']

const defaultReactors: Reactor[] = [
  {
    id: 0,
    name: 'Wolffia One',
    city: 'Guadalajara',
    species: 'Wolffia globosa',
    tagline: 'Proteína sostenible en formato urbano',
    proteinPct: 40,
    waterSavedPct: 92,
    biomassKg: 180,
    supporters: 0,
    totalSupportedWei: 0n,
    proofURI: 'ipfs://wolffia-one-genesis',
  },
  {
    id: 1,
    name: 'Protein Pod',
    city: 'Zapopan',
    species: 'Wolffia globosa',
    tagline: 'Biomasa rastreable para alimento funcional',
    proteinPct: 38,
    waterSavedPct: 89,
    biomassKg: 120,
    supporters: 0,
    totalSupportedWei: 0n,
    proofURI: 'ipfs://protein-pod-genesis',
  },
  {
    id: 2,
    name: 'Green Loop',
    city: 'Tlaquepaque',
    species: 'Wolffia globosa',
    tagline: 'Microgranjas que convierten espacio vacío en nutrición',
    proteinPct: 41,
    waterSavedPct: 94,
    biomassKg: 210,
    supporters: 0,
    totalSupportedWei: 0n,
    proofURI: 'ipfs://green-loop-genesis',
  },
]

const explorerUrl = contractAddress
  ? `https://testnet.monadscan.com/address/${contractAddress}`
  : ''

function App() {
  const [walletAddress, setWalletAddress] = useState<Address | null>(null)
  const [walletChain, setWalletChain] = useState<string>('Sin conexión')
  const [loading, setLoading] = useState(false)
  const [supporting, setSupporting] = useState(false)
  const [txHash, setTxHash] = useState<string>('')
  const [error, setError] = useState('')
  const [supportAmount, setSupportAmount] = useState('0.05')
  const [supportName, setSupportName] = useState('Tu equipo')
  const [selectedReactor, setSelectedReactor] = useState(0)
  const [reactors, setReactors] = useState<Reactor[]>(defaultReactors)
  const [stats, setStats] = useState({
    reactorCount: 3,
    totalHarvestedKg: 510,
    totalSupportedWei: 0n,
    tokenSupply: 0n,
  })

  const hasContract = Boolean(contractAddress)
  const activeReactor = reactors[selectedReactor] ?? reactors[0] ?? defaultReactors[0]
  const brtSupply = Number(stats.tokenSupply / 10n ** 18n).toLocaleString()

  useEffect(() => {
    let alive = true

    async function load() {
      if (!hasContract) return
      try {
        setLoading(true)
        const [reactorCount, totalHarvestedKg, totalSupportedWei, tokenSupply] =
          await Promise.all([
            publicClient.readContract({
              address: contractAddress!,
              abi: bioreactorAbi,
              functionName: 'reactorCount',
            }),
            publicClient.readContract({
              address: contractAddress!,
              abi: bioreactorAbi,
              functionName: 'totalHarvestedKg',
            }),
            publicClient.readContract({
              address: contractAddress!,
              abi: bioreactorAbi,
              functionName: 'totalSupported',
            }),
            publicClient.readContract({
              address: contractAddress!,
              abi: bioreactorAbi,
              functionName: 'totalSupply',
            }),
          ])

        const nextReactors = await Promise.all(
          Array.from({ length: Number(reactorCount) }).map(async (_, index) => {
            const reactor = (await publicClient.readContract({
              address: contractAddress!,
              abi: bioreactorAbi,
              functionName: 'getReactor',
              args: [BigInt(index)],
            })) as [string, string, string, string, bigint, bigint, bigint, bigint, bigint, string]

            return {
              id: index,
              name: reactor[0],
              city: reactor[1],
              species: reactor[2],
              tagline: reactor[3],
              proteinPct: Number(reactor[4]),
              waterSavedPct: Number(reactor[5]),
              biomassKg: Number(reactor[6]),
              supporters: Number(reactor[7]),
              totalSupportedWei: reactor[8],
              proofURI: reactor[9],
            } satisfies Reactor
          }),
        )

        if (!alive) return

        setStats({
          reactorCount: Number(reactorCount),
          totalHarvestedKg: Number(totalHarvestedKg),
          totalSupportedWei,
          tokenSupply,
        })
        setReactors(nextReactors)
      } catch (err) {
        console.error(err)
        if (alive) {
          setError('No pude leer el contrato todavía. Si no está desplegado, primero corre el deploy.')
        }
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [hasContract])

  async function connectWallet() {
    setError('')
    if (!window.ethereum) {
      setError('Instala una wallet compatible para firmar acciones en la red.')
      return
    }

    const [address] = (await window.ethereum.request({
      method: 'eth_requestAccounts',
    })) as [Address]

    const chainId = await window.ethereum.request({ method: 'eth_chainId' })
    setWalletAddress(address)
    setWalletChain(chainId === '0x27db' ? 'Monad Testnet' : `Chain ${chainId}`)
  }

  async function support() {
    setError('')
    setTxHash('')

    if (!contractAddress) {
      setError('Primero despliega el contrato para activar los apoyos onchain.')
      return
    }
    if (!window.ethereum || !walletAddress) {
      setError('Conecta una wallet primero.')
      return
    }

    try {
      setSupporting(true)
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum),
      })

      const parsedValue = parseEther(supportAmount || '0')
      const hash = await walletClient.writeContract({
        account: walletAddress,
        address: contractAddress,
        abi: bioreactorAbi,
        functionName: 'supportReactor',
        args: [BigInt(selectedReactor), supportName],
        value: parsedValue,
      })

      setTxHash(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      const updated = [...reactors]
      updated[selectedReactor] = {
        ...updated[selectedReactor],
        supporters: updated[selectedReactor].supporters + 1,
        totalSupportedWei: updated[selectedReactor].totalSupportedWei + parsedValue,
      }
      setReactors(updated)
      setStats((current) => ({
        ...current,
        totalSupportedWei: current.totalSupportedWei + parsedValue,
        tokenSupply: current.tokenSupply + parsedValue * 1000n,
      }))
    } catch (err) {
      console.error(err)
      setError('No pude enviar la transacción. Revisa la wallet, saldo o la red.')
    } finally {
      setSupporting(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="hero glass">
        <div className="hero-copy">
          <span className="eyebrow">BioReactor Token · Monad Testnet</span>
          <h1>Proteína limpia. Infraestructura viva.</h1>
          <p className="lead">
            Biorreactores urbanos con señal ambiental clara y apoyo onchain en tiempo real.
          </p>

          <div className="hero-actions">
            <button className="primary" onClick={connectWallet} type="button">
              <Wallet size={18} />
              {walletAddress ? 'Wallet conectada' : 'Conectar wallet'}
            </button>
            <a className="secondary" href={explorerUrl || '#reactors'} target="_blank" rel="noreferrer">
              Ver contrato <ArrowUpRight size={18} />
            </a>
          </div>

          <div className="status-row">
            <span className="pill success">
              <ShieldCheck size={14} />
              {hasContract ? 'Contrato activo' : 'Contrato pendiente'}
            </span>
            <span className="pill">
              <Orbit size={14} />
              {walletAddress ? walletChain : 'Sin wallet'}
            </span>
            <span className="pill">
              <MapPin size={14} />
              Guadalajara · Zapopan · Tlaquepaque
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-card">
            <img className="hero-image" src={heroImage} alt="Biorreactor urbano" />
            <div className="hero-orb hero-orb-a" />
            <div className="hero-orb hero-orb-b" />
            <div className="hero-float glass">
              <span>Live impact</span>
              <strong>{formatMon(stats.totalSupportedWei)} MON</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="impact-strip">
        {impactCards.map((item) => {
          const Icon = item.icon
          return (
            <article className="impact-card glass" key={item.label}>
              <Icon size={20} />
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </article>
          )
        })}
      </section>

      <section className="dashboard-grid">
        <article className="glass stat-panel tall">
          <div className="panel-header">
            <span>Red activa</span>
            <strong>{hasContract ? 'Monad online' : 'Esperando deploy'}</strong>
          </div>
          <div className="stat-grid">
            <div>
              <span>Biomasa</span>
              <strong>{stats.totalHarvestedKg} kg</strong>
            </div>
            <div>
              <span>Reactores</span>
              <strong>{stats.reactorCount}</strong>
            </div>
            <div>
              <span>Apoyo</span>
              <strong>{formatMon(stats.totalSupportedWei)} MON</strong>
            </div>
            <div>
              <span>BRT</span>
              <strong>{brtSupply}</strong>
            </div>
          </div>
        </article>

        <article className="glass image-panel tall">
          <img src={reactorDiagram} alt="Diagrama de reactor" />
          <div className="image-caption">
            <span>Loop ambiental</span>
            <strong>Agua · luz · biomasa · comunidad</strong>
          </div>
        </article>
      </section>

      <section className="glass reactors-panel" id="reactors">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Reactores</span>
            <h2>Escoge el frente más fuerte para el demo</h2>
          </div>
          <span className="section-note">{loading ? 'Sincronizando...' : 'Listo para presentar'}</span>
        </div>

        <div className="reactor-grid">
          {reactors.map((reactor, index) => (
            <article
              key={reactor.id}
              className={`reactor-card ${reactor.id === selectedReactor ? 'selected' : ''}`}
              onClick={() => setSelectedReactor(reactor.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setSelectedReactor(reactor.id)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className={`reactor-thumb ${reactorVisuals[index % reactorVisuals.length]}`} />
              <div className="reactor-copy">
                <div>
                  <h3>{reactor.name}</h3>
                  <p>{reactor.city}</p>
                </div>
                <strong>{reactor.proteinPct}% proteína</strong>
              </div>
              <div className="mini-stats compact">
                <span>{reactor.biomassKg} kg</span>
                <span>{reactor.waterSavedPct}% agua</span>
                <span>{reactor.supporters} apoyos</span>
              </div>
            </article>
          ))}
        </div>

        <div className="reactor-spotlight">
          <div className="spotlight-copy">
            <span className="eyebrow">Spotlight</span>
            <h3>{activeReactor.name}</h3>
            <p>{activeReactor.tagline}</p>

            <div className="gauge-group">
              <div>
                <label>Proteína</label>
                <div className="gauge"><span style={{ width: `${activeReactor.proteinPct}%` }} /></div>
              </div>
              <div>
                <label>Ahorro de agua</label>
                <div className="gauge aqua"><span style={{ width: `${activeReactor.waterSavedPct}%` }} /></div>
              </div>
            </div>
          </div>

          <div className="spotlight-meta glass">
            <div>
              <span>Especie</span>
              <strong>{activeReactor.species}</strong>
            </div>
            <div>
              <span>Apoyo acumulado</span>
              <strong>{formatMon(activeReactor.totalSupportedWei)} MON</strong>
            </div>
            <div>
              <span>Proof URI</span>
              <strong>{activeReactor.proofURI.replace('ipfs://', '')}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="support-grid">
        <article className="glass panel form-panel">
          <div className="section-heading tight">
            <div>
              <span className="eyebrow">Acción</span>
              <h2>Apoyar reactor</h2>
            </div>
          </div>

          <label>
            Nombre
            <input value={supportName} onChange={(e) => setSupportName(e.target.value)} />
          </label>

          <label>
            Reactor
            <select
              value={selectedReactor}
              onChange={(e) => setSelectedReactor(Number(e.target.value))}
            >
              {reactors.map((reactor) => (
                <option key={reactor.id} value={reactor.id}>
                  {reactor.name} · {reactor.city}
                </option>
              ))}
            </select>
          </label>

          <label>
            MON
            <input
              value={supportAmount}
              onChange={(e) => setSupportAmount(e.target.value)}
              inputMode="decimal"
            />
          </label>

          <button className="primary wide" type="button" onClick={support} disabled={supporting}>
            {supporting ? <Loader2 className="spin" size={18} /> : <HeartPulse size={18} />}
            {supporting ? 'Enviando...' : 'Apoyar en Monad'}
          </button>

          {txHash ? <p className="hint">Tx: {txHash.slice(0, 10)}…{txHash.slice(-8)}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="glass panel summary-panel">
          <div className="section-heading tight">
            <div>
              <span className="eyebrow">Pitch view</span>
              <h2>Lo que ve el jurado</h2>
            </div>
          </div>

          <div className="summary-cards">
            <div>
              <Waves size={18} />
              <strong>Visual limpio</strong>
              <span>Impacto claro en segundos.</span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <strong>Prueba pública</strong>
              <span>Actividad verificable en cadena.</span>
            </div>
            <div>
              <HeartPulse size={18} />
              <strong>Participación</strong>
              <span>Apoyo simple con wallet.</span>
            </div>
          </div>

          <div className="footer-note">
            <p>{hasContract ? `Contrato: ${contractAddress}` : 'Contrato pendiente de despliegue.'}</p>
            {hasContract ? (
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                Abrir explorer <ArrowUpRight size={16} />
              </a>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
