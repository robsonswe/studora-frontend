import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { questaoService, respostaService, instituicaoService, cargoService, bancaService, disciplinaService, temaService, subtemaService } from '@/services/api';
import { formatNivel, formatDificuldade, formatDateTime } from '@/utils/formatters';
import * as Types from '@/types';
import { 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
  Tag,
  FileText,
  RefreshCw
} from 'lucide-react';

type QuestaoDto = Types.QuestaoDetailDto;
type AlternativaDto = Types.AlternativaDto;

const shuffle = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const SearchBrowsePage = () => {

  const { setValue, watch, reset } = useForm({
    defaultValues: {
      selectedDisciplina: { value: 0, label: 'Todas as disciplinas' } as { value: number, label: string } | null,
      selectedTema: { value: 0, label: 'Todos os temas' } as { value: number, label: string } | null,
      selectedSubtema: { value: 0, label: 'Todos os subtemas' } as { value: number, label: string } | null,
      selectedBanca: { value: 0, label: 'Todas as bancas' } as { value: number, label: string } | null,
      selectedInstituicaoArea: { value: '', label: 'Todas as áreas' } as { value: string, label: string } | null,
      selectedCargoArea: { value: '', label: 'Todas as áreas' } as { value: string, label: string } | null,
      selectedCargoNivel: ''
    }
  });

  const watchedFields = watch();

  const [questoes, setQuestoes] = useState<QuestaoDto[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [pagination, setPagination] = useState<Types.PageResponse<any>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);
  
  const [selectedAlternativas, setSelectedAlternativas] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  const [userJustificativas, setUserJustificativas] = useState<Record<number, string>>({});
  const [dificuldades, setDificuldades] = useState<Record<number, number>>({});
  const [respostasData, setRespostasData] = useState<Record<number, Types.RespostaSummaryDto>>({});
  const [displayAlternativas, setDisplayAlternativas] = useState<Record<number, AlternativaDto[]>>({});

  const filterQuestoes = useCallback(async (page: number = 0) => {
    setLocalLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const params: any = {
        page: page,
        size: 20, 
        disciplinaId: (watchedFields.selectedDisciplina && watchedFields.selectedDisciplina.value !== 0) ? watchedFields.selectedDisciplina.value : undefined,
        temaId: (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) ? watchedFields.selectedTema.value : undefined,
        subtemaId: (watchedFields.selectedSubtema && watchedFields.selectedSubtema.value !== 0) ? watchedFields.selectedSubtema.value : undefined,
        bancaId: (watchedFields.selectedBanca && watchedFields.selectedBanca.value !== 0) ? watchedFields.selectedBanca.value : undefined,
        instituicaoArea: (watchedFields.selectedInstituicaoArea && watchedFields.selectedInstituicaoArea.value !== '') ? watchedFields.selectedInstituicaoArea.value : undefined,
        cargoArea: (watchedFields.selectedCargoArea && watchedFields.selectedCargoArea.value !== '') ? watchedFields.selectedCargoArea.value : undefined,
        cargoNivel: watchedFields.selectedCargoNivel || undefined,
      };

      const data = await questaoService.getAll(params);
      const fetchedQuestoes = data.content as any;
      setQuestoes(fetchedQuestoes);
      setPagination(data); 
      setCurrentPage(page);

      const newDisplayMap: Record<number, AlternativaDto[]> = {};
      fetchedQuestoes.forEach((q: QuestaoDto) => {
        const hasGabarito = q.alternativas.some(a => a.correta !== undefined);
        if (q.respondida && !hasGabarito && q.alternativas.length > 2) {
          newDisplayMap[q.id] = shuffle(q.alternativas);
        } else {
          newDisplayMap[q.id] = [...q.alternativas].sort((a, b) => a.ordem - b.ordem);
        }
      });
      setDisplayAlternativas(newDisplayMap);

      const responses: Record<number, number> = {};
      const justifications: Record<number, string> = {};
      const answeredStatus: Record<number, boolean> = {};
      const fullRespostas: Record<number, Types.RespostaSummaryDto> = {};

      fetchedQuestoes.forEach(questao => {
        if (questao.respostas && questao.respostas.length > 0) {
          const respostaMaisRecente = questao.respostas.reduce((latest, current) => {
            const latestTime = latest.createdAt ? new Date(latest.createdAt).getTime() : 0;
            const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : 0;
            return currentTime > latestTime ? current : latest;
          });
          responses[questao.id] = respostaMaisRecente.alternativaId;
          justifications[questao.id] = respostaMaisRecente.justificativa || '';
          answeredStatus[questao.id] = true;
          fullRespostas[questao.id] = respostaMaisRecente;
        }
      });

      setSelectedAlternativas(responses);
      setUserJustificativas(justifications);
      setShowResults(answeredStatus);
      setRespostasData(fullRespostas);
    } catch (error) {
      console.error('Erro ao filtrar questões:', error);
    } finally {
      setLocalLoading(false);
    }
  }, [
    watchedFields.selectedDisciplina,
    watchedFields.selectedTema,
    watchedFields.selectedSubtema,
    watchedFields.selectedBanca,
    watchedFields.selectedInstituicaoArea,
    watchedFields.selectedCargoArea,
    watchedFields.selectedCargoNivel
  ]);

  useEffect(() => {
    filterQuestoes(0);
  }, [filterQuestoes]);

  const loadBancaOptions = async (inputValue: string) => {
    const data = await bancaService.getAll({ nome: inputValue, size: 20 });
    return [{ value: 0, label: 'Todas as bancas' }, ...data.content.map(b => ({ value: b.id, label: b.nome }))];
  };

  const loadDisciplinaOptions = async (inputValue: string) => {
    const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
    return [{ value: 0, label: 'Todas as disciplinas' }, ...data.content.map(d => ({ value: d.id, label: d.nome }))];
  };

  const loadTemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedDisciplina && watchedFields.selectedDisciplina.value !== 0) {
      const data = await temaService.getByDisciplina(watchedFields.selectedDisciplina.value);
      return [{ value: 0, label: 'Todos os temas' }, ...data.map(t => ({ value: t.id, label: t.nome })).filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()))];
    }
    return [{ value: 0, label: 'Todos os temas' }];
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) {
      const data = await subtemaService.getByTema(watchedFields.selectedTema.value);
      return [{ value: 0, label: 'Todos os subtemas' }, ...data.map(s => ({ value: s.id, label: s.nome })).filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()))];
    }
    return [{ value: 0, label: 'Todos os subtemas' }];
  };

  const loadInstituicaoAreaOptions = async (inputValue: string) => {
    const areas = await instituicaoService.getAreas(inputValue);
    return [{ value: '', label: 'Todas as áreas' }, ...areas.map(area => ({ value: area, label: area }))];
  };

  const loadCargoAreaOptions = async (inputValue: string) => {
    const areas = await cargoService.getAreas(inputValue);
    return [{ value: '', label: 'Todas as áreas' }, ...areas.map(area => ({ value: area, label: area }))];
  };

  const handleVerificarResposta = async (questaoId: number) => {
    if (!userJustificativas[questaoId]?.trim()) {
      alert('A justificativa é obrigatória.');
      return;
    }

    try {
      const result = await respostaService.create({
        questaoId: questaoId,
        alternativaId: selectedAlternativas[questaoId],
        justificativa: userJustificativas[questaoId],
        dificuldadeId: dificuldades[questaoId] || 2
      });

      setQuestoes(prev => prev.map(q => q.id === questaoId ? { ...q, alternativas: result.alternativas || q.alternativas, respostas: [...(q.respostas || []), result] } : q));
      
      const enrichedAlts = result.alternativas || [];
      setDisplayAlternativas(prev => {
        const currentOrder = prev[questaoId] || [];
        const enrichedMap = new Map(enrichedAlts.map(alt => [alt.id, alt]));
        return { ...prev, [questaoId]: currentOrder.map(displayed => enrichedMap.get(displayed.id) || displayed) };
      });

      setRespostasData(prev => ({ ...prev, [questaoId]: result }));
      setShowResults(prev => ({ ...prev, [questaoId]: true }));
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
    }
  };

  const selectStyles = {
    control: (base: any) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, borderRadius: '0.5rem' }),
    singleValue: (base: any) => ({ ...base, color: '#374151', fontSize: '0.875rem' }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.875rem', color: '#9ca3af' })
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Buscar e Explorar" subtitle="Encontre questões por filtros" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <Filter className="w-5 h-5 text-indigo-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Filtros de Pesquisa</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Disciplina</label>
              <AsyncSelect cacheOptions defaultOptions loadOptions={loadDisciplinaOptions} value={watchedFields.selectedDisciplina} onChange={(val) => { setValue('selectedDisciplina', val); setValue('selectedTema', { value: 0, label: 'Todos os temas' }); }} styles={selectStyles} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tema</label>
              <AsyncSelect key={`tema-${watchedFields.selectedDisciplina?.value}`} cacheOptions defaultOptions loadOptions={loadTemaOptions} value={watchedFields.selectedTema} onChange={(val) => { setValue('selectedTema', val); setValue('selectedSubtema', { value: 0, label: 'Todos os subtemas' }); }} isDisabled={!watchedFields.selectedDisciplina || watchedFields.selectedDisciplina.value === 0} styles={selectStyles} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subtema</label>
              <AsyncSelect key={`subtema-${watchedFields.selectedTema?.value}`} cacheOptions defaultOptions loadOptions={loadSubtemaOptions} value={watchedFields.selectedSubtema} onChange={(val) => setValue('selectedSubtema', val)} isDisabled={!watchedFields.selectedTema || watchedFields.selectedTema.value === 0} styles={selectStyles} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Banca</label>
              <AsyncSelect cacheOptions defaultOptions loadOptions={loadBancaOptions} value={watchedFields.selectedBanca} onChange={(val) => setValue('selectedBanca', val)} styles={selectStyles} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Área Instituição</label>
              <AsyncSelect cacheOptions defaultOptions loadOptions={loadInstituicaoAreaOptions} value={watchedFields.selectedInstituicaoArea} onChange={(val) => setValue('selectedInstituicaoArea', val)} styles={selectStyles} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Área Cargo</label>
              <AsyncSelect cacheOptions defaultOptions loadOptions={loadCargoAreaOptions} value={watchedFields.selectedCargoArea} onChange={(val) => setValue('selectedCargoArea', val)} styles={selectStyles} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nível</label>
              <Select options={[{ value: '', label: 'Todos' }, { value: 'FUNDAMENTAL', label: 'Fundamental' }, { value: 'MEDIO', label: 'Médio' }, { value: 'SUPERIOR', label: 'Superior' }]} value={watchedFields.selectedCargoNivel ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) } : { value: '', label: 'Todos' }} onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')} styles={selectStyles} />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={() => reset()} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <Trash2 className="w-4 h-4 mr-2 text-gray-500" />
              Limpar filtros
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-6">
          {questoes.map((questao) => {
            const concurso = questao.concurso;
            const currentAlts = displayAlternativas[questao.id] || [];
            const hasGabarito = currentAlts.some(a => a.correta !== undefined);
            const showResult = showResults[questao.id];
            const isButtonDisabled = !selectedAlternativas[questao.id] || !userJustificativas[questao.id]?.trim();
            const currentDificuldade = dificuldades[questao.id] || 2;
            
            return (
              <div key={questao.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Metadata Header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {concurso?.bancaNome}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          {concurso?.ano}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 ml-1">
                          {concurso?.instituicaoNome}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {(questao.cargos || []).map(c => `${c.nome} - ${c.area} (${formatNivel(c.nivel)})`).join(', ')}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                       <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">#{questao.id}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-1 border-t border-gray-200/60">
                     <div className="flex items-start gap-2">
                        <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-gray-600 leading-relaxed">
                          {(() => {
                            const grouped: Record<string, Record<string, string[]>> = {};
                            (questao.subtemas || []).forEach(st => {
                              if (!grouped[st.disciplinaNome]) grouped[st.disciplinaNome] = {};
                              if (!grouped[st.disciplinaNome][st.temaNome]) grouped[st.disciplinaNome][st.temaNome] = [];
                              grouped[st.disciplinaNome][st.temaNome].push(st.nome);
                            });
                            return Object.entries(grouped).map(([disc, temasMap]) => (
                              <span key={disc} className="block mb-0.5">
                                <span className="font-semibold text-gray-700">{disc}:</span> {Object.entries(temasMap).map(([tema, subtemaNomes]) => `${tema} (${subtemaNomes.join(', ')})`).join(' | ')}
                              </span>
                            ));
                          })()}
                        </div>
                     </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Question Content */}
                  <div className="prose prose-indigo max-w-none text-gray-800 mb-6 font-serif leading-relaxed text-lg">
                     <p className="whitespace-pre-line">{questao.enunciado}</p>
                  </div>
                  
                  {questao.imageUrl && (
                    <div className="mb-8 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-2 text-center">
                      <img src={questao.imageUrl} alt="Imagem" className="max-w-full h-auto inline-block rounded" />
                    </div>
                  )}
                  
                  {/* Alternatives */}
                  <div className="space-y-3">
                    {currentAlts.map((alternativa) => {
                      const isSelected = selectedAlternativas[questao.id] === alternativa.id;
                      const isCorrect = alternativa.correta;
                      const showGabarito = showResult && hasGabarito;
                      
                      let baseClass = "group relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 ";
                      let badgeClass = "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ";

                      if (showGabarito) {
                        if (isCorrect) { baseClass += "bg-green-50 border-green-500 "; badgeClass += "bg-green-500 text-white"; }
                        else if (isSelected) { baseClass += "bg-red-50 border-red-500 "; badgeClass += "bg-red-500 text-white"; }
                        else { baseClass += "bg-white border-gray-100 opacity-60 "; badgeClass += "bg-gray-100 text-gray-400"; }
                      } else {
                        if (isSelected) { baseClass += "bg-indigo-50 border-indigo-600 shadow-md "; badgeClass += "bg-indigo-600 text-white"; }
                        else { baseClass += "bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50 "; badgeClass += "bg-white border-2 border-gray-300 text-gray-500"; }
                      }

                      return (
                        <div key={alternativa.id} className={baseClass} onClick={() => !showResult && setSelectedAlternativas({ ...selectedAlternativas, [questao.id]: alternativa.id! })}>
                          <div className="flex-shrink-0 pt-0.5"><span className={badgeClass}>{String.fromCharCode(64 + alternativa.ordem)}</span></div>
                          <div className="ml-4 flex-1">
                            <span className={`text-base ${showGabarito && isCorrect ? 'font-medium text-green-900' : 'text-gray-700'}`}>{alternativa.texto}</span>
                            {showGabarito && (
                                <div className="mt-3 animate-fade-in">
                                  {(isCorrect || (isSelected && !isCorrect)) && (
                                    <div className={`flex items-start text-sm p-3 rounded-lg mb-2 ${isCorrect ? 'bg-green-100/50 text-green-800' : 'bg-red-100/50 text-red-800'}`}>
                                      {isCorrect ? <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> : <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />}
                                      <div><strong className="block mb-1">{isCorrect ? 'Gabarito' : 'Incorreta'}</strong>{alternativa.justificativa}</div>
                                    </div>
                                  )}
                                  {!isCorrect && !isSelected && alternativa.justificativa && (<div className="text-sm text-gray-500 mt-1 pl-3 border-l-2 border-gray-200 italic">{alternativa.justificativa}</div>)}
                                </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interaction Footer */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                     {!showResult ? (
                        selectedAlternativas[questao.id] && (
                          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-4 animate-fade-in">
                             <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4 flex items-center">
                                <FileText className="w-4 h-4 mr-2" /> Justificativa Obrigatória
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por que você escolheu esta alternativa?</label>
                                   <textarea
                                      value={userJustificativas[questao.id] || ''}
                                      onChange={(e) => setUserJustificativas({...userJustificativas, [questao.id]: e.target.value})}
                                      className="w-full text-sm border-gray-300 rounded-lg p-4 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                      rows={3}
                                      placeholder="Descreva seu raciocínio para habilitar a resposta..."
                                   />
                                   {!userJustificativas[questao.id]?.trim() && <p className="mt-2 text-xs text-indigo-600 italic font-medium animate-pulse">* Descreva seu raciocínio para habilitar o botão</p>}
                                </div>
                                <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dificuldade percebida</label>
                                   <div className="grid grid-cols-2 gap-3">
                                      {[
                                        { val: 1, label: 'Fácil', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                                        { val: 2, label: 'Média', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
                                        { val: 3, label: 'Difícil', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                                        { val: 4, label: 'Chute', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
                                      ].map((opt) => (
                                        <button
                                          key={opt.val}
                                          onClick={() => setDificuldades({...dificuldades, [questao.id]: opt.val})}
                                          className={`px-3 py-2.5 text-xs font-bold uppercase rounded-lg border transition-all ${
                                            currentDificuldade === opt.val 
                                              ? `${opt.bg} ${opt.text} ${opt.border} ring-2 ring-offset-1 ring-indigo-400 shadow-sm` 
                                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                   </div>
                                </div>
                             </div>
                             <div className="flex justify-end mt-6">
                                <button
                                  onClick={() => handleVerificarResposta(questao.id)}
                                  disabled={isButtonDisabled}
                                  className={`inline-flex items-center px-8 py-3 border border-transparent text-base font-bold rounded-xl shadow-lg text-white transition-all ${isButtonDisabled ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0'}`}
                                >
                                  Responder Questão
                                </button>
                             </div>
                          </div>
                        )
                     ) : (
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                           {userJustificativas[questao.id] && (
                              <div className="mb-4 pb-4 border-b border-gray-200">
                                 <span className="text-xs font-bold text-gray-500 uppercase block mb-2 tracking-wider">Minha Justificativa</span>
                                 <p className="text-sm text-gray-800 bg-white p-4 rounded-lg border border-gray-200 italic shadow-sm">"{userJustificativas[questao.id]}"</p>
                              </div>
                           )}
                           <div className="flex flex-wrap gap-6">
                              <div className="flex items-center text-xs text-gray-600"><Award className="w-4 h-4 mr-2 text-indigo-500" /><span className="font-bold mr-1">Dificuldade:</span> {formatDificuldade(respostasData[questao.id]?.dificuldade)}</div>
                              <div className="flex items-center text-xs text-gray-600"><Calendar className="w-4 h-4 mr-2 text-indigo-500" /><span className="font-bold mr-1">Data:</span> {formatDateTime(respostasData[questao.id]?.createdAt)}</div>
                           </div>
                           {!hasGabarito && (
                             <div className="mt-4 flex justify-end">
                                <button onClick={() => { setShowResults({ ...showResults, [questao.id]: false }); const newSel = { ...selectedAlternativas }; delete newSel[questao.id]; setSelectedAlternativas(newSel); }} className="inline-flex items-center px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"><RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente</button>
                             </div>
                           )}
                        </div>
                     )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center mt-10">
             <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button onClick={() => filterQuestoes(currentPage - 1)} disabled={currentPage === 0} className="relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button key={i} onClick={() => filterQuestoes(i)} className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors ${currentPage === i ? 'z-10 bg-indigo-600 text-white ring-1 ring-inset ring-indigo-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 bg-white'}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => filterQuestoes(currentPage + 1)} disabled={currentPage === pagination.totalPages - 1} className="relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
             </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBrowsePage;