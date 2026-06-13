import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { type IndexadorRF, type ProductIn, type TipoProdutoRF, useCreateProduct } from "./api";

const TIPOS: { value: TipoProdutoRF; label: string }[] = [
  { value: "CAIXINHA", label: "Caixinha" },
  { value: "CDB", label: "CDB" },
  { value: "LCI", label: "LCI" },
  { value: "LCA", label: "LCA" },
  { value: "LC", label: "LC" },
  { value: "TESOURO_SELIC", label: "Tesouro Selic" },
  { value: "TESOURO_PRE", label: "Tesouro Prefixado" },
  { value: "TESOURO_IPCA", label: "Tesouro IPCA+" },
  { value: "DEBENTURE", label: "Debênture" },
  { value: "OUTRO", label: "Outro" },
];

const INDEXADORES: IndexadorRF[] = ["CDI", "PRE", "IPCA", "SELIC"];

const hoje = () => new Date().toISOString().slice(0, 10);

interface Props {
  onSuccess: () => void;
}

export function FixedIncomeForm({ onSuccess }: Props) {
  const { data: accounts } = useBankAccounts();
  const create = useCreateProduct();

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoProdutoRF>("CAIXINHA");
  const [indexador, setIndexador] = useState<IndexadorRF>("CDI");
  const [taxa, setTaxa] = useState(100);
  const [dataAplicacao, setDataAplicacao] = useState(hoje());
  const [dataVencimento, setDataVencimento] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [emissor, setEmissor] = useState("");
  const [irIsento, setIrIsento] = useState(false);
  const [liquidezDiaria, setLiquidezDiaria] = useState(true);
  const [aporteInicial, setAporteInicial] = useState(0);

  const taxaLabel =
    indexador === "CDI" || indexador === "SELIC" ? "% do indexador" : "Taxa (% a.a.)";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ProductIn = {
      nome,
      tipo,
      indexador,
      taxa,
      data_aplicacao: dataAplicacao,
      data_vencimento: dataVencimento || null,
      bank_account_id: bankAccountId || null,
      emissor: emissor || null,
      ir_isento: irIsento,
      liquidez_diaria: liquidezDiaria,
      aporte_inicial:
        aporteInicial > 0
          ? { valor: aporteInicial, data: dataAplicacao, bank_account_id: bankAccountId || null }
          : null,
    };
    create.mutate(payload, { onSuccess });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoProdutoRF)}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Indexador</Label>
          <Select value={indexador} onChange={(e) => setIndexador(e.target.value as IndexadorRF)}>
            {INDEXADORES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{taxaLabel}</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={taxa}
            onChange={(e) => setTaxa(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Emissor</Label>
          <Input value={emissor} onChange={(e) => setEmissor(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data de aplicação</Label>
          <Input
            type="date"
            required
            value={dataAplicacao}
            onChange={(e) => setDataAplicacao(e.target.value)}
          />
        </div>
        <div>
          <Label>Vencimento (opcional)</Label>
          <Input
            type="date"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Conta de origem</Label>
        <Select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
          <option value="">— Sem vínculo —</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Aporte inicial (opcional)</Label>
        <MoneyInput value={aporteInicial} onChange={setAporteInicial} />
        {aporteInicial > 0 && !bankAccountId && (
          <p className="mt-1 text-xs text-text-3">
            Sem conta de origem, o aporte não debita nenhuma conta.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input
            type="checkbox"
            checked={irIsento}
            onChange={(e) => setIrIsento(e.target.checked)}
          />
          Isento de IR (LCI/LCA)
        </label>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input
            type="checkbox"
            checked={liquidezDiaria}
            onChange={(e) => setLiquidezDiaria(e.target.checked)}
          />
          Liquidez diária
        </label>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Salvando…" : "Criar produto"}
        </Button>
      </div>
    </form>
  );
}
