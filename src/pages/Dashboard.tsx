import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import { simuladoService, concursoService, respostaService } from '@/services/api';
import { formatDateTime, formatDificuldade } from '@/utils/formatters';
import * as Types from '@/types';
import { 
  ClipboardList, 
  FileSignature, 
  History, 
  PlusCircle, 
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Award
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [simulados, setSimulados] = useState<Types.SimuladoSummaryDto[]>([]);
  const [concursos, setConcursos] = useState<Types.ConcursoSummaryDto[]>([]);
  const [respostas, setRespostas] = useState<Types.RespostaSummaryDto[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [simRes, concRes, respRes] = await Promise.all([
        simuladoService.getAll({ size: 5 }).catch(() => ({ content: [] })),
        concursoService.getAll({ size: 5 }).catch(() => ({ content: [] })),
        // Fetch more to accurately calculate weekly progress
        respostaService.getAll({ size: 100 }).catch(() => ({ content: [] }))
      ]);

      setSimulados(simRes.content);
      setConcursos(concRes.content);
      setRespostas(respRes.content.slice(0, 8)); // Keep 8 for the history list

      // Calculate weekly count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const count = respRes.content.filter((r: any) => new Date(r.createdAt) >= sevenDaysAgo).length;
      setWeeklyCount(count);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
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
    <div className="space-y-8">
      <Header
        title="Bem-vindo de volta, Estudante"
        actions={
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/praticar')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Praticar
            </button>
          </div>
        }
      />

      {/* Hero / Action Section */}
      {inProgressSimulado && (
        <div className="bg-indigo-600 rounded-2xl shadow-xl overflow-hidden border border-indigo-500">
          <div className="px-6 py-8 sm:px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <span className="px-3 py-1 rounded-full bg-indigo-500 text-indigo-100 text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                Em Andamento
              </span>
              <h3 className="text-2xl font-extrabold text-white mb-2">{inProgressSimulado.nome}</h3>
              <p className="text-indigo-100 opacity-90 max-w-xl">
                Você tem um simulado pendente. Continue de onde parou para manter seu ritmo de estudos!
              </p>
            </div>
            <button
              onClick={() => navigate(`/simulados/${inProgressSimulado.id}`)}
              className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              Continuar Simulado
              <ChevronRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Meus Simulados */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                  <ClipboardList className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Meus Simulados Recentes</h2>
              </div>
              <Link to="/simulados" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Ver todos</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {simulados.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <p>Você ainda não gerou nenhum simulado.</p>
                </div>
              ) : (
                simulados.map((s) => (
                  <div key={s.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-gray-900 truncate mb-1">{s.nome}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {s.banca && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{s.banca.nome}</span>}
                        {s.finishedAt ? (
                          <span className="flex items-center text-green-600 font-medium">
                            <CheckCircle className="w-3 h-3 mr-1" /> Finalizado em {new Date(s.finishedAt).toLocaleDateString()}
                          </span>
                        ) : s.startedAt ? (
                          <span className="flex items-center text-yellow-600 font-medium">
                            <Clock className="w-3 h-3 mr-1" /> Em andamento
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">Não iniciado</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/simulados/${s.id}`)}
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        s.finishedAt 
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
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

          {/* Atividade Recente (Histórico de Respostas) */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                  <History className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Histórico de Questões</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {respostas.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <p>Inicie seus estudos para ver seu histórico aqui.</p>
                </div>
              ) : (
                respostas.map((r) => (
                  <div key={r.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${r.correta ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {r.correta ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase">Questão #{r.questaoId}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{formatDateTime(r.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 truncate font-medium">
                        Dificuldade: <span className="text-gray-900">{formatDificuldade(r.dificuldade)}</span> • 
                        Tempo: <span className="text-gray-900">{r.tempoRespostaSegundos}s</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Provas e Concursos */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <FileSignature className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Novas Provas</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {concursos.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-blue-200 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {c.banca.nome}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{c.ano}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 group-hover:text-blue-700 transition-colors">{c.instituicao.nome}</h4>
                  <button 
                    onClick={() => navigate('/provas')}
                    className="w-full py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                  >
                    Ver Cargos
                  </button>
                </div>
              ))}
              <Link to="/provas" className="block text-center text-xs font-bold text-indigo-600 hover:underline pt-2">Ver todas as provas</Link>
            </div>
          </section>

          {/* Quick Stats Placeholder or Tips */}
          <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center mb-4">
              <Award className="w-6 h-6 mr-3 text-indigo-200" />
              <h3 className="text-lg font-bold">Dica do Dia</h3>
            </div>
            <p className="text-indigo-100 text-sm leading-relaxed italic">
              "A constância é mais importante que a intensidade. Realize pelo menos um pequeno simulado todos os dias para manter seu cérebro treinado."
            </p>
            <div className="mt-6 pt-6 border-t border-indigo-500/50">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-200 mb-2">
                <span>Meta Semanal</span>
                <span>{weeklyCount}/50 Questões</span>
              </div>
              <div className="w-full bg-indigo-900/40 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-300 h-full rounded-full shadow-[0_0_8px_rgba(165,180,252,0.5)] transition-all duration-1000" 
                  style={{ width: `${Math.min((weeklyCount / 50) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;