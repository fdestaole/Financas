import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Stat } from "@/components/ui/Stat";
import { AreaChartCard } from "@/components/charts/AreaChartCard";
import { MiniAccountCard } from "@/features/bank_accounts/MiniAccountCard";
import { formatBRL } from "@/lib/utils";
import { useEvolucaoSaldo, useGastosPorCategoria, useResumo } from "./api";

export function DashboardPage() {
  const { data: resumo } = useResumo();
  const { data: gastos } = useGastosPorCategoria();
  const { data: evolucao } = useEvolucaoSaldo(6);

  const evolucaoData = evolucao?.map((p) => ({ mes: p.mes, saldo: Number(p.saldo) })) ?? [];
  const evolucaoSpark = evolucaoData.map((p) => p.saldo);
  const totalGastos = gastos?.reduce((s, g) => s + Number(g.total), 0) ?? 0;
  const variacaoCarteira = Number(resumo?.variacao_carteira ?? 0);
  const valorInvestido = Number(resumo?.valor_investido ?? 0);
  const variacaoPct = valorInvestido > 0 ? variacaoCarteira / valorInvestido : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Visão geral das suas finanças"
        meta={<span className="text-xs text-text-3">Resumo do mês corrente</span>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="Saldo total"
          value={formatBRL(resumo?.saldo_total)}
          spark={evolucaoSpark.length > 1 ? evolucaoSpark : undefined}
          featured
        />
        <KpiCard
          label="Receitas (mês)"
          value={formatBRL(resumo?.receitas_mes)}
          tone="pos"
        />
        <KpiCard
          label="Despesas (mês)"
          value={formatBRL(resumo?.despesas_mes)}
          tone="neg"
        />
        <KpiCard
          label="Faturas em aberto"
          value={formatBRL(resumo?.faturas_em_aberto)}
        />
      </div>

      {resumo?.contas_resumo && resumo.contas_resumo.length > 0 && (
        <Card padding="none" className="mb-4">
          <CardHeader>
            <CardTitle>Minhas contas</CardTitle>
            <span className="text-xs text-text-3">{resumo.contas_resumo.length} contas</span>
          </CardHeader>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumo.contas_resumo.map((acc) => (
              <MiniAccountCard key={acc.id} account={acc} />
            ))}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Card padding="none" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução do saldo</CardTitle>
            <span className="text-xs text-text-3">últimos 6 meses</span>
          </CardHeader>
          <CardBody>
            <AreaChartCard data={evolucaoData} xKey="mes" yKey="saldo" />
          </CardBody>
        </Card>

        <Card padding="none">
          <CardHeader>
            <CardTitle>Top categorias</CardTitle>
            <span className="text-xs text-text-3">mês</span>
          </CardHeader>
          <CardBody className="space-y-3">
            {gastos?.slice(0, 5).map((g) => (
              <div key={g.nome}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-2">{g.nome}</span>
                  <span className="tnum text-text">{formatBRL(g.total)}</span>
                </div>
                <ProgressBar value={Number(g.total)} max={totalGastos || 1} color={g.cor ?? undefined} />
              </div>
            )) ?? <span className="text-sm text-text-3">Sem dados</span>}
          </CardBody>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader>
          <CardTitle>Patrimônio investido</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Stat label="Investido" value={formatBRL(resumo?.valor_investido)} />
            <Stat label="Atual" value={formatBRL(resumo?.patrimonio_investido)} />
            <Stat
              label="Variação"
              value={formatBRL(resumo?.variacao_carteira)}
              tone={variacaoCarteira >= 0 ? "pos" : "neg"}
              description={
                valorInvestido > 0
                  ? `${(variacaoPct * 100).toFixed(2).replace(".", ",")}% no período`
                  : undefined
              }
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
