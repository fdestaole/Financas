from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BusinessRuleError, NotFoundError
from app.db.enums import StatusTransacao, TipoOperacaoRF, TipoTransacao
from app.db.models import (
    BankAccount,
    FixedIncomeOperation,
    FixedIncomeProduct,
    Transaction,
)
from app.modules.fixed_income import calc
from app.modules.fixed_income.schemas import OperacaoRFIn, ProductIn, ProductUpdate
from app.modules.fixed_income.settings_service import get_settings


def _ensure_account(db: Session, user_id: str, account_id: str) -> BankAccount:
    acc = db.scalar(
        select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user_id)
    )
    if not acc:
        raise NotFoundError("Conta não encontrada")
    return acc


def get_product(db: Session, user_id: str, product_id: str) -> FixedIncomeProduct:
    p = db.scalar(
        select(FixedIncomeProduct).where(
            FixedIncomeProduct.id == product_id, FixedIncomeProduct.user_id == user_id
        )
    )
    if not p:
        raise NotFoundError("Produto não encontrado")
    return p


def list_products(
    db: Session, user_id: str, *, incluir_arquivados: bool = False
) -> list[FixedIncomeProduct]:
    stmt = (
        select(FixedIncomeProduct)
        .where(FixedIncomeProduct.user_id == user_id)
        .order_by(FixedIncomeProduct.nome)
    )
    if not incluir_arquivados:
        stmt = stmt.where(FixedIncomeProduct.arquivado.is_(False))
    return list(db.scalars(stmt))


def list_operations(db: Session, user_id: str, product_id: str) -> list[FixedIncomeOperation]:
    return list(
        db.scalars(
            select(FixedIncomeOperation)
            .where(
                FixedIncomeOperation.user_id == user_id,
                FixedIncomeOperation.product_id == product_id,
            )
            .order_by(FixedIncomeOperation.data)
        )
    )


def calcular(
    db: Session, user_id: str, product: FixedIncomeProduct, ref: date | None = None
) -> calc.ResultadoRF:
    ops = list_operations(db, user_id, product.id)
    cdi = get_settings(db, user_id).cdi_mensal
    return calc.calcular_posicao(
        ops,
        indexador=product.indexador,
        taxa=product.taxa,
        cdi_mensal=cdi,
        data_aplicacao=product.data_aplicacao,
        ir_isento=product.ir_isento,
        ref=ref,
    )


def _saldo_disponivel(db: Session, user_id: str, product: FixedIncomeProduct) -> Decimal:
    return calcular(db, user_id, product).saldo_bruto


def create_product(db: Session, user_id: str, data: ProductIn) -> FixedIncomeProduct:
    if data.bank_account_id:
        _ensure_account(db, user_id, data.bank_account_id)
    product = FixedIncomeProduct(
        user_id=user_id,
        nome=data.nome,
        tipo=data.tipo,
        indexador=data.indexador,
        taxa=data.taxa,
        data_aplicacao=data.data_aplicacao,
        data_vencimento=data.data_vencimento,
        bank_account_id=data.bank_account_id,
        emissor=data.emissor,
        ir_isento=data.ir_isento,
        liquidez_diaria=data.liquidez_diaria,
        observacao=data.observacao,
    )
    db.add(product)
    db.flush()

    if data.aporte_inicial:
        _registrar_operacao(
            db,
            user_id,
            product,
            OperacaoRFIn(
                tipo=TipoOperacaoRF.APORTE,
                valor=data.aporte_inicial.valor,
                data=data.aporte_inicial.data,
                bank_account_id=data.aporte_inicial.bank_account_id or data.bank_account_id,
            ),
        )
    db.commit()
    db.refresh(product)
    return product


def update_product(
    db: Session, user_id: str, product_id: str, data: ProductUpdate
) -> FixedIncomeProduct:
    product = get_product(db, user_id, product_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def _criar_transacao_perna(
    db: Session, user_id: str, product: FixedIncomeProduct, op_data: OperacaoRFIn
) -> Transaction | None:
    account_id = op_data.bank_account_id
    if not account_id:
        return None
    _ensure_account(db, user_id, account_id)
    is_aporte = op_data.tipo == TipoOperacaoRF.APORTE
    tx = Transaction(
        user_id=user_id,
        tipo=TipoTransacao.APLICACAO_RF if is_aporte else TipoTransacao.RESGATE_RF,
        descricao=("Aplicação" if is_aporte else "Resgate") + f" — {product.nome}",
        valor=op_data.valor,
        data_competencia=op_data.data,
        data_efetivacao=op_data.data,
        status=StatusTransacao.EFETIVADA,
        bank_account_id=account_id,
        observacao=op_data.observacao,
    )
    db.add(tx)
    db.flush()
    return tx


def _registrar_operacao(
    db: Session, user_id: str, product: FixedIncomeProduct, data: OperacaoRFIn
) -> FixedIncomeOperation:
    if data.tipo == TipoOperacaoRF.RESGATE:
        disponivel = _saldo_disponivel(db, user_id, product)
        if data.valor > disponivel:
            raise BusinessRuleError("Resgate maior que o saldo disponível")

    tx: Transaction | None = None
    if data.tipo in (TipoOperacaoRF.APORTE, TipoOperacaoRF.RESGATE):
        tx = _criar_transacao_perna(db, user_id, product, data)

    op = FixedIncomeOperation(
        user_id=user_id,
        product_id=product.id,
        tipo=data.tipo,
        valor=data.valor,
        data=data.data,
        transaction_id=tx.id if tx else None,
        observacao=data.observacao,
    )
    db.add(op)
    db.flush()
    return op


def adicionar_operacao(
    db: Session, user_id: str, product_id: str, data: OperacaoRFIn
) -> FixedIncomeOperation:
    product = get_product(db, user_id, product_id)
    op = _registrar_operacao(db, user_id, product, data)
    db.commit()
    db.refresh(op)
    return op


def deletar_operacao(db: Session, user_id: str, op_id: str) -> None:
    op = db.scalar(
        select(FixedIncomeOperation).where(
            FixedIncomeOperation.id == op_id, FixedIncomeOperation.user_id == user_id
        )
    )
    if not op:
        raise NotFoundError("Operação não encontrada")
    if op.transaction_id:
        tx = db.get(Transaction, op.transaction_id)
        if tx:
            db.delete(tx)
    db.delete(op)
    db.commit()


def delete_product(db: Session, user_id: str, product_id: str) -> None:
    product = get_product(db, user_id, product_id)
    for op in list_operations(db, user_id, product_id):
        if op.transaction_id:
            tx = db.get(Transaction, op.transaction_id)
            if tx:
                db.delete(tx)
    db.delete(product)
    db.commit()
