import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { questaoService, alternativaService, respostaService } from '@/services/api';
import * as Types from '@/types';

type QuestaoDto = Types.QuestaoDto;
type AlternativaDto = Types.AlternativaDto;
type RespostaDto = Types.RespostaDto;

const QuestaoPracticePage = () => {
  const [questoes, setQuestoes] = useState<QuestaoDto[]>([]);
  const [alternativas, setAlternativas] = useState<Record<number, AlternativaDto[]>>({});
  const [selectedAlternativas, setSelectedAlternativas] = useState<Record<number, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    loadQuestoes();
  }, []);

  const loadQuestoes = async () => {
    try {
      // Load non-cancelled questions
      const questoesData = await questaoService.getNaoAnuladas();
      setQuestoes(questoesData);

      // Load alternatives for each question
      const alternativasMap: Record<number, AlternativaDto[]> = {};
      for (const questao of questoesData) {
        const alternativasData = await alternativaService.getByQuestao(questao.id!);
        alternativasMap[questao.id!] = alternativasData.sort((a, b) => a.ordem - b.ordem);
      }
      setAlternativas(alternativasMap);
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlternativaSelect = (alternativaId: number) => {
    if (!questoes[currentQuestionIndex]?.id) return;
    
    setSelectedAlternativas({
      ...selectedAlternativas,
      [questoes[currentQuestionIndex].id!]: alternativaId
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questoes.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowResult(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowResult(false);
    }
  };

  const handleSubmitAnswer = () => {
    setShowResult(true);
  };

  const handleFinish = async () => {
    // Save all responses to the backend
    for (const [questaoIdStr, alternativaId] of Object.entries(selectedAlternativas)) {
      const questaoId = parseInt(questaoIdStr);
      if (!isNaN(questaoId) && alternativaId) {
        try {
          await respostaService.create({
            questaoId,
            alternativaId,
          });
        } catch (error) {
          console.error(`Erro ao salvar resposta para questão ${questaoId}:`, error);
        }
      }
    }
    
    alert('Respostas salvas com sucesso!');
  };

  if (loading || questoes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const currentQuestion = questoes[currentQuestionIndex];
  const currentAlternativas = alternativas[currentQuestion?.id!] || [];

  return (
    <div>
      <Header 
        title="Praticar Questões" 
      />

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Questão {currentQuestionIndex + 1} de {questoes.length}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Selecione a alternativa correta
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <p className="text-lg text-gray-800">
              {currentQuestion.enunciado}
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            {currentAlternativas.map((alternativa) => {
              const isSelected = selectedAlternativas[currentQuestion.id!] === alternativa.id;
              const isCorrect = alternativa.correta;
              const showResultForThis = showResult && isSelected;
              const showCorrectAnswer = showResult && isCorrect;

              let buttonClass = "w-full text-left p-4 rounded-lg border transition-colors ";

              if (showResult) {
                if (isCorrect) {
                  buttonClass += "bg-green-100 border-green-500 text-green-800";
                } else if (isSelected) {
                  buttonClass += "bg-red-100 border-red-500 text-red-800";
                } else {
                  buttonClass += "bg-white border-gray-300";
                }
              } else if (isSelected) {
                buttonClass += "bg-indigo-100 border-indigo-500 text-indigo-800";
              } else {
                buttonClass += "bg-white border-gray-300 hover:bg-gray-50";
              }
              
              return (
                <button
                  key={alternativa.id}
                  className={buttonClass}
                  onClick={() => handleAlternativaSelect(alternativa.id!)}
                  disabled={showResult && !isSelected}
                >
                  <div className="flex items-center">
                    <span className="font-medium mr-3">{String.fromCharCode(64 + alternativa.ordem)}</span>
                    <span>{alternativa.texto}</span>
                    {showCorrectAnswer && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Correta
                      </span>
                    )}
                  </div>
                  {showResultForThis && !isCorrect && (
                    <div className="mt-2 text-sm text-red-600">
                      Justificativa: {alternativa.justificativa || 'Nenhuma justificativa fornecida.'}
                    </div>
                  )}
                  {showResultForThis && isCorrect && (
                    <div className="mt-2 text-sm text-green-600">
                      Justificativa: {alternativa.justificativa || 'Nenhuma justificativa fornecida.'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md ${
                  currentQuestionIndex === 0 
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                Anterior
              </button>
              
              {!showResult ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAlternativas[currentQuestion.id!]}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    !selectedAlternativas[currentQuestion.id!]
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Verificar Resposta
                </button>
              ) : (
                <button
                  onClick={() => setShowResult(false)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Tentar Novamente
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              {currentQuestionIndex === questoes.length - 1 && (
                <button
                  onClick={handleFinish}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Finalizar
                </button>
              )}
              
              <button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questoes.length - 1}
                className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md ${
                  currentQuestionIndex === questoes.length - 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestaoPracticePage;