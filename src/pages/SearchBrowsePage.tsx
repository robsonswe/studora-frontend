import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useStudora } from '@/context/StudoraContext';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { questaoService, alternativaService, respostaService } from '@/services/api';
import * as Types from '@/types';

type QuestaoDto = Types.QuestaoDto;
type AlternativaDto = Types.AlternativaDto;

const SearchBrowsePage = () => {
  const { disciplinas, temas, subtemas, concursos, loading: contextLoading } = useStudora();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      searchTerm: '',
      selectedDisciplina: null,
      selectedTema: null,
      selectedConcurso: null,
      selectedBanca: '',
      selectedArea: '',
      selectedNivel: ''
    }
  });

  const watchedFields = watch();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredQuestoes, setFilteredQuestoes] = useState<QuestaoDto[]>([]);
  const [questoesWithAlternativas, setQuestoesWithAlternativas] = useState<
    (QuestaoDto & { alternativas: AlternativaDto[] })[]
  >([]);
  const [localLoading, setLocalLoading] = useState(true);

  // Extract unique values for new filters
  const bancas = [...new Set(concursos.map(c => c.banca))];
  const areas = [...new Set(concursos.map(c => c.area).filter(area => area))];
  const niveis = [...new Set(concursos.map(c => c.nivel).filter(nivel => nivel))];
  const [selectedAlternativas, setSelectedAlternativas] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});

  useEffect(() => {
    filterQuestoes();
  }, [watchedFields.searchTerm, watchedFields.selectedDisciplina, watchedFields.selectedTema, watchedFields.selectedConcurso, watchedFields.selectedBanca, watchedFields.selectedArea, watchedFields.selectedNivel]);

  const filterQuestoes = async () => {
    setLocalLoading(true);

    try {
      let allQuestoes = await questaoService.getAll();

      // Get all concursos to map concursoId to concurso details
      const allConcursos = await import('@/services/api').then(({ concursoService }) => concursoService.getAll());

      // Apply filters
      if (watchedFields.selectedDisciplina) {
        // This would require a backend endpoint to get questions by discipline
        // For now, we'll skip this filter
      }

      if (watchedFields.selectedTema) {
        // This would require a backend endpoint to get questions by tema
        // For now, we'll skip this filter
      }

      if (watchedFields.selectedConcurso) {
        allQuestoes = allQuestoes.filter(q => q.concursoId === watchedFields.selectedConcurso);
      }

      // Apply new filters
      if (watchedFields.selectedBanca) {
        allQuestoes = allQuestoes.filter(q => {
          const concurso = allConcursos.find(c => c.id === q.concursoId);
          return concurso && concurso.banca === watchedFields.selectedBanca;
        });
      }

      if (watchedFields.selectedArea) {
        allQuestoes = allQuestoes.filter(q => {
          const concurso = allConcursos.find(c => c.id === q.concursoId);
          return concurso && concurso.area === watchedFields.selectedArea;
        });
      }

      if (watchedFields.selectedNivel) {
        allQuestoes = allQuestoes.filter(q => {
          const concurso = allConcursos.find(c => c.id === q.concursoId);
          return concurso && concurso.nivel === watchedFields.selectedNivel;
        });
      }

      if (watchedFields.searchTerm) {
        allQuestoes = allQuestoes.filter(q =>
          q.enunciado.toLowerCase().includes(watchedFields.searchTerm.toLowerCase())
        );
      }

      // Get alternatives for each question
      const questoesWithAlts = await Promise.all(
        allQuestoes.map(async (questao) => {
          const alternativas = await alternativaService.getByQuestao(questao.id!);
          return {
            ...questao,
            alternativas: alternativas.sort((a, b) => a.ordem - b.ordem)
          };
        })
      );

      // Load existing responses for the user
      const todasRespostas = await respostaService.getAll();
      const respostasPorQuestao: Record<number, number> = {};
      todasRespostas.forEach(resposta => {
        respostasPorQuestao[resposta.questaoId] = resposta.alternativaId;
      });

      setFilteredQuestoes(allQuestoes);
      setQuestoesWithAlternativas(questoesWithAlts);

      // Set previously selected answers
      setSelectedAlternativas(respostasPorQuestao);

      // Pre-populate showResults for questions that have been answered
      const answeredQuestions: Record<number, boolean> = {};
      Object.keys(respostasPorQuestao).forEach(questaoId => {
        answeredQuestions[parseInt(questaoId)] = true;
      });
      setShowResults(answeredQuestions);
    } catch (error) {
      console.error('Erro ao filtrar questões:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDisciplina(null);
    setSelectedTema(null);
    setSelectedConcurso(null);
  };

  if (contextLoading.all || localLoading) {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              id="search"
              {...register('searchTerm')}
              placeholder="Buscar em enunciados..."
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
            />
          </div>

          <div>
            <label htmlFor="disciplina" className="block text-sm font-medium text-gray-700 mb-1">
              Disciplina
            </label>
            <Select
              id="disciplina"
              options={[
                { value: null, label: 'Todas as disciplinas' },
                ...disciplinas.map(disciplina => ({
                  value: disciplina.id,
                  label: disciplina.nome
                }))
              ]}
              value={
                watchedFields.selectedDisciplina
                  ? {
                      value: watchedFields.selectedDisciplina,
                      label: disciplinas.find(d => d.id === watchedFields.selectedDisciplina)?.nome
                    }
                  : { value: null, label: 'Todas as disciplinas' }
              }
              onChange={(selectedOption) => {
                setValue('selectedDisciplina', selectedOption?.value || null);
              }}
              placeholder="Selecione uma disciplina..."
              isClearable
              isSearchable
            />
          </div>

          <div>
            <label htmlFor="tema" className="block text-sm font-medium text-gray-700 mb-1">
              Tema
            </label>
            <Select
              id="tema"
              options={[
                { value: null, label: 'Todos os temas' },
                ...temas
                  .filter(tema => !watchedFields.selectedDisciplina || tema.disciplinaId === watchedFields.selectedDisciplina)
                  .map(tema => ({
                    value: tema.id,
                    label: tema.nome
                  }))
              ]}
              value={
                watchedFields.selectedTema
                  ? {
                      value: watchedFields.selectedTema,
                      label: temas.find(t => t.id === watchedFields.selectedTema)?.nome
                    }
                  : { value: null, label: 'Todos os temas' }
              }
              onChange={(selectedOption) => {
                setValue('selectedTema', selectedOption?.value || null);
              }}
              placeholder="Selecione um tema..."
              isClearable
              isSearchable
              isDisabled={!watchedFields.selectedDisciplina}
            />
          </div>

          <div>
            <label htmlFor="concurso" className="block text-sm font-medium text-gray-700 mb-1">
              Concurso
            </label>
            <Select
              id="concurso"
              options={[
                { value: null, label: 'Todos os concursos' },
                ...concursos.map(concurso => ({
                  value: concurso.id,
                  label: `${concurso.ano} - ${concurso.banca} - ${concurso.nome}`
                }))
              ]}
              value={
                watchedFields.selectedConcurso
                  ? {
                      value: watchedFields.selectedConcurso,
                      label: `${concursos.find(c => c.id === watchedFields.selectedConcurso)?.ano} - ${concursos.find(c => c.id === watchedFields.selectedConcurso)?.banca} - ${concursos.find(c => c.id === watchedFields.selectedConcurso)?.nome}`
                    }
                  : { value: null, label: 'Todos os concursos' }
              }
              onChange={(selectedOption) => {
                setValue('selectedConcurso', selectedOption?.value || null);
              }}
              placeholder="Selecione um concurso..."
              isClearable
              isSearchable
            />
          </div>
        </div>

        {/* Additional filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label htmlFor="banca" className="block text-sm font-medium text-gray-700 mb-1">
              Banca
            </label>
            <Select
              id="banca"
              options={[
                { value: '', label: 'Todas as bancas' },
                ...bancas.map(banca => ({
                  value: banca,
                  label: banca
                }))
              ]}
              value={
                watchedFields.selectedBanca
                  ? {
                      value: watchedFields.selectedBanca,
                      label: watchedFields.selectedBanca
                    }
                  : { value: '', label: 'Todas as bancas' }
              }
              onChange={(selectedOption) => {
                setValue('selectedBanca', selectedOption?.value || '');
              }}
              placeholder="Selecione uma banca..."
              isClearable
              isSearchable
            />
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
              Área
            </label>
            <Select
              id="area"
              options={[
                { value: '', label: 'Todas as áreas' },
                ...areas.map(area => ({
                  value: area,
                  label: area
                }))
              ]}
              value={
                watchedFields.selectedArea
                  ? {
                      value: watchedFields.selectedArea,
                      label: watchedFields.selectedArea
                    }
                  : { value: '', label: 'Todas as áreas' }
              }
              onChange={(selectedOption) => {
                setValue('selectedArea', selectedOption?.value || '');
              }}
              placeholder="Selecione uma área..."
              isClearable
              isSearchable
            />
          </div>

          <div>
            <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">
              Nível
            </label>
            <Select
              id="nivel"
              options={[
                { value: '', label: 'Todos os níveis' },
                ...niveis.map(nivel => ({
                  value: nivel,
                  label: nivel
                }))
              ]}
              value={
                watchedFields.selectedNivel
                  ? {
                      value: watchedFields.selectedNivel,
                      label: watchedFields.selectedNivel
                    }
                  : { value: '', label: 'Todos os níveis' }
              }
              onChange={(selectedOption) => {
                setValue('selectedNivel', selectedOption?.value || '');
              }}
              placeholder="Selecione um nível..."
              isClearable
              isSearchable
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => reset({
              searchTerm: '',
              selectedDisciplina: null,
              selectedTema: null,
              selectedConcurso: null,
              selectedBanca: '',
              selectedArea: '',
              selectedNivel: ''
            })}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {questoesWithAlternativas.map((item) => {
            const questao = item;
            const concurso = concursos.find(c => c.id === questao.concursoId);
            const temaNames = questao.subtemaIds
              .map(subtemaId => {
                const subtema = subtemas.find(s => s.id === subtemaId);
                if (subtema) {
                  const tema = temas.find(t => t.id === subtema.temaId);
                  return tema ? `${tema.nome} - ${subtema.nome}` : '';
                }
                return '';
              })
              .filter(name => name !== '');
            
            return (
              <li key={questao.id}>
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex justify-between">
                    <div className="text-sm font-medium text-indigo-600">
                      {concurso?.ano} - {concurso?.banca} - {concurso?.nome}{concurso?.cargo ? ` - ${concurso.cargo}` : ''}{concurso?.nivel ? ` - ${concurso.nivel}` : ''}
                    </div>
                    {questao.anulada && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Anulada
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="text-gray-800">
                      {questao.enunciado}
                    </p>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-2">
                      {(() => {
                        // Group subtemas by disciplina
                        const subtemasByDisciplina: Record<number, { temaNome: string, subtemas: string[] }> = {};

                        questao.subtemaIds.forEach(subtemaId => {
                          const subtema = subtemas.find(s => s.id === subtemaId);
                          if (subtema) {
                            const tema = temas.find(t => t.id === subtema.temaId);
                            if (tema) {
                              const disciplina = disciplinas.find(d => d.id === tema.disciplinaId);
                              if (disciplina) {
                                if (!subtemasByDisciplina[disciplina.id]) {
                                  subtemasByDisciplina[disciplina.id] = {
                                    temaNome: tema.nome,
                                    subtemas: [subtema.nome]
                                  };
                                } else {
                                  // Check if the tema is the same, if not we need to handle differently
                                  if (subtemasByDisciplina[disciplina.id].temaNome !== tema.nome) {
                                    // For simplicity, we'll just add the subtema to the list
                                    // In a more complex scenario, we might want to group by tema too
                                    if (!subtemasByDisciplina[disciplina.id].subtemas.includes(subtema.nome)) {
                                      subtemasByDisciplina[disciplina.id].subtemas.push(subtema.nome);
                                    }
                                  } else {
                                    if (!subtemasByDisciplina[disciplina.id].subtemas.includes(subtema.nome)) {
                                      subtemasByDisciplina[disciplina.id].subtemas.push(subtema.nome);
                                    }
                                  }
                                }
                              }
                            }
                          }
                        });

                        // Format the output
                        return Object.entries(subtemasByDisciplina).map(([disciplinaId, data]) => {
                          const disciplina = disciplinas.find(d => d.id === parseInt(disciplinaId));
                          return `${disciplina?.nome}: ${data.temaNome} - ${data.subtemas.join(', ')}`;
                        }).join('; ');
                      })()}
                    </div>
                    
                    <div className="space-y-2">
                      {questao.alternativas.map((alternativa) => {
                        const isSelected = selectedAlternativas[questao.id!] === alternativa.id;
                        const isCorrect = alternativa.correta;
                        const showResult = showResults[questao.id!];
                        const showCorrectAnswer = showResult && isCorrect;
                        const showSelectedIncorrect = showResult && isSelected && !isCorrect;

                        let alternativaClass = "p-3 rounded-lg border ";

                        if (showResult) {
                          if (isCorrect) {
                            alternativaClass += "border-green-500 bg-green-50";
                          } else if (isSelected) {
                            alternativaClass += "border-red-500 bg-red-50";
                          } else {
                            alternativaClass += "border-gray-300 bg-white";
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
                                  [questao.id!]: alternativa.id!
                                });
                              }
                            }}
                            style={{ cursor: !showResult ? 'pointer' : 'default' }}
                          >
                            <div className="flex items-center">
                              <span className="font-medium mr-3">{String.fromCharCode(64 + alternativa.ordem)}</span>
                              <span>{alternativa.texto}</span>
                              {showCorrectAnswer && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Correta
                                </span>
                              )}
                              {showSelectedIncorrect && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Incorreta
                                </span>
                              )}
                            </div>
                            {showSelectedIncorrect && alternativa.justificativa && (
                              <div className="mt-2 ml-6 text-sm text-red-700">
                                <strong>Justificativa:</strong> {alternativa.justificativa}
                              </div>
                            )}
                            {showCorrectAnswer && alternativa.justificativa && (
                              <div className="mt-2 ml-6 text-sm text-green-700">
                                <strong>Justificativa:</strong> {alternativa.justificativa}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="mt-4 flex space-x-3">
                        {selectedAlternativas[questao.id!] && !showResults[questao.id!] ? (
                          <button
                            onClick={async () => {
                              // Save the response to the API
                              try {
                                await import('@/services/api').then(({ respostaService }) =>
                                  respostaService.create({
                                    questaoId: questao.id!,
                                    alternativaId: selectedAlternativas[questao.id!]!
                                  })
                                );

                                setShowResults({
                                  ...showResults,
                                  [questao.id!]: true
                                });
                              } catch (error) {
                                console.error('Erro ao salvar resposta:', error);
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Verificar Resposta
                          </button>
                        ) : showResults[questao.id!] && (
                          <button
                            onClick={() => {
                              setShowResults({
                                ...showResults,
                                [questao.id!]: false
                              });
                              setSelectedAlternativas({
                                ...selectedAlternativas,
                                [questao.id!]: undefined
                              });
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Tentar Novamente
                          </button>
                        )}
                        {showResults[questao.id!] && !selectedAlternativas[questao.id!] && (
                          <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-800 bg-green-100 rounded-md">
                            Respondido
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        
        {questoesWithAlternativas.length === 0 && (
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
      </div>
    </div>
  );
};

export default SearchBrowsePage;