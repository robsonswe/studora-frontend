import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import { useStudora } from '@/context/StudoraContext';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { questaoService, respostaService, instituicaoService, cargoService, bancaService, disciplinaService, temaService, subtemaService } from '@/services/api';
import { formatNivel, formatDificuldade, formatDateTime } from '@/utils/formatters';
import * as Types from '@/types';

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
  const { loading: contextLoading } = useStudora();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
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
  
  // State for user interactions
  const [selectedAlternativas, setSelectedAlternativas] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  const [userJustificativas, setUserJustificativas] = useState<Record<number, string>>({});
  const [dificuldades, setDificuldades] = useState<Record<number, number>>({});
  const [respostasData, setRespostasData] = useState<Record<number, Types.RespostaSummaryDto>>({});
  
  // Maps to store processed/enriched data for specific questions
  const [displayAlternativas, setDisplayAlternativas] = useState<Record<number, AlternativaDto[]>>({});

  const filterQuestoes = useCallback(async (page: number = 0) => {
    setLocalLoading(true);

    try {
      const params: any = {
        page: page,
        size: 20, // Changed from 50 to 20 to match the API default
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
      setPagination(data); // Store pagination info
      setCurrentPage(page); // Update current page

      // Process alternatives for display
      const newDisplayMap: Record<number, AlternativaDto[]> = {};
      fetchedQuestoes.forEach((q: QuestaoDto) => {
        const hasGabarito = q.alternativas.some(a => a.correta !== undefined);

        if (q.respondida && !hasGabarito && q.alternativas.length > 2) {
          // Scramble if responded but no gabarito and more than 2 alternatives
          newDisplayMap[q.id] = shuffle(q.alternativas);
        } else {
          // Standard order
          newDisplayMap[q.id] = [...q.alternativas].sort((a, b) => a.ordem - b.ordem);
        }
      });
      setDisplayAlternativas(newDisplayMap);

      // Extract existing responses from the questions data to pre-populate states
      const responses: Record<number, number> = {};
      const justifications: Record<number, string> = {};
      const answeredStatus: Record<number, boolean> = {};
      const fullRespostas: Record<number, Types.RespostaSummaryDto> = {};

      fetchedQuestoes.forEach(questao => {
        if (questao.respostas && questao.respostas.length > 0) {
          // Get the most recent resposta for this question (handling potential null createdAt)
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
    filterQuestoes(0); // Start with page 0
  }, [filterQuestoes]);

  const loadBancaOptions = async (inputValue: string) => {
    const data = await bancaService.getAll({ nome: inputValue, size: 20 });
    const options = data.content.map(b => ({ value: b.id, label: b.nome }));
    return [{ value: 0, label: 'Todas as bancas' }, ...options];
  };

  const loadDisciplinaOptions = async (inputValue: string) => {
    const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
    const options = data.content.map(d => ({ value: d.id, label: d.nome }));
    return [{ value: 0, label: 'Todas as disciplinas' }, ...options];
  };

  const loadTemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedDisciplina && watchedFields.selectedDisciplina.value !== 0) {
      const data = await temaService.getByDisciplina(watchedFields.selectedDisciplina.value);
      const options = data
        .map(t => ({ value: t.id, label: t.nome }))
        .filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()));
      return [{ value: 0, label: 'Todos os temas' }, ...options];
    }
    return [{ value: 0, label: 'Todos os temas' }];
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) {
      const data = await subtemaService.getByTema(watchedFields.selectedTema.value);
      const options = data
        .map(s => ({ value: s.id, label: s.nome }))
        .filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()));
      return [{ value: 0, label: 'Todos os subtemas' }, ...options];
    }
    return [{ value: 0, label: 'Todos os subtemas' }];
  };

  const loadInstituicaoAreaOptions = async (inputValue: string) => {
    const areas = await instituicaoService.getAreas(inputValue);
    const options = areas.map(area => ({ value: area, label: area }));
    return [{ value: '', label: 'Todas as áreas' }, ...options];
  };

  const loadCargoAreaOptions = async (inputValue: string) => {
    const areas = await cargoService.getAreas(inputValue);
    const options = areas.map(area => ({ value: area, label: area }));
    return [{ value: '', label: 'Todas as áreas' }, ...options];
  };

  const handleVerificarResposta = async (questaoId: number) => {
    if (!userJustificativas[questaoId]?.trim()) {
      alert('Por favor, preencha a justificativa antes de verificar a resposta.');
      return;
    }

    try {
      const result = await respostaService.create({
        questaoId: questaoId,
        alternativaId: selectedAlternativas[questaoId],
        justificativa: userJustificativas[questaoId] || '',
        dificuldadeId: dificuldades[questaoId] || 2
      });

      // Update the questoes state to include the resposta information
      setQuestoes(prevQuestoes => 
        prevQuestoes.map(questao => 
          questao.id === questaoId 
            ? { 
                ...questao, 
                alternativas: result.alternativas || questao.alternativas,
                respostas: [...(questao.respostas || []), result] // Add the new resposta to the array
              } 
            : questao
        )
      );

      // Update alternatives with the ones returned by the API (which include the gabarito)
      const enrichedAlts = result.alternativas || [];
      
      // Update the displayAlternativas to use the enriched alternatives while maintaining order
      setDisplayAlternativas(prev => {
        const currentOrder = prev[questaoId] || [];
        
        // Create a map of the enriched alternatives for quick lookup
        const enrichedMap = new Map(enrichedAlts.map(alt => [alt.id, alt]));
        
        // Maintain the current display order but update with enriched data
        const newDisplayOrder = currentOrder.map(displayed => {
          const enriched = enrichedMap.get(displayed.id);
          return enriched || displayed;
        });

        return {
          ...prev,
          [questaoId]: newDisplayOrder
        };
      });

      // Update the resposta data and show results
      setRespostasData(prev => ({ ...prev, [questaoId]: result }));
      setShowResults(prev => ({ ...prev, [questaoId]: true }));
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
    }
  };

  if (contextLoading.all && localLoading && questoes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Buscar e Explorar"
      />

      {/* Filters Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="disciplina" className="block text-sm font-medium text-gray-700 mb-1">
              Disciplina
            </label>
            <AsyncSelect
              id="disciplina"
              cacheOptions
              defaultOptions
              loadOptions={loadDisciplinaOptions}
              value={watchedFields.selectedDisciplina}
              onChange={(val) => {
                setValue('selectedDisciplina', val);
                if (!val || val.value === 0) {
                  setValue('selectedTema', { value: 0, label: 'Todos os temas' });
                  setValue('selectedSubtema', { value: 0, label: 'Todos os subtemas' });
                }
              }}
              placeholder="Busque..."
              isClearable={false}
            />
          </div>

          <div>
            <label htmlFor="tema" className="block text-sm font-medium text-gray-700 mb-1">
              Tema
            </label>
            <AsyncSelect
              id="tema"
              key={`tema-select-${watchedFields.selectedDisciplina?.value}`}
              cacheOptions
              defaultOptions
              loadOptions={loadTemaOptions}
              value={watchedFields.selectedTema}
              onChange={(val) => {
                setValue('selectedTema', val);
                if (!val || val.value === 0) {
                  setValue('selectedSubtema', { value: 0, label: 'Todos os subtemas' });
                }
              }}
              placeholder="Busque..."
              isClearable={false}
              isDisabled={!watchedFields.selectedDisciplina || watchedFields.selectedDisciplina.value === 0}
            />
          </div>

          <div>
            <label htmlFor="subtema" className="block text-sm font-medium text-gray-700 mb-1">
              Subtema
            </label>
            <AsyncSelect
              id="subtema"
              key={`subtema-select-${watchedFields.selectedTema?.value}`}
              cacheOptions
              defaultOptions
              loadOptions={loadSubtemaOptions}
              value={watchedFields.selectedSubtema}
              onChange={(val) => setValue('selectedSubtema', val)}
              placeholder="Busque..."
              isClearable={false}
              isDisabled={!watchedFields.selectedTema || watchedFields.selectedTema.value === 0}
            />
          </div>
        </div>

        {/* Additional filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label htmlFor="banca" className="block text-sm font-medium text-gray-700 mb-1">
              Banca
            </label>
            <AsyncSelect
              id="banca"
              cacheOptions
              defaultOptions
              loadOptions={loadBancaOptions}
              value={watchedFields.selectedBanca}
              onChange={(val) => setValue('selectedBanca', val)}
              placeholder="Busque..."
              isClearable={false}
            />
          </div>

          <div>
            <label htmlFor="instituicaoArea" className="block text-sm font-medium text-gray-700 mb-1">
              Área da Instituição
            </label>
            <AsyncSelect
              id="instituicaoArea"
              cacheOptions
              defaultOptions
              loadOptions={loadInstituicaoAreaOptions}
              value={watchedFields.selectedInstituicaoArea}
              onChange={(val) => setValue('selectedInstituicaoArea', val)}
              placeholder="Busque..."
              isClearable={false}
            />
          </div>

          <div>
            <label htmlFor="cargoArea" className="block text-sm font-medium text-gray-700 mb-1">
              Área do Cargo
            </label>
            <AsyncSelect
              id="cargoArea"
              cacheOptions
              defaultOptions
              loadOptions={loadCargoAreaOptions}
              value={watchedFields.selectedCargoArea}
              onChange={(val) => setValue('selectedCargoArea', val)}
              placeholder="Busque..."
              isClearable={false}
            />
          </div>

          <div>
            <label htmlFor="cargoNivel" className="block text-sm font-medium text-gray-700 mb-1">
              Nível do Cargo
            </label>
            <Select
              id="cargoNivel"
              options={[
                { value: '', label: 'Todos os níveis' },
                { value: 'FUNDAMENTAL', label: 'Fundamental' },
                { value: 'MEDIO', label: 'Médio' },
                { value: 'SUPERIOR', label: 'Superior' },
              ]}
              value={
                watchedFields.selectedCargoNivel
                  ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) }
                  : { value: '', label: 'Todos os níveis' }
              }
              onChange={(selectedOption) => {
                setValue('selectedCargoNivel', selectedOption?.value || '');
              }}
              placeholder="Selecione..."
              isClearable={false}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              reset({
                selectedDisciplina: { value: 0, label: 'Todas as disciplinas' },
                selectedTema: { value: 0, label: 'Todos os temas' },
                selectedSubtema: { value: 0, label: 'Todos os subtemas' },
                selectedBanca: { value: 0, label: 'Todas as bancas' },
                selectedInstituicaoArea: { value: '', label: 'Todas as áreas' },
                selectedCargoArea: { value: '', label: 'Todas as áreas' },
                selectedCargoNivel: ''
              });
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {questoes.map((questao) => {
            const concurso = questao.concurso;
            const currentAlts = displayAlternativas[questao.id] || [];
            const hasGabarito = currentAlts.some(a => a.correta !== undefined);
            const showResult = showResults[questao.id];
            
            return (
              <li key={questao.id}>
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex justify-between">
                    <div className="text-sm font-medium text-indigo-600">
                      {concurso ? `${concurso.ano} - ${concurso.instituicaoNome} - ${concurso.bancaNome}` : `Questão ${questao.id}`}
                    </div>
                    <div className="flex space-x-2">
                      {questao.anulada && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Anulada
                        </span>
                      )}
                      {questao.desatualizada && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Desatualizada
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-indigo-400 mt-1">
                    Cargos: {(questao.cargos || []).map(cargo => `${cargo.nome} - ${cargo.area} (${formatNivel(cargo.nivel)})`).join(', ')}
                  </div>

                  <div className="mt-2">
                    {questao.imageUrl && (
                      <div className="mb-4">
                        <img src={questao.imageUrl} alt="Imagem da questão" className="max-w-full h-auto rounded shadow-sm" />
                      </div>
                    )}
                    <p className="text-gray-800">
                      {questao.enunciado}
                    </p>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-2">
                      {(() => {
                        const grouped: Record<string, Record<string, string[]>> = {};

                        (questao.subtemas || []).forEach(st => {
                          if (!grouped[st.disciplinaNome]) grouped[st.disciplinaNome] = {};
                          if (!grouped[st.disciplinaNome][st.temaNome]) grouped[st.disciplinaNome][st.temaNome] = [];
                          grouped[st.disciplinaNome][st.temaNome].push(st.nome);
                        });

                        return Object.entries(grouped).map(([disc, temasMap]) => {
                          const temasStr = Object.entries(temasMap).map(([tema, subtemaNomes]) => {
                            return `${tema} (${subtemaNomes.join(', ')})`;
                          }).join(' | ');
                          return `${disc}: ${temasStr}`;
                        }).join('; ');
                      })()}
                    </div>
                    
                    <div className="space-y-2">
                      {currentAlts.map((alternativa) => {
                        const isSelected = selectedAlternativas[questao.id] === alternativa.id;
                        const isCorrect = alternativa.correta;
                        const showGabaritoFeedback = showResult && hasGabarito;
                        
                        let alternativaClass = "p-3 rounded-lg border transition-all ";

                        if (showGabaritoFeedback) {
                          if (isCorrect) {
                            alternativaClass += "border-green-500 bg-green-50";
                          } else if (isSelected) {
                            alternativaClass += "border-red-500 bg-red-50";
                          } else {
                            alternativaClass += "border-gray-200 bg-gray-50 opacity-80";
                          }
                        } else if (isSelected) {
                          alternativaClass += "border-indigo-500 bg-indigo-50";
                        } else {
                          alternativaClass += "border-gray-300 bg-white hover:bg-gray-50";
                        }

                        return (
                          <div
                            key={alternativa.id}
                            className={alternativaClass}
                            onClick={() => {
                              if (!showResult) {
                                setSelectedAlternativas({
                                  ...selectedAlternativas,
                                  [questao.id]: alternativa.id!
                                });
                              }
                            }}
                            style={{ cursor: !showResult ? 'pointer' : 'default' }}
                          >
                            <div className="flex items-center">
                              <span className="font-medium mr-3">{String.fromCharCode(64 + alternativa.ordem)}</span>
                              <span>{alternativa.texto}</span>
                              {showGabaritoFeedback && isCorrect && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Correta
                                </span>
                              )}
                              {showGabaritoFeedback && isSelected && !isCorrect && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Incorreta
                                </span>
                              )}
                            </div>
                            {showGabaritoFeedback && alternativa.justificativa && (
                              <div className={`mt-2 ml-6 text-sm ${isCorrect ? 'text-green-700' : 'text-gray-600 italic'}`}>
                                <strong>Justificativa:</strong> {alternativa.justificativa}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="mt-4 space-y-3">
                        {/* Pre-verification: Justification and Difficulty inputs */}
                        {selectedAlternativas[questao.id] && !showResult && (
                          <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-indigo-700 mb-1 uppercase tracking-wider">
                                  Sua Justificativa
                                </label>
                                <textarea
                                  value={userJustificativas[questao.id] || ''}
                                  onChange={(e) => setUserJustificativas({...userJustificativas, [questao.id]: e.target.value})}
                                  className="w-full text-sm border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                  rows={2}
                                  placeholder="Explique por que escolheu esta alternativa..."
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-indigo-700 mb-1 uppercase tracking-wider">
                                  Dificuldade
                                </label>
                                <select
                                  value={dificuldades[questao.id] || 2}
                                  onChange={(e) => setDificuldades({...dificuldades, [questao.id]: parseInt(e.target.value)})}
                                  className="w-full text-sm border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                >
                                  <option value={1}>Fácil</option>
                                  <option value={2}>Média</option>
                                  <option value={3}>Difícil</option>
                                  <option value={4}>Chute</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Post-verification: User Justification, Difficulty and Time Display */}
                        {showResult && (respostasData[questao.id] || userJustificativas[questao.id]) && (
                          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-2">
                            {userJustificativas[questao.id] && (
                              <div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Minha Justificativa:</span>
                                <p className="text-sm text-gray-700">{userJustificativas[questao.id]}</p>
                              </div>
                            )}

                            {/* Use resposta from questao object only - no fallback to respostasData */}
                            {questao.respostas && questao.respostas.length > 0 && (
                              <>
                                {(() => {
                                  // Get the most recent resposta from the questao object
                                  const respostaMaisRecente = questao.respostas.reduce((latest, current) => {
                                    const latestTime = latest.createdAt ? new Date(latest.createdAt).getTime() : 0;
                                    const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : 0;
                                    return currentTime > latestTime ? current : latest;
                                  });
                                  
                                  return (
                                    <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
                                      <div className="text-xs text-gray-500">
                                        <span className="font-bold uppercase tracking-wider">Dificuldade:</span> {formatDificuldade(respostaMaisRecente.dificuldade) || 'N/A'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        <span className="font-bold uppercase tracking-wider">Tempo:</span> {respostaMaisRecente.tempoRespostaSegundos ? `${Math.floor(respostaMaisRecente.tempoRespostaSegundos / 60)}m ${respostaMaisRecente.tempoRespostaSegundos % 60}s` : 'N/A'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        <span className="font-bold uppercase tracking-wider">Data:</span> {formatDateTime(respostaMaisRecente.createdAt)}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        )}

                        <div className="flex space-x-3">
                          {selectedAlternativas[questao.id] && !showResult ? (
                            <button
                              onClick={() => handleVerificarResposta(questao.id)}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Verificar Resposta
                            </button>
                          ) : showResult && !hasGabarito && (
                            // Only allow "Try Again" if the gabarito was NOT provided by the backend
                            <button
                              onClick={() => {
                                setShowResults({
                                  ...showResults,
                                  [questao.id]: false
                                });
                                const newSelected = { ...selectedAlternativas };
                                delete newSelected[questao.id];
                                setSelectedAlternativas(newSelected);
                                
                                const newJustificativas = { ...userJustificativas };
                                delete newJustificativas[questao.id];
                                setUserJustificativas(newJustificativas);
                              }}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Tentar Novamente
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        
        {questoes.length === 0 && (
          <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma questão encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tente ajustar seus filtros de busca.
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => filterQuestoes(currentPage - 1)}
                disabled={currentPage === 0}
                className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  currentPage === 0
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => filterQuestoes(currentPage + 1)}
                disabled={currentPage === pagination.totalPages - 1}
                className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  currentPage === pagination.totalPages - 1
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{currentPage * pagination.pageSize + 1}</span> até{' '}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}
                  </span>{' '}
                  de <span className="font-medium">{pagination.totalElements}</span> resultados
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => filterQuestoes(currentPage - 1)}
                    disabled={currentPage === 0}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === 0
                        ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                        : 'bg-white text-gray-900 hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">Anterior</span>
                    &larr;
                  </button>

                  {/* Render page numbers */}
                  {(() => {
                    const pages = [];
                    const totalPages = pagination.totalPages;
                    
                    // Always show first page
                    if (totalPages > 0) {
                      pages.push(0);
                    }
                    
                    // Determine which pages to show based on current page
                    if (totalPages > 1) {
                      if (totalPages <= 5) {
                        // Show all pages if total is 5 or less
                        for (let i = 1; i < totalPages - 1; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Show current page with neighbors
                        const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - 4));
                        const endPage = Math.min(totalPages - 1, startPage + 2);
                        
                        for (let i = startPage; i <= endPage; i++) {
                          if (!pages.includes(i)) {
                            pages.push(i);
                          }
                        }
                      }
                      
                      // Always show last page if there are more than 1 page
                      if (totalPages > 1 && !pages.includes(totalPages - 1)) {
                        pages.push(totalPages - 1);
                      }
                    }
                    
                    // Sort pages to ensure proper order
                    pages.sort((a, b) => a - b);
                    
                    // Generate the buttons with ellipses where needed
                    const elements = [];
                    for (let i = 0; i < pages.length; i++) {
                      const page = pages[i];
                      
                      // Add ellipsis if there's a gap
                      if (i > 0 && pages[i] - pages[i - 1] > 1) {
                        elements.push(
                          <span
                            key={`ellipsis-${pages[i - 1]}-${page}`}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                          >
                            ...
                          </span>
                        );
                      }
                      
                      elements.push(
                        <button
                          key={page}
                          onClick={() => filterQuestoes(page)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            currentPage === page
                              ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page + 1}
                        </button>
                      );
                    }
                    
                    return elements;
                  })()}

                  <button
                    onClick={() => filterQuestoes(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages - 1}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === pagination.totalPages - 1
                        ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                        : 'bg-white text-gray-900 hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">Próximo</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBrowsePage;