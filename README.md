# Studora — Aprovação por eficiência.

**Studora** é um ecossistema de estudo unificado e de alta performance para *concurseiros*. O sistema integra acompanhamento de progresso, resolução de questões e mapeamento estratégico de editais em uma interface clínica, profissional e livre de distrações.

![Studora Dashboard](screenshot.png)

---

## 🧠 Metodologia Clínica

Diferente de plataformas de produtividade genéricas, a Studora segue um modelo de ensino fundamentado em dados e ações concretas:

- **Loop de Retenção Ativa:** O aluno deve escrever uma justificativa para cada resposta antes de revelar o gabarito. Isso força o raciocínio lógico sobre a alternativa escolhida.
- **Análise Heurística de Comportamento:** O motor de analytics identifica padrões como *Speed Risk* (respostas rápidas com acerto baixo), *Zona de Conforto* (gap entre questões autorais e de banca) e *Stale Content* (conteúdo sem revisão há mais de 30 dias).
- **Domínio por Dificuldade:** Métricas segmentadas por nível percebido (Fácil, Médio, Difícil, Chute) para calibrar a autoavaliação do aluno.

---

## 💻 Ecossistema do Aluno

### Navegação Principal

| Rota | Descrição |
|------|-----------|
| `/praticar` | Bateria de questões com filtros avançados (Banca, Instituição, Área, Nível). Suporte a questões autorais. |
| `/simulados` | Geração de simulados com configuração em 3 etapas: Estrutura → Conteúdo → Filtros. |
| `/simulados/[id]` | Execução do simulado com timer por questão e navegação livre entre questões. |
| `/provas/executar` | Simulação de prova real a partir de um concurso específico. Timer integrado e rastreamento de dificuldade percebida. |
| `/concursos` | Catálogo de editais com gestão de inscrições, visualização de cargos e link para o edital oficial. |
| `/concursos/[concursoId]/cargos/[cargoId]` | Detalhe do cargo com análise estratégica do edital (motor heurístico). |
| `/disciplinas/[id]` | Árvore de progressão: Disciplina → Temas → Subtemas com estatísticas de domínio por tópico. |
| `/desempenho` | Dashboard analítico com gráficos de evolução (Recharts), taxa de acerto por disciplina, consistência diária e detalhamento modal (F/M/D/Chute). |
| `/perfil` | Dados do usuário e estatísticas gerais. |
| `/configuracoes` | Preferências do sistema. |

---

## 🔍 Motor de Análise Heurística

O componente `EditalAnalysisReport.tsx`processa os Subtemas do edital e gera uma análise contextualizada. Calcula um *Readiness Score* (0-100), detecta padrões de risco (Speed Risk, Zona de Conforto, Stale Content) e gera recomendações priorizadas por urgência. A análise muda dinamicamente com base na data da prova e no status de inscrição.

---

## 🎛️ Painel Administrativo (`/admin`)

Sistema completo de curadoria e gestão de entidades:

| Módulo | Função |
|--------|--------|
| `/admin/bancas` | Gestão de bancas organizadoras (FGV, Cebraspe, FCC, etc.) |
| `/admin/instituicoes` | Gestão de órgãos e instituições (PF, PRF, STF, etc.) |
| `/admin/cargos` | Cadastro de cargos por área e nível |
| `/admin/concursos` | Vinculação de editais, datas de prova e vagas |
| `/admin/disciplinas` | Criação e ordenação da árvore de disciplinas |
| `/admin/temas` | Subtemas dentro de cada disciplina |
| `/admin/subtemas` | Granularidade máxima do conteúdo programático |
| `/admin/questoes` | Curadoria de questões com múltiplas alternativas, fundamentação teórica e tags de dificuldade |

---

## 🛠️ Stack Técnica

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript 5
- **Estilização:** Tailwind CSS 4
- **Ícones:** Lucide React
- **Formulários:** React Hook Form + React Select (Async)
- **Visualização de Dados:** Recharts
- **Tipografia:** Plus Jakarta Sans (UI) + JetBrains Mono (dados/tabular-nums)
- **Package Manager:** Bun

---

## ⚙️ Começando

```bash
# Instalar dependências
bun install

# Iniciar servidor de desenvolvimento
bun dev

# Gerar build de produção
bun build

# Iniciar servidor de produção
bun start
```

O aplicativo será servido em `http://localhost:3000`.

---

## 📂 Estrutura do Projeto

```
src/
├── app/                           # Next.js App Router
│   ├── admin/                     # 8 módulos de gestão
│   │   ├── bancas/
│   │   ├── instituicoes/
│   │   ├── cargos/
│   │   ├── concursos/
│   │   ├── disciplinas/
│   │   ├── temas/
│   │   ├── subtemas/
│   │   └── questoes/
│   ├── concursos/                # Catálogo de editais
│   │   └── [concursoId]/cargos/[cargoId]/   # Detalhe + análise heurística
│   ├── disciplinas/               # Árvore de progresso
│   ├── desempenho/                # Analytics completo
│   ├── praticar/                  # Bateria de questões
│   ├── simulado[s]/               # Geração e execução
│   ├── provas/executar/           # Simulado real
│   ├── perfil/
│   └── configuracoes/
├── components/
│   ├── ui/                       # PageHeader, StatsBreakdownPanel
│   ├── practice/                 # QuestionCard (componente central)
│   ├── navigation/               # Sidebar, Navbar, AdminSidebar
│   ├── layout/                   # AppShell, BreadcrumbContext
│   └── concursos/                # EditalAnalysisReport (motor heurístico)
├── services/                     # API client layer
├── types/                        # DTOs sincronizados com backend
├── hooks/                        # usePageTitle
└── utils/                        # formatadores (data, nivel, dificuldade)
```

---

## 🔑 Atalhos de Teclado

Na tela de prática (`/praticar` e `/provas/executar`), utilize as teclas A, B, C, D, E para selecionar alternativas rapidamente sem usar o mouse.