import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { analyticsService } from '@/services/api';
import * as Types from '@/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Target, 
  Award, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Activity,
  Zap,
  BookOpen,
  X,
  ChevronRight
} from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

const PerformancePage = () => {
  const [loading, setLoading] = useState(true);
  const [consistencia, setConsistencia] = useState<Types.AnalyticsConsistenciaDto[]>([]);
  const [disciplinas, setDisciplinas] = useState<Types.AnalyticsTopicMasteryDto[]>([]);
  const [evolucao, setEvolucao] = useState<Types.AnalyticsEvolucaoDto[]>([]);
  const [learningRate, setLearningRate] = useState<Types.AnalyticsLearningRateDto | null>(null);

  // Discipline Details
  const [selectedDiscId, setSelectedDiscId] = useState<number | null>(null);
  const [discDetail, setDiscDetail] = useState<Types.AnalyticsTopicMasteryDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pagination for Disciplines
  const [discPagination, setDiscPagination] = useState<Types.PageResponse<Types.AnalyticsTopicMasteryDto>>({
    content: [],
    pageNumber: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [discCurrentPage, setDiscPaginationCurrentPage] = useState(0);

  useEffect(() => {
    loadMainData();
    loadDisciplinesData(0);
  }, []);

  const loadMainData = async () => {
    try {
      const [consRes, evolRes, learnRes] = await Promise.all([
        analyticsService.getConsistencia(30),
        analyticsService.getEvolucao(),
        analyticsService.getTaxaAprendizado()
      ]);

      setConsistencia(consRes);
      setEvolucao(evolRes);
      setLearningRate(learnRes);
    } catch (error) {
      console.error('Erro ao carregar dados principais de performance:', error);
    }
  };

  const loadDisciplinesData = async (page: number = 0) => {
    try {
      const discRes = await analyticsService.getDisciplinasMastery({ page, size: 10, sort: 'masteryScore', direction: 'DESC' });
      setDisciplinas(discRes.content);
      setDiscPagination(discRes);
      setDiscPaginationCurrentPage(page);
    } catch (error) {
      console.error('Erro ao carregar domínio por disciplinas:', error);
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleOpenDetail = async (id: number) => {
    setSelectedDiscId(id);
    setDetailLoading(true);
    try {
      const detail = await analyticsService.getDisciplinaMasteryDetail(id);
      setDiscDetail(detail);
    } catch (error) {
      console.error('Erro ao carregar detalhes da disciplina:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedDiscId(null);
    setDiscDetail(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Derived Summary
  const totalCorrect = consistencia.reduce((acc, curr) => acc + curr.totalCorrect, 0);
  const totalAnswered = consistencia.reduce((acc, curr) => acc + curr.totalAnswered, 0);
  const overallAccuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;
  const currentStreak = consistencia[consistencia.length - 1]?.activeStreak || 0;

  // Top 5 Disciplines for Chart
  const topDisciplines = [...disciplinas].slice(0, 5);

  const renderDifficultyBadge = (stats: Record<string, { total: number; correct: number }>) => {
    return (
      <div className="flex gap-1">
        {['FACIL', 'MEDIA', 'DIFICIL', 'CHUTE'].map(diff => {
          const s = stats[diff];
          if (!s || s.total === 0) return null;
          const acc = (s.correct / s.total) * 100;
          const color = diff === 'CHUTE' ? 'bg-orange-500' : (acc >= 70 ? 'bg-emerald-500' : acc >= 50 ? 'bg-amber-500' : 'bg-rose-500');
          return (
            <div 
              key={diff} 
              className={`w-2 h-2 rounded-full ${color} shadow-sm`} 
              title={`${diff}: ${acc.toFixed(0)}% (${s.correct}/${s.total})`} 
            />
          );
        })}
      </div>
    );
  };

  const renderDifficultyBreakdown = (stats: Record<string, { total: number; correct: number }>) => {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
        {['FACIL', 'MEDIA', 'DIFICIL', 'CHUTE'].map(diff => {
          const s = stats[diff];
          if (!s || s.total === 0) return null;
          const acc = (s.correct / s.total) * 100;
          const colorClass = diff === 'CHUTE' ? 'text-orange-500' : (acc >= 70 ? 'text-green-600' : acc >= 50 ? 'text-yellow-600' : 'text-red-600');
          const label = diff === 'FACIL' ? 'Fácil' : diff === 'MEDIA' ? 'Média' : diff === 'DIFICIL' ? 'Difícil' : 'Chute';
          
          return (
            <div key={diff} className="flex items-center text-[9px] font-bold uppercase tracking-tighter">
              <span className="text-gray-400 mr-1">{label}:</span>
              <span className={colorClass}>{s.correct}/{s.total}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const MasteryRow = ({ item, level = 0 }: { item: Types.AnalyticsTopicMasteryDto | any, level?: number }) => (
    <div className={`flex flex-col border-b border-gray-50 last:border-0 ${level > 0 ? 'bg-gray-50/30' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-100/50 transition-colors gap-4">
        <div className="flex items-center flex-1 min-w-0" style={{ paddingLeft: `${level * 1.5}rem` }}>
          {level > 0 && <ChevronRight className="w-3 h-3 text-gray-300 mr-2 flex-shrink-0" />}
          <span className={`text-sm font-bold truncate ${level === 0 ? 'text-gray-800' : 'text-gray-600'}`}>{item.nome}</span>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
          <div className="flex flex-col items-end text-[10px] min-w-[60px]">
            <span className="text-gray-400 font-bold uppercase">Tempo</span>
            <span className="text-gray-700 font-extrabold">{item.avgTimeSeconds.toFixed(0)}s</span>
          </div>
          
          <div className="flex flex-col items-end min-w-[140px]">
            <div className="flex items-center justify-between w-full mb-1 gap-2">
              <span className={`text-xs font-black ${item.masteryScore >= 70 ? 'text-green-600' : item.masteryScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {item.masteryScore.toFixed(0)}%
              </span>
              <div className="flex gap-0.5">
                {['FACIL', 'MEDIA', 'DIFICIL', 'CHUTE'].map(diff => {
                  const s = item.difficultyStats[diff];
                  if (!s || s.total === 0) return null;
                  const acc = (s.correct / s.total) * 100;
                  const color = diff === 'CHUTE' ? 'bg-orange-500' : (acc >= 70 ? 'bg-green-500' : acc >= 50 ? 'bg-yellow-500' : 'bg-red-500');
                  return <div key={diff} className={`w-1.5 h-1.5 rounded-full ${color}`} title={`${diff}: ${acc.toFixed(0)}%`} />;
                })}
              </div>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-1">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${item.masteryScore >= 70 ? 'bg-green-500' : item.masteryScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${item.masteryScore}%` }}
              />
            </div>
            {renderDifficultyBreakdown(item.difficultyStats)}
          </div>
        </div>
      </div>
      {item.children && item.children.map((child: any) => (
        <MasteryRow key={child.id} item={child} level={level + 1} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <Header title="Análise de Desempenho" subtitle="Visualize sua evolução e domine seus pontos fracos" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Precisão Geral</p>
            <p className="text-2xl font-extrabold text-gray-900">{overallAccuracy.toFixed(1)}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sequência Atual</p>
            <p className="text-2xl font-extrabold text-gray-900">{currentStreak} Dias</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-xl text-green-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Taxa Recuperação</p>
            <p className="text-2xl font-extrabold text-gray-900">{((learningRate?.recoveryRate || 0) * 100).toFixed(0)}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Questões</p>
            <p className="text-2xl font-extrabold text-gray-900">{totalAnswered}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Evolution Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Evolução</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">Histórico Semanal</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={evolucao}>
              <defs>
                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="period" 
                stroke="#9ca3af"
                style={{ fontSize: '11px' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#9ca3af"
                style={{ fontSize: '11px' }}
                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [`${(value * 100).toFixed(1)}%`, 'Precisão']}
              />
              <Area 
                type="monotone" 
                dataKey="overallAccuracy" 
                stroke="#6366f1" 
                strokeWidth={3}
                fill="url(#colorAccuracy)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Disciplines */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <Award className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Top 5 Disciplinas</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">Por domínio</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topDisciplines} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} horizontal={false} />
              <XAxis 
                type="number" 
                stroke="#9ca3af"
                style={{ fontSize: '11px' }}
                tickFormatter={(val) => `${val}%`}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <YAxis 
                type="category" 
                dataKey="nome" 
                width={120}
                stroke="#9ca3af"
                style={{ fontSize: '11px' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [`${value.toFixed(1)}%`, 'Domínio']}
              />
              <Bar dataKey="masteryScore" radius={[0, 8, 8, 0]} barSize={20}>
                {topDisciplines.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Consistency Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Consistência Diária</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">Últimos 30 dias</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={consistencia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              stroke="#9ca3af"
              style={{ fontSize: '11px' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="#9ca3af"
              style={{ fontSize: '11px' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
              labelFormatter={(val) => new Date(val).toLocaleDateString('pt-BR')}
            />
            <Line 
              type="monotone" 
              dataKey="totalAnswered" 
              stroke="#6366f1" 
              strokeWidth={3}
              dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#fff' }}
              name="Questões"
            />
            <Line 
              type="monotone" 
              dataKey="totalCorrect" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }}
              name="Acertos"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Disciplines Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Domínio por Disciplina</h2>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {disciplinas.map((disc, idx) => (
            <div 
              key={disc.id}
              onClick={() => handleOpenDetail(disc.id)}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center flex-1 min-w-0 mr-6">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mr-4 font-black text-indigo-700 text-sm">
                    #{idx + 1 + (discCurrentPage * 10)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-800 truncate mb-1">{disc.nome}</h3>
                    {renderDifficultyBreakdown(disc.difficultyStats)}
                  </div>
                </div>
                
                <div className="flex items-center space-x-8">
                  <div className="hidden md:flex flex-col items-end text-[10px]">
                    <span className="text-gray-400 font-bold uppercase">Tempo Médio</span>
                    <span className="text-gray-700 font-extrabold">{disc.avgTimeSeconds.toFixed(0)}s</span>
                  </div>
                  
                  <div className="flex flex-col items-end w-32">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-sm font-black ${
                        disc.masteryScore >= 70 ? 'text-green-600' : 
                        disc.masteryScore >= 50 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {disc.masteryScore.toFixed(1)}%
                      </span>
                      {renderDifficultyBadge(disc.difficultyStats)}
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          disc.masteryScore >= 70 ? 'bg-green-500' : 
                          disc.masteryScore >= 50 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${disc.masteryScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1 font-medium">
                      {disc.totalAttempts} questões
                    </span>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {discPagination.totalPages > 1 && (
          <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => loadDisciplinesData(discCurrentPage - 1)}
              disabled={discCurrentPage === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600 font-medium">
              Página {discCurrentPage + 1} de {discPagination.totalPages}
            </span>
            <button
              onClick={() => loadDisciplinesData(discCurrentPage + 1)}
              disabled={discPagination.last}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDiscId !== null && (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeDetail}></div>
          
          {/* Scroll container */}
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0" onClick={closeDetail}>
              <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-6xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-indigo-600 px-6 py-5 flex items-center justify-between border-b border-indigo-500 z-10">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <BookOpen className="w-6 h-6 mr-3" />
                    {discDetail?.nome || 'Detalhes da Disciplina'}
                  </h2>
                  <button
                    onClick={closeDetail}
                    className="text-white hover:bg-indigo-700 p-2 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6">
                  {detailLoading ? (
                    <div className="py-20 flex justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : discDetail ? (
                    <div className="space-y-8">
                      {/* Detailed Stats Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Questões</span>
                          <span className="text-xl font-black text-gray-800">{discDetail.totalAttempts}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Acertos</span>
                          <span className="text-xl font-black text-green-600">{discDetail.correctAttempts}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tempo Médio</span>
                          <span className="text-xl font-black text-blue-600">{discDetail.avgTimeSeconds.toFixed(1)}s</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Domínio Final</span>
                          <span className="text-xl font-black text-indigo-600">{discDetail.masteryScore.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Summary Difficulty Breakdown */}
                      <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                        <span className="block text-[10px] font-extrabold text-indigo-400 uppercase mb-3 tracking-widest">Distribuição por Dificuldade</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {['FACIL', 'MEDIA', 'DIFICIL', 'CHUTE'].map(diff => {
                            const s = discDetail.difficultyStats[diff];
                            const label = diff === 'FACIL' ? 'Fácil' : diff === 'MEDIA' ? 'Média' : diff === 'DIFICIL' ? 'Difícil' : 'Chute';
                            const color = diff === 'CHUTE' ? 'text-orange-600' : 'text-indigo-700';
                            
                            return (
                              <div key={diff} className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-500">{label}</span>
                                <span className={`text-sm font-black ${color}`}>
                                  {s ? `${s.correct}/${s.total}` : '0/0'}
                                </span>
                                {s && s.total > 0 && (
                                  <div className="w-full bg-gray-200 h-1 mt-1 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${diff === 'CHUTE' ? 'bg-orange-400' : (s.correct/s.total >= 0.7 ? 'bg-green-500' : s.correct/s.total >= 0.5 ? 'bg-yellow-500' : 'bg-red-500')}`} 
                                      style={{ width: `${(s.correct/s.total) * 100}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Hierarchy Section */}
                      <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Temas e Subtemas
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                          {discDetail.children && discDetail.children.map(tema => (
                            <MasteryRow key={tema.id} item={tema} />
                          ))}
                          {(!discDetail.children || discDetail.children.length === 0) && (
                            <div className="p-10 text-center text-gray-400 text-sm italic">Nenhum tema detalhado disponível.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-red-500 font-medium">Erro ao carregar detalhes.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformancePage;