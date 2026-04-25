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

const story = [
  {
    title: 'Biomasa real, entendible al instante',
    text: 'Pequeñas granjas de Wolffia convierten espacios mínimos en proteína sostenible, trazable y medible.',
  },
  {
    title: 'Cada reactor cuenta una historia',
    text: 'La audiencia ve dónde está, cuánto produce, cuánto ahorra y quién lo está impulsando.',
  },
  {
    title: 'Monad detrás del telón',
    text: 'Las acciones importantes quedan registradas en la red para demostrar que la historia sí pasó.',
  },
]

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

      const hash = await walletClient.writeContract({
        account: walletAddress,
        address: contractAddress,
        abi: bioreactorAbi,
        functionName: 'supportReactor',
        args: [BigInt(selectedReactor), supportName],
        value: parseEther(supportAmount || '0'),
      })

      setTxHash(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      const updated = [...reactors]
      updated[selectedReactor] = {
        ...updated[selectedReactor],
        supporters: updated[selectedReactor].supporters + 1,
        totalSupportedWei:
          updated[selectedReactor].totalSupportedWei + parseEther(supportAmount || '0'),
      }
      setReactors(updated)
      setStats((current) => ({
        ...current,
        totalSupportedWei:
          current.totalSupportedWei + parseEther(supportAmount || '0'),
        tokenSupply: current.tokenSupply + parseEther(supportAmount || '0') * 1000n,
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
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Monad Blitz Guadalajara · Demo onchain</p>
          <h1>BioReactor Token</h1>
          <p className="lead">
            Una historia simple: microgranjas urbanas que producen proteína sostenible,
            registran sus avances en Monad y permiten que cualquiera apoye el siguiente ciclo.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={connectWallet} type="button">
              <Wallet size={18} />
              {walletAddress ? 'Wallet conectada' : 'Conectar wallet'}
            </button>
            <a className="secondary" href={explorerUrl || '#pitch'} target="_blank" rel="noreferrer">
              Ver contrato <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="status-row">
            <span className="pill success">
              <ShieldCheck size={14} />
              {hasContract ? 'Contrato listo en Monad testnet' : 'Pendiente de deploy'}
            </span>
            <span className="pill">
              <Orbit size={14} />
              {walletAddress ? walletChain : 'Sin wallet'}
            </span>
          </div>
        </div>

        <div className="hero-card glass">
          <div className="metric-main">
            <span>Señal onchain</span>
            <strong>{hasContract ? 'Activa' : 'En preparación'}</strong>
            <p>
              {hasContract
                ? 'La demo ya puede leer el contrato, mostrar métricas y recibir apoyos.'
                : 'La app ya está lista para conectar el contrato cuando termine el deploy.'}
            </p>
          </div>
          <div className="metric-grid">
            <article>
              <Droplets />
              <strong>{stats.totalHarvestedKg} kg</strong>
              <span>biomasa total</span>
            </article>
            <article>
              <Sprout />
              <strong>{stats.reactorCount}</strong>
              <span>reactores</span>
            </article>
            <article>
              <HeartPulse />
              <strong>{formatMon(stats.totalSupportedWei)} MON</strong>
              <span>apoyo acumulado</span>
            </article>
            <article>
              <Wallet />
              <strong>{Number(stats.tokenSupply / 10n ** 18n).toLocaleString()}</strong>
              <span>BRT emitidos</span>
            </article>
          </div>
        </div>
      </section>

      <section className="story-grid">
        {story.map((item) => (
          <article className="glass story-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="glass panel">
          <div className="panel-title">
            <h2>¿Cómo se entiende en 10 segundos?</h2>
            <span>Para público no técnico</span>
          </div>
          <div className="steps">
            <div>
              <span>1</span>
              <p>La planta crece en un módulo pequeño y controlado.</p>
            </div>
            <div>
              <span>2</span>
              <p>El avance se registra para que no quede en promesa.</p>
            </div>
            <div>
              <span>3</span>
              <p>La gente apoya el proyecto y ve el impacto en pantalla.</p>
            </div>
          </div>
        </div>

        <div className="glass panel">
          <div className="panel-title">
            <h2>Pitch visual</h2>
            <span>Una frase que gana audiencias</span>
          </div>
          <p className="pitch-text">
            “Convertimos agua, luz y espacio mínimo en proteína sostenible con evidencia pública y apoyo comunitario.”
          </p>
          <div className="badge-row">
            <span className="pill"><MapPin size={14} /> Guadalajara</span>
            <span className="pill"><Waves size={14} /> IoT + blockchain</span>
            <span className="pill"><Sprout size={14} /> Wolffia globosa</span>
          </div>
        </div>
      </section>

      <section className="glass panel reactors-panel">
        <div className="panel-title">
          <h2>Reactores vivos</h2>
          <span>{loading ? 'Leyendo datos...' : 'Datos listos para demo'}</span>
        </div>
        <div className="reactor-grid">
          {reactors.map((reactor) => (
            <article
              key={reactor.id}
              className={`reactor-card ${reactor.id === selectedReactor ? 'selected' : ''}`}
              onClick={() => setSelectedReactor(reactor.id)}
              role="button"
              tabIndex={0}
            >
              <div>
                <h3>{reactor.name}</h3>
                <p>
                  {reactor.city} · {reactor.species}
                </p>
              </div>
              <strong>{reactor.proteinPct}% proteína</strong>
              <p>{reactor.tagline}</p>
              <div className="mini-stats">
                <span>{reactor.biomassKg} kg</span>
                <span>{reactor.waterSavedPct}% agua ahorrada</span>
                <span>{reactor.supporters} apoyos</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="support-grid">
        <div className="glass panel form-panel">
          <div className="panel-title">
            <h2>Apoya el reactor</h2>
            <span>Firma simple, impacto visible</span>
          </div>

          <label>
            Nombre para mostrar
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
            MON de apoyo
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
        </div>

        <div className="glass panel summary-panel">
          <div className="panel-title">
            <h2>Lo que ve la audiencia</h2>
            <span>Sin tecnicismos</span>
          </div>
          <ul className="summary-list">
            <li>Una historia visual con números claros.</li>
            <li>Un contrato que prueba actividad real en la red.</li>
            <li>Un gesto simple para apoyar el crecimiento del reactor.</li>
            <li>Un pitch que mezcla impacto, tecnología y comunidad.</li>
          </ul>
          <div className="footer-note">
            <p>
              {hasContract
                ? `Contrato: ${contractAddress}`
                : 'Contrato pendiente de despliegue.'}
            </p>
            {hasContract ? (
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                Abrir explorer <ArrowUpRight size={16} />
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
