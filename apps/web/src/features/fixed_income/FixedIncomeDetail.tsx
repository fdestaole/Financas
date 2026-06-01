import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { formatBRL } from "@/lib/utils";
import {
  type TipoOperacaoRF,
  useAddOperation,
  useDeleteOperation,
  useDeleteProduct,
  useFixedIncomeProduct,
} from "./api";
import { OPERACAO_LABEL, taxaLabel } from "./format";

const hoje = () => new Date().toISOString().slice(0, 10);

interface Props {
  productId: string;
  onClose: () => void;
}

function Linha({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-text-3">{label}</span>
      <span className={`tnum text-sm ${strong ? "font-semibold text-text" : "text-text-2"}`}>
        {value}
      </span>
    </div>
  );
}

export function FixedIncomeDetail({ productId, onClose }: Props) {
  const { data: product, isLoading } = useFixedIncomeProduct(productId);
  const { data: accounts } = useBankAccounts();
  const addOp = useAddOperation(productId);
  const delOp = useDeleteOperation();
  const delProduct = useDeleteProduct();

  const [opTipo, setOpTipo] = useState<TipoOperacaoRF | null>(null);
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(hoje());
  const [bankAccountId, setBankAccountId] = useState("");

  if (isLoading || !product) return <p className="text-sm text-text-3">Carregando…</p>;

  const submitOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opTipo) return;
    addOp.mutate(
      {
        tipo: opTipo,
        valor,
        data,
        bank_account_id: opTipo === "AJUSTE_SALDO" ? null : bankAccountId || null,
      },
      {
        onSuccess: () => {
          setOpTipo(null);
          setValor(0);
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs text-text-3">
          {taxaLabel(product.indexador, product.taxa)}
          {product.emissor ? ` · ${product.emissor}` : ""}
        </div>
        <div className="mt-2 rounded-lg border border-border bg-surface-2/40 p-3">
          <Linha label="Capital aplicado" value={formatBRL(product.capital_liquido)} />
          <Linha label="Rendimento bruto" value={formatBRL(product.rendimento_bruto)} />
          <Linha label="Saldo bruto" value={formatBRL(product.saldo_bruto)} strong />
          <div className="my-1 border-t border-border" />
          <Linha label={`IR (${Number(product.aliquota_ir)}%)`} value={`- ${formatBRL(product.imposto)}`} />
          <Linha label="Saldo líquido" value={formatBRL(product.saldo_liquido)} strong />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["APORTE", "RESGATE", "AJUSTE_SALDO"] as TipoOperacaoRF[]).map((t) => (
          <Button
            key={t}
            type="button"
            variant={opTipo === t ? "primary" : "secondary"}
            onClick={() => setOpTipo(opTipo === t ? null : t)}
          >
            {OPERACAO_LABEL[t]}
          </Button>
        ))}
      </div>

      {opTipo && (
        <form onSubmit={submitOp} className="space-y-3 rounded-lg border border-border p-3">
          <div>
            <Label>{opTipo === "AJUSTE_SALDO" ? "Novo saldo" : "Valor"}</Label>
            <MoneyInput value={valor} onChange={setValor} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            {opTipo !== "AJUSTE_SALDO" && (
              <div>
                <Label>Conta</Label>
                <Select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                  <option value="">— Sem conta —</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={addOp.isPending || valor <= 0}>
              Confirmar {OPERACAO_LABEL[opTipo].toLowerCase()}
            </Button>
          </div>
        </form>
      )}

      <div>
        <div className="mb-2 text-sm font-medium text-text">Histórico</div>
        {product.operacoes.length === 0 ? (
          <p className="text-sm text-text-3">Nenhuma operação ainda.</p>
        ) : (
          <ul className="space-y-1">
            {product.operacoes.map((op) => (
              <li
                key={op.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <span className="text-sm text-text">{OPERACAO_LABEL[op.tipo]}</span>
                  <span className="ml-2 text-xs text-text-3">{op.data}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum text-sm text-text-2">{formatBRL(op.valor)}</span>
                  <button
                    type="button"
                    className="text-text-3 hover:text-neg"
                    aria-label="Excluir operação"
                    onClick={() => delOp.mutate(op.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-between border-t border-border pt-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => delProduct.mutate(product.id, { onSuccess: onClose })}
        >
          <Trash2 size={14} /> Excluir produto
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
