import { CheckCircle, XCircle } from 'lucide-react';
import { formatNivel, formatDificuldade } from '@/utils/formatters';
import * as Types from '@/types';

// ─── Taxonomy Display ────────────────────────────────────────────────────────

interface TaxonomyDisplayProps {
  subtemas: Types.SubtemaQuestaoDto[];
}

export const TaxonomyDisplay = ({ subtemas }: TaxonomyDisplayProps) => {
  if (!subtemas || subtemas.length === 0) return null;

  const grouped: Record<string, Record<string, string[]>> = {};
  subtemas.forEach((st) => {
    const discNome = st.disciplina?.nome || 'Sem disciplina';
    const temaNome = st.tema?.nome || 'Sem tema';
    if (!grouped[discNome]) grouped[discNome] = {};
    if (!grouped[discNome][temaNome]) grouped[discNome][temaNome] = [];
    grouped[discNome][temaNome].push(st.nome);
  });

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-500 leading-relaxed">
      {Object.entries(grouped).map(([disc, temasMap]) => (
        <span key={disc} className="block">
          <span className="font-medium text-slate-600">{disc}:</span>{' '}
          {Object.entries(temasMap)
            .map(([tema, subs]) => `${tema} (${subs.join(', ')})`)
            .join(' | ')}
        </span>
      ))}
    </div>
  );
};

// ─── Question Header ─────────────────────────────────────────────────────────

interface QuestionHeaderProps {
  concurso?: Types.ConcursoQuestaoDto;
  cargos?: Types.CargoSummaryDto[];
  anulada?: boolean;
  desatualizada?: boolean;
}

export const QuestionHeader = ({ concurso, cargos, anulada, desatualizada }: QuestionHeaderProps) => (
  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
        {concurso?.bancaNome || 'Banca não especificada'}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
        {concurso?.ano || '—'}
      </span>
      <span className="text-sm text-slate-600 truncate">
        {concurso?.instituicaoNome || 'Instituição não especificada'}
      </span>
      {anulada && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ms-auto">
          ANULADA
        </span>
      )}
      {desatualizada && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ms-auto">
          DESATUALIZADA
        </span>
      )}
    </div>

    <div className="text-xs text-slate-500">
      {(cargos || []).map((c) => `${c.nome} – ${c.area} (${formatNivel(c.nivel)})`).join(', ')}
    </div>
  </div>
);

// ─── Alternatives List ───────────────────────────────────────────────────────

interface AlternativesListProps {
  alternativas: Types.AlternativaDto[];
  selectedAlternativa: number | null;
  feedback: Types.RespostaSummaryDto | null;
  onSelect: (id: number) => void;
}

export const AlternativesList = ({ alternativas, selectedAlternativa, feedback, onSelect }: AlternativesListProps) => {
  const showFeedback = !!feedback;

  if (alternativas.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <p className="text-slate-500 text-sm italic">Esta questão não possui alternativas cadastradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5" role="radiogroup" aria-label="Alternativas">
      {alternativas.map((alternativa) => {
        const isSelected = selectedAlternativa === alternativa.id;
        const isCorrect = alternativa.correta === true;
        const letter = String.fromCharCode(64 + alternativa.ordem);

        let containerClass =
          'group relative flex items-start p-4 cursor-pointer rounded-lg border transition-all duration-150 ';
        let badgeClass =
          'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors flex-shrink-0 ';

        if (showFeedback) {
          if (isCorrect) {
            containerClass += 'bg-emerald-50 border-emerald-300 ';
            badgeClass += 'bg-emerald-500 text-white';
          } else if (isSelected && !isCorrect) {
            containerClass += 'bg-red-50 border-red-300 ';
            badgeClass += 'bg-red-400 text-white';
          } else {
            containerClass += 'bg-slate-50 border-slate-100 opacity-50 ';
            badgeClass += 'bg-slate-100 text-slate-400';
          }
        } else {
          if (isSelected) {
            containerClass += 'bg-indigo-50 border-indigo-500 shadow-sm ';
            badgeClass += 'bg-indigo-600 text-white';
          } else {
            containerClass += 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 ';
            badgeClass +=
              'bg-white border border-slate-300 text-slate-500 group-hover:border-indigo-400 group-hover:text-indigo-500';
          }
        }

        return (
          <div
            key={alternativa.id}
            className={containerClass}
            onClick={() => !showFeedback && onSelect(alternativa.id!)}
            role="radio"
            aria-checked={isSelected}
            tabIndex={showFeedback ? -1 : 0}
            onKeyDown={(e) => {
              if (!showFeedback && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(alternativa.id!);
              }
            }}
          >
            <div className="flex items-start pt-0.5">
              <span className={badgeClass}>{letter}</span>
            </div>

            <div className="ms-3.5 flex-1 min-w-0">
              <div
                className={`text-base break-words leading-relaxed ${
                  showFeedback && isCorrect ? 'font-medium text-emerald-900' : 'text-slate-700'
                }`}
              >
                {alternativa.texto}
              </div>

              {showFeedback && (
                <div className="mt-3">
                  {(isCorrect || (isSelected && !isCorrect)) && (
                    <div
                      className={`flex items-start text-sm p-3 rounded-lg ${
                        isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4 me-2 flex-shrink-0 mt-0.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 me-2 flex-shrink-0 mt-0.5 text-red-500" />
                      )}
                      <div>
                        <strong className="block mb-1 text-xs uppercase tracking-wide">
                          {isCorrect ? 'Gabarito' : 'Alternativa incorreta'}
                        </strong>
                        {alternativa.justificativa}
                      </div>
                    </div>
                  )}
                  {!isCorrect && !isSelected && alternativa.justificativa && (
                    <div className="text-sm text-slate-500 ps-3 border-l-2 border-slate-200 italic mt-1">
                      {alternativa.justificativa}
                    </div>
                  )}
                </div>
              )}
            </div>

            {showFeedback && isSelected && (
              <span className="ms-3 flex-shrink-0 self-start mt-0.5 w-2 h-2 rounded-full bg-indigo-500" title="Sua resposta" />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Difficulty Selector ─────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = [
  { val: 1, label: 'Fácil', active: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300' },
  { val: 2, label: 'Média', active: 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300' },
  { val: 3, label: 'Difícil', active: 'bg-orange-50 text-orange-700 border-orange-300 ring-1 ring-orange-300' },
  { val: 4, label: 'Chute', active: 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-300' },
];

interface DifficultySelectorProps {
  value: number;
  onChange: (val: number) => void;
}

export const DifficultySelector = ({ value, onChange }: DifficultySelectorProps) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1.5">Dificuldade percebida</label>
    <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Nível de dificuldade">
      {DIFFICULTY_OPTIONS.map((opt) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          aria-pressed={value === opt.val}
          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
            value === opt.val
              ? opt.active
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

// ─── Question Card (main wrapper) ────────────────────────────────────────────

interface QuestionCardBodyProps {
  concurso?: Types.ConcursoQuestaoDto;
  cargos?: Types.CargoSummaryDto[];
  enunciado: string;
  imageUrl?: string;
  subtemas?: Types.SubtemaQuestaoDto[];
  alternativas: Types.AlternativaDto[];
  selectedAlternativa: number | null;
  justificativa: string;
  dificuldade: number;
  feedback: Types.RespostaSummaryDto | null;
  processingAnswer: boolean;
  isVerifyDisabled: boolean;
  anulada?: boolean;
  desatualizada?: boolean;
  onAlternativaSelect: (id: number) => void;
  onJustificativaChange: (value: string) => void;
  onDificuldadeChange: (val: number) => void;
  onVerify: () => void;
  /** Post-submit action: either "next question" or navigation buttons. */
  postSubmit: React.ReactNode;
  /** Stats info shown in post-submit summary line. */
  statsSummary?: React.ReactNode;
}

export const QuestionCard = ({
  concurso,
  cargos,
  enunciado,
  imageUrl,
  subtemas,
  alternativas,
  selectedAlternativa,
  justificativa,
  dificuldade,
  feedback,
  processingAnswer,
  isVerifyDisabled,
  anulada,
  desatualizada,
  onAlternativaSelect,
  onJustificativaChange,
  onDificuldadeChange,
  onVerify,
  postSubmit,
  statsSummary,
}: QuestionCardBodyProps) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    {/* Header */}
    <QuestionHeader concurso={concurso} cargos={cargos} anulada={anulada} desatualizada={desatualizada} />

    {/* Body */}
    <div className="p-6 md:p-8">
      <p className="text-lg leading-relaxed text-slate-800 whitespace-pre-wrap break-words mb-8">
        {enunciado}
      </p>

      {imageUrl && (
        <div className="mb-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-2">
          <img src={imageUrl} alt="Imagem da questão" className="max-w-full h-auto mx-auto rounded" />
        </div>
      )}

      {/* Alternatives */}
      <div className="mb-10">
        <AlternativesList
          alternativas={alternativas}
          selectedAlternativa={selectedAlternativa}
          feedback={feedback}
          onSelect={onAlternativaSelect}
        />
      </div>

      {/* Taxonomy - only shown after answering */}
      {feedback && subtemas && subtemas.length > 0 && <TaxonomyDisplay subtemas={subtemas} />}

      {/* Bottom panel */}
      <div className="border-t border-slate-100 pt-8">
        {!feedback ? (
          /* Pre-submit */
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Justificativa */}
              <div>
                <label htmlFor="justificativa" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Justificativa <span className="text-indigo-500">*</span>
                </label>
                <textarea
                  id="justificativa"
                  value={justificativa}
                  onChange={(e) => onJustificativaChange(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  rows={4}
                  placeholder="Escreva o fundamento da sua resposta antes de verificar o gabarito."
                  maxLength={2000}
                  aria-required="true"
                />
                <div className="flex justify-between mt-1 items-center">
                  {selectedAlternativa && !justificativa.trim() ? (
                    <p className="text-xs text-indigo-600">Escreva a justificativa para habilitar.</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-[11px] text-slate-400 font-mono ms-auto">
                    {justificativa.length}/2000
                  </span>
                </div>
              </div>

              {/* Dificuldade */}
              <DifficultySelector value={dificuldade} onChange={onDificuldadeChange} />
            </div>

            <div className="flex justify-end">
              <button
                onClick={onVerify}
                disabled={isVerifyDisabled}
                className={`inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-semibold text-white transition-all ${
                  isVerifyDisabled
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                }`}
              >
                {processingAnswer ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar resposta'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Post-submit */
          <div>
            {/* Result summary line */}
            <div className="flex items-center justify-between mb-5">
              <span
                className={`font-mono text-sm font-medium ${
                  feedback.correta ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {feedback.correta ? 'Correta.' : 'Ponto de Atenção.'}
                {' · '}
                {formatTime(feedback.tempoRespostaSegundos)}
                {' · '}
                {formatDificuldade(feedback.dificuldade)}
              </span>

              {statsSummary}
            </div>

            {/* User's justificativa */}
            {feedback.justificativa && (
              <div className="mb-6 ps-3 border-l-2 border-slate-200">
                <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Minha justificativa
                </span>
                <p className="text-sm text-slate-600 italic">"{feedback.justificativa}"</p>
              </div>
            )}

            {postSubmit}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
