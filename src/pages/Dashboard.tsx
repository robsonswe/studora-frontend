import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import { simuladoService, concursoService, respostaService, questaoService } from '@/services/api';
import { formatDateTime, formatDificuldade, formatNivel } from '@/utils/formatters';
import * as Types from '@/types';
import { 
  ClipboardList, 
  PlusCircle, 
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [simulados, setSimulados] = useState<Types.SimuladoSummaryDto[]>([]);
  const [concursos, setConcursos] = useState<Types.ConcursoSummaryDto[]>([]);
  const [respostas, setRespostas] = useState<(Types.RespostaSummaryDto & { questao?: Types.QuestaoDetailDto })[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [expandedResposta, setExpandedResposta] = useState<string | number | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [simRes, concRes, respRes] = await Promise.all([
        simuladoService.getAll({ size: 5 }).catch(() => ({ content: [] })),
        concursoService.getAll({ size: 5 }).catch(() => ({ content: [] })),
        respostaService.getAll({ size: 100 }).catch(() => ({ content: [] }))
      ]);

      setSimulados(simRes.content);
      setConcursos(concRes.content);
      
      const recentRespostas = respRes.content.slice(0, 8);
      
      const enrichedRespostas = await Promise.all(
        recentRespostas.map(async (r: Types.RespostaSummaryDto) => {
          try {
            const qDetail = await questaoService.getById(r.questaoId);
            return { ...r, questao: qDetail };
          } catch {
            return r;
          }
        })
      );

      setRespostas(enrichedRespostas);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const count = respRes.content.filter((r: Types.RespostaSummaryDto) => new Date(r.createdAt) >= sevenDaysAgo).length;
      setWeeklyCount(count);
    } catch {
      // Data load failed — empty states will display
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const inProgressSimulado = simulados.find(s => s.startedAt && !s.finishedAt);

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <div className="animate-enter-1">
        <Header
          title="Bem-vindo de volta, Estudante"
          actions={
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/praticar')}
                className={`inline-flex items-center px-4 py-2.5 sm:py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  inProgressSimulado
                    ? 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-transparent'
                    : 'border border-transparent text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                }`}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Praticar
              </button>
            </div>
          }
        />
      </div>

      {/* Hero / Action Section */}
      {inProgressSimulado && (
        <div className="animate-enter-2">
          <div className="bg-indigo-600 rounded-2xl overflow-hidden relative hero-grid">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent pointer-events-none" />
            <div className="relative px-5 py-8 sm:px-8 sm:py-12 lg:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
              <div className="flex-1">
                <span className="px-3 py-1 rounded-full bg-indigo-500/60 text-indigo-100 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] mb-4 sm:mb-5 inline-block backdrop-blur-sm">
                  Em Andamento
                </span>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white leading-tight mb-2 sm:mb-3">{inProgressSimulado.nome}</h3>
                <p className="text-indigo-200/70 text-sm leading-relaxed max-w-lg">
                  Simulado pendente. Retome quando estiver pronto.
                </p>
              </div>
              <button
                onClick={() => navigate(`/simulados/${inProgressSimulado.id}`)}
                className="inline-flex items-center px-6 py-3.5 sm:px-8 sm:py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
              >
                Continuar Simulado
                <ChevronRight className="ml-2 w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 lg:space-y-10">
          
          {/* Meus Simulados — Primary Section */}
          <section className="animate-enter-3">
            <div className="flex items-baseline justify-between mb-4 sm:mb-5">
              <h2 className="text-lg font-semibold text-gray-900 tracking-[-0.01em]">Meus Simulados</h2>
              <Link to="/simulados" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded">
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-indigo-100/60 overflow-hidden divide-y divide-indigo-50/80">
              {simulados.length === 0 ? (
                <div className="px-5 py-12 sm:px-8 sm:py-16 text-center">
                  <ClipboardList className="w-10 h-10 text-indigo-200 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-1">Nenhum simulado criado ainda.</p>
                  <p className="text-xs text-gray-400 mb-4">Gere seu primeiro simulado a partir de uma prova ou disciplina.</p>
                  <button
                    onClick={() => navigate('/praticar')}
                    className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded"
                  >
                    Criar simulado
                  </button>
                </div>
              ) : (
                simulados.map((s) => (
                  <div key={s.id} className={`px-4 sm:px-6 py-4 sm:py-5 hover:bg-indigo-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${s.startedAt && !s.finishedAt ? 'border-l-[3px] border-l-amber-400' : 'border-l-[3px] border-l-transparent'}`}>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{s.nome}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs">
                        {s.banca && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100/50">{s.banca.nome}</span>
                        )}
                        {s.finishedAt ? (
                          <span className="flex items-center text-emerald-600 font-medium">
                            <CheckCircle className="w-3 h-3 mr-1" /> Finalizado em {new Date(s.finishedAt).toLocaleDateString()}
                          </span>
                        ) : s.startedAt ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-100">
                            <Clock className="w-3 h-3" /> Em andamento
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">Não iniciado</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/simulados/${s.id}`)}
                      className={`inline-flex items-center px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                        s.finishedAt 
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      {s.finishedAt ? 'Revisar' : s.startedAt ? 'Continuar' : 'Iniciar'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Histórico de Questões — Secondary Section */}
          <section className="animate-enter-4">
            <h2 className="text-base font-medium text-gray-500 mb-3 sm:mb-4">Histórico de Questões</h2>
            <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden divide-y divide-gray-100/80">
              {respostas.length === 0 ? (
                <div className="px-5 py-10 sm:px-8 sm:py-12 text-center">
                  <p className="text-sm text-gray-400">Suas respostas aparecerão aqui após resolver questões.</p>
                </div>
              ) : (
                respostas.map((r) => {
                  const isExpanded = expandedResposta === r.id;
                  return (
                    <div key={r.id}>
                      <button
                        onClick={() => setExpandedResposta(isExpanded ? null : r.id)}
                        className="w-full text-left px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-gray-50/60 transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
                      >
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${r.correta ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                          {r.correta ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {r.questao ? (
                            <p className="text-sm text-gray-700 truncate">
                              <span className="font-medium">{r.questao.subtemas[0]?.disciplinaNome}</span>
                              <span className="text-gray-400 mx-1.5">›</span>
                              <span className="text-gray-500">{r.questao.subtemas[0]?.temaNome}</span>
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">Questão #{r.questaoId}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-gray-400">{formatDateTime(r.createdAt)}</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-4 pt-1 bg-indigo-50/30 border-t border-indigo-50">
                          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:ml-10">
                            <div>
                              <span className="text-[0.6875rem] font-medium font-mono text-indigo-500 uppercase tracking-[0.05em]">Questão</span>
                              <p className="text-xs text-gray-700 font-medium mt-0.5">#{r.questaoId}</p>
                            </div>
                            {r.simuladoId && (
                              <div>
                                <span className="text-[0.6875rem] font-medium font-mono text-indigo-500 uppercase tracking-[0.05em]">Simulado</span>
                                <p className="text-xs text-indigo-600 font-medium mt-0.5">#{r.simuladoId}</p>
                              </div>
                            )}
                            {r.questao && (
                              <div>
                                <span className="text-[0.6875rem] font-medium font-mono text-indigo-500 uppercase tracking-[0.05em]">Assunto</span>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {r.questao.subtemas.map(s => `${s.disciplinaNome} › ${s.temaNome} › ${s.nome}`).join(' | ')}
                                </p>
                              </div>
                            )}
                            {r.questao && (
                              <div>
                                <span className="text-[0.6875rem] font-medium font-mono text-indigo-500 uppercase tracking-[0.05em]">Nível</span>
                                <p className="text-xs text-gray-700 font-medium mt-0.5">
                                  {(() => {
                                    const uniqueNiveis = Array.from(new Set((r.questao?.cargos || []).map(c => formatNivel(c.nivel))));
                                    if (uniqueNiveis.length === 0) return 'Não informado';
                                    if (uniqueNiveis.length === 1) return uniqueNiveis[0];
                                    const last = uniqueNiveis.pop();
                                    return `${uniqueNiveis.join(', ')} e ${last}`;
                                  })()}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-[0.6875rem] font-medium font-mono text-amber-600 uppercase tracking-[0.05em]">Dificuldade</span>
                              <p className="text-xs text-gray-700 font-medium mt-0.5">{formatDificuldade(r.dificuldade)}</p>
                            </div>
                            <div>
                              <span className="text-[0.6875rem] font-medium font-mono text-amber-600 uppercase tracking-[0.05em]">Tempo</span>
                              <p className="text-xs text-gray-700 font-medium mt-0.5">{r.tempoRespostaSegundos}s</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">
          
          {/* Provas — Tertiary, Flattened */}
          <section className="animate-enter-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 sm:mb-4">Provas Disponíveis</h2>
            <div className="space-y-2">
              {concursos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate('/concursos')}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-amber-200 hover:bg-amber-50/30 transition-colors group flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-amber-800 transition-colors">{c.instituicao.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="text-amber-600/70">{c.banca.nome}</span>
                      <span className="mx-1">·</span>
                      <span>{c.ano}</span>
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-400 transition-colors shrink-0 ml-3" />
                </button>
              ))}
              <Link to="/concursos" className="block text-center text-xs font-medium text-indigo-600 hover:text-indigo-700 pt-2 pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded">Ver todas as provas</Link>
            </div>
          </section>

          {/* Weekly Progress — Brand Amber */}
          <section className="animate-enter-5 bg-amber-50 rounded-2xl border border-amber-100 p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-semibold text-amber-900">Meta Semanal</h3>
            </div>
            <p className="text-xs text-amber-700/80 mb-5 sm:mb-6">Resolva 50 questões por semana para manter a retenção de conteúdo.</p>
            
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-4xl sm:text-5xl font-medium text-amber-900 tabular-nums font-mono tracking-[-0.03em] leading-none whitespace-nowrap">{weeklyCount}</span>
              <span className="text-sm text-amber-600 whitespace-nowrap ml-2">/ 50 questões</span>
            </div>
            <div className="w-full bg-amber-200/60 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min((weeklyCount / 50) * 100, 100)}%` }}
              ></div>
            </div>
            {weeklyCount >= 50 && (
              <p className="text-xs font-medium text-amber-700 mt-3">Meta semanal atingida.</p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;