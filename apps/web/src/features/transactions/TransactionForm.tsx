import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input, Select, Label } from "@/components/ui/Input";
import { errorMessage } from "@/lib/api";
import { todayISO } from "@/lib/utils";
import { useBankAccounts } from "@/features/bank_accounts/api";
import { useCreditCards } from "@/features/credit_cards/api";
import { useCategories } from "@/features/categories/api";
import { useCreateTransaction, type TipoTransacao, type TxIn } from "./api";

interface Props {
  onSuccess: () => void;
  initialTipo?: TipoTransacao;
}

const FORM_TIPOS = ["DESPESA", "RECEITA", "TRANSFERENCIA", "COMPRA_CARTAO"] as const;
type FormTipo = (typeof FORM_TIPOS)[number];

const TIPOS: { value: FormTipo; label: string }[] = [
  { value: "DESPESA", label: "Despesa" },
  { value: "RECEITA", label: "Receita" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "COMPRA_CARTAO", label: "Compra no cartão" },
];

const schema = z
  .object({
    tipo: z.enum(["DESPESA", "RECEITA", "TRANSFERENCIA", "COMPRA_CARTAO"]),
    descricao: z.string().trim().min(1, "Informe a descrição"),
    valor: z.number().positive("Valor deve ser maior que zero"),
    data: z.string().min(1, "Informe a data"),
    bank_account_id: z.string().optional(),
    bank_account_origem_id: z.string().optional(),
    bank_account_destino_id: z.string().optional(),
    credit_card_id: z.string().optional(),
    category_id: z.string().optional(),
    parcelas: z.number().int().min(1).max(120),
    recorrente: z.boolean(),
    observacao: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if ((val.tipo === "RECEITA" || val.tipo === "DESPESA") && !val.bank_account_id) {
      ctx.addIssue({ path: ["bank_account_id"], code: "custom", message: "Selecione a conta" });
    }
    if (val.tipo === "TRANSFERENCIA") {
      if (!val.bank_account_origem_id) {
        ctx.addIssue({
          path: ["bank_account_origem_id"],
          code: "custom",
          message: "Selecione a origem",
        });
      }
      if (!val.bank_account_destino_id) {
        ctx.addIssue({
          path: ["bank_account_destino_id"],
          code: "custom",
          message: "Selecione o destino",
        });
      }
      if (
        val.bank_account_origem_id &&
        val.bank_account_origem_id === val.bank_account_destino_id
      ) {
        ctx.addIssue({
          path: ["bank_account_destino_id"],
          code: "custom",
          message: "Origem e destino devem ser diferentes",
        });
      }
    }
    if (val.tipo === "COMPRA_CARTAO" && !val.credit_card_id) {
      ctx.addIssue({
        path: ["credit_card_id"],
        code: "custom",
        message: "Selecione o cartão",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-neg">{message}</p>;
}

export function TransactionForm({ onSuccess, initialTipo }: Props) {
  const { data: accounts } = useBankAccounts();
  const { data: cards } = useCreditCards();
  const { data: categories } = useCategories();
  const create = useCreateTransaction();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo:
        initialTipo && (FORM_TIPOS as readonly string[]).includes(initialTipo)
          ? (initialTipo as FormTipo)
          : "DESPESA",
      descricao: "",
      valor: 0,
      data: todayISO(),
      bank_account_id: "",
      bank_account_origem_id: "",
      bank_account_destino_id: "",
      credit_card_id: "",
      category_id: "",
      parcelas: 1,
      recorrente: false,
      observacao: "",
    },
  });

  const tipo = watch("tipo");
  const valor = watch("valor");
  const parcelas = watch("parcelas");

  const defaultAccountId = accounts?.find((a) => a.padrao)?.id ?? "";
  useEffect(() => {
    if (!defaultAccountId) return;
    if (!getValues("bank_account_id")) setValue("bank_account_id", defaultAccountId);
    if (!getValues("bank_account_origem_id")) setValue("bank_account_origem_id", defaultAccountId);
  }, [defaultAccountId, getValues, setValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      const base = {
        descricao: values.descricao,
        valor: values.valor,
        data: values.data,
        observacao: values.observacao || undefined,
      };
      let payload: TxIn;
      if (values.tipo === "RECEITA") {
        payload = {
          tipo: "RECEITA",
          ...base,
          bank_account_id: values.bank_account_id || "",
          category_id: values.category_id || undefined,
        };
      } else if (values.tipo === "DESPESA") {
        payload = {
          tipo: "DESPESA",
          ...base,
          bank_account_id: values.bank_account_id || "",
          category_id: values.category_id || undefined,
        };
      } else if (values.tipo === "TRANSFERENCIA") {
        payload = {
          tipo: "TRANSFERENCIA",
          ...base,
          bank_account_origem_id: values.bank_account_origem_id || "",
          bank_account_destino_id: values.bank_account_destino_id || "",
        };
      } else {
        payload = {
          tipo: "COMPRA_CARTAO",
          ...base,
          credit_card_id: values.credit_card_id || "",
          category_id: values.category_id || undefined,
          parcelas: values.parcelas,
          recorrente: values.parcelas > 1 ? false : values.recorrente,
        };
      }
      await create.mutateAsync(payload);
      toast.success("Lançamento criado");
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const cats = categories?.filter((c) =>
    tipo === "RECEITA" ? c.tipo === "RECEITA" : c.tipo === "DESPESA",
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Tipo</Label>
        <Select {...register("tipo")}>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Descrição</Label>
        <Input {...register("descricao")} />
        <FieldError message={errors.descricao?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Valor</Label>
          <Controller
            control={control}
            name="valor"
            render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
          />
          <FieldError message={errors.valor?.message} />
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" {...register("data")} />
          <FieldError message={errors.data?.message} />
        </div>
      </div>

      {(tipo === "RECEITA" || tipo === "DESPESA") && (
        <>
          <div>
            <Label>Conta</Label>
            <Select {...register("bank_account_id")}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
            <FieldError message={errors.bank_account_id?.message} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select {...register("category_id")}>
              <option value="">Sem categoria</option>
              {cats?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
        </>
      )}

      {tipo === "TRANSFERENCIA" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>De</Label>
            <Select {...register("bank_account_origem_id")}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
            <FieldError message={errors.bank_account_origem_id?.message} />
          </div>
          <div>
            <Label>Para</Label>
            <Select {...register("bank_account_destino_id")}>
              <option value="">Selecione...</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
            <FieldError message={errors.bank_account_destino_id?.message} />
          </div>
        </div>
      )}

      {tipo === "COMPRA_CARTAO" && (
        <>
          <div>
            <Label>Cartão</Label>
            <Select {...register("credit_card_id")}>
              <option value="">Selecione...</option>
              {cards?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
            <FieldError message={errors.credit_card_id?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Parcelas</Label>
              <Input
                type="number"
                min={1}
                max={120}
                {...register("parcelas", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select {...register("category_id")}>
                <option value="">Sem categoria</option>
                {categories
                  ?.filter((c) => c.tipo === "DESPESA")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
          {parcelas > 1 && valor > 0 && (
            <p className="text-xs text-text-3">
              {parcelas}x de aproximadamente R$ {(valor / parcelas).toFixed(2).replace(".", ",")}
            </p>
          )}
          {parcelas <= 1 && (
            <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("recorrente")}
                className="accent-accent h-4 w-4"
              />
              Compra fixa (recorrente)
            </label>
          )}
        </>
      )}

      <div>
        <Label>Observação</Label>
        <Input {...register("observacao")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
