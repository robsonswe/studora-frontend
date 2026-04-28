'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { concursoService, ApiError } from '@/services/api';
import { formatNivel, formatDateTime } from '@/utils/formatters';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import {
  Loader2,
  Calendar,
  Link as LinkIcon,
  ChevronRight,
  Archive,
  CheckCircle,
  BookOpen,
  ClipboardList,
} from 'lucide-react';
import { Feedback } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/ToastContext';

export default function ConcursoDetailPage() {
  const params = useParams();
  const concursoId = params.concursoId as string;
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concurso, setConcurso] = useState<Types.ConcursoDetailDto | null>(null);
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);

  const areaCount = concurso ? new Set(concurso.cargos.map(c => c.area || 'Outros')).size : 0;

  usePageTitle(concurso ? concurso.instituicao.nome : undefined);

  const loadConcurso = useCallback(async () => {
    if (!concursoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await concursoService.getById(Number(concursoId));
      setConcurso(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [concursoId]);

  useEffect(() => {
    loadConcurso();
  }, [loadConcurso]);

  const handleStartProva = (cargoId: number) => {
    if (!concurso) return;
    router.push(`/provas/executar?concursoId=${concurso.id}&cargoId=${cargoId}&instituicaoId=${concurso.instituicao.id}`);
  };

  const handleToggleInscricao = async (concursoCargoId: number, cargoId: number) => {
    setToggleLoading(cargoId);
    try {
      await concursoService.toggleInscricao(concursoCargoId);
      await loadConcurso();
      showToast('Preferências de inscrição atualizadas.', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Erro ao atualizar inscrição.', 'error');
    } finally {
      setToggleLoading(null);
    }
  };

  const isValidUrl = (s: string) => {
    try { return ['http:', 'https:'].includes(new URL(s).protocol); } catch { return false; }
  };

  if (loading) return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Detalhes do Concurso"
        breadcrumbs={[
          { label: 'Concursos', href: '/concursos' },
          { label: 'Carregando...' }
        ]}
      />
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400 tracking-tight">Carregando concurso...</p>
      </div>
    </div>
  );

  if (error || !concurso) return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Detalhes do Concurso"
        breadcrumbs={[
          { label: 'Concursos', href: '/concursos' },
          { label: 'Erro ao carregar' }
        ]}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Feedback
          type="error"
          title="Erro ao carregar concurso"
          message={error || 'Concurso não encontrado.'}
          onClose={() => router.push('/concursos')}
        />
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push('/concursos')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Voltar para Concursos
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Detalhes do Concurso"
        breadcrumbs={[
          { label: 'Concursos', href: '/concursos' },
          { label: concurso.instituicao.nome }
        ]}
      />

      {concurso.finalizado && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg w-fit text-xs font-semibold text-slate-500">
          <Archive className="w-3.5 h-3.5 text-slate-400" />
          Concurso encerrado
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-indigo-50/50 text-indigo-600 border border-indigo-100/40">
                  {concurso.banca.sigla || concurso.banca.nome}
                </span>
                <span className="text-sm font-semibold text-slate-400">{concurso.ano}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                {concurso.instituicao.nome}
              </h1>
              <p className="text-sm font-semibold text-slate-400 tracking-tight">{concurso.instituicao.area}</p>
            </div>
            {concurso.edital && isValidUrl(concurso.edital) && (
              <a
                href={concurso.edital}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-colors border border-indigo-100/60"
              >
                <LinkIcon className="w-4 h-4" />
                Visualizar Edital
              </a>
            )}
          </div>
        </div>

        <div className="px-6 py-4 sm:px-8 sm:py-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Data da Prova</p>
            {concurso.dataProva ? (
              <p className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {formatDateTime(concurso.dataProva)}
              </p>
            ) : (
              <p className="text-sm font-semibold text-slate-400 italic inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-300" /> A definir
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cargos Ofertados</p>
            <p className="text-sm font-bold text-slate-700">{concurso.cargos.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Áreas</p>
            <p className="text-sm font-bold text-slate-700">{areaCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ano</p>
            <p className="text-sm font-bold text-slate-700">{concurso.ano}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
          Cargos Disponíveis
        </h2>
        {concurso.cargos.map((cargo, index) => (
          <div
            key={cargo.cargoId}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-indigo-100/80 transition-colors"
          >
            <div className="px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
              <button
                onClick={() => router.push(`/concursos/${concurso.id}/cargos/${cargo.cargoId}`)}
                className="min-w-0 flex-1 text-left group/cargo hover:text-indigo-900 transition-colors"
              >
                <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
                  <p className="text-base font-bold text-slate-800 group-hover/cargo:text-indigo-700 tracking-tight leading-snug transition-colors">
                    {cargo.cargoNome}
                  </p>
                  {cargo.inscrito ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-emerald-600 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100/50">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Inscrito
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-400 tracking-tight">
                  <span className="text-slate-400/70">{cargo.area}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span>{formatNivel(cargo.nivel)}</span>
                </div>
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {cargo.topicos && cargo.topicos.length > 0 && (
                  <button
                    onClick={() => router.push(`/concursos/${concurso.id}/cargos/${cargo.cargoId}`)}
                    className="text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 sm:py-2 rounded-lg transition-all border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 text-center active:scale-95 inline-flex items-center justify-center gap-1.5"
                  >
                    Detalhes
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {cargo.inscrito ? (
                  <button
                    onClick={() => handleToggleInscricao(cargo.id, cargo.cargoId)}
                    disabled={toggleLoading === cargo.cargoId}
                    className="text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 sm:py-2 rounded-lg transition-all border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-red-500 hover:border-red-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {toggleLoading === cargo.cargoId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Remover Inscrição'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleInscricao(cargo.id, cargo.cargoId)}
                    disabled={toggleLoading === cargo.cargoId}
                    className="text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 sm:py-2 rounded-lg transition-all border border-indigo-100/60 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {toggleLoading === cargo.cargoId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Marcar Inscrição'}
                  </button>
                )}

                <button
                  onClick={() => handleStartProva(cargo.cargoId)}
                  className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-2.5 sm:py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-indigo-200/50 active:scale-95 border border-indigo-700/10"
                >
                  Resolver Prova
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}