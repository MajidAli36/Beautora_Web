"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  createPaymentAccount,
  deletePaymentAccount,
  updatePaymentAccount,
} from "@/lib/actions/store-profile";
import {
  PAYMENT_ACCOUNT_TYPE_LABELS,
  type PaymentAccount,
  type PaymentAccountType,
} from "@/lib/store/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPES = Object.keys(PAYMENT_ACCOUNT_TYPE_LABELS) as PaymentAccountType[];

type FormState = {
  accountType: PaymentAccountType;
  label: string;
  accountTitle: string;
  accountNumber: string;
  bankName: string;
  extraNote: string;
};

const emptyForm = (): FormState => ({
  accountType: "JAZZCASH",
  label: "",
  accountTitle: "",
  accountNumber: "",
  bankName: "",
  extraNote: "",
});

function fromAccount(account: PaymentAccount): FormState {
  return {
    accountType: account.account_type,
    label: account.label,
    accountTitle: account.account_title ?? "",
    accountNumber: account.account_number,
    bankName: account.bank_name ?? "",
    extraNote: account.extra_note ?? "",
  };
}

export function StorePaymentAccountsForm({
  accounts,
}: {
  accounts: PaymentAccount[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await createPaymentAccount(form);
    setBusy(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Payment account added");
    setForm(emptyForm());
    router.refresh();
  }

  async function onSaveEdit(e: React.FormEvent, account: PaymentAccount) {
    e.preventDefault();
    setBusy(true);
    const result = await updatePaymentAccount({
      id: account.id,
      ...editForm,
      isActive: account.is_active,
    });
    setBusy(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Account updated");
    setEditId(null);
    router.refresh();
  }

  async function onToggle(account: PaymentAccount) {
    setBusy(true);
    const result = await updatePaymentAccount({
      id: account.id,
      accountType: account.account_type,
      label: account.label,
      accountTitle: account.account_title ?? "",
      accountNumber: account.account_number,
      bankName: account.bank_name ?? "",
      extraNote: account.extra_note ?? "",
      isActive: !account.is_active,
    });
    setBusy(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(account.is_active ? "Hidden from booking" : "Shown on booking");
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this payment account?")) return;
    setBusy(true);
    const result = await deletePaymentAccount(id);
    setBusy(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Account removed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment accounts for online booking</CardTitle>
          <CardDescription>
            Add JazzCash, EasyPaisa, bank, or other wallets. Active accounts appear when
            customers pay a booking advance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accounts yet. Add at least one so bookers know where to send the advance.
            </p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((account) => (
                <li key={account.id} className="rounded-lg border p-4">
                  {editId === account.id ? (
                    <AccountFormFields
                      value={editForm}
                      onChange={setEditForm}
                      onSubmit={(e) => onSaveEdit(e, account)}
                      submitLabel="Save changes"
                      busy={busy}
                      onCancel={() => setEditId(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{account.label}</p>
                          <Badge variant={account.is_active ? "default" : "secondary"}>
                            {PAYMENT_ACCOUNT_TYPE_LABELS[account.account_type]}
                          </Badge>
                          {!account.is_active && <Badge variant="outline">Hidden</Badge>}
                        </div>
                        {account.account_title && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {account.account_title}
                          </p>
                        )}
                        {account.bank_name && (
                          <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                        )}
                        <p className="mt-1 font-mono text-sm">{account.account_number}</p>
                        {account.extra_note && (
                          <p className="mt-2 text-sm text-muted-foreground">{account.extra_note}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            setEditId(account.id);
                            setEditForm(fromAccount(account));
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => onToggle(account)}
                        >
                          {account.is_active ? "Hide" : "Show"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => onDelete(account.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add account</CardTitle>
          <CardDescription>You can add as many accounts as you need.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountFormFields
            value={form}
            onChange={setForm}
            onSubmit={onCreate}
            submitLabel={busy ? "Adding…" : "Add payment account"}
            busy={busy}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AccountFormFields({
  value,
  onChange,
  onSubmit,
  submitLabel,
  busy,
  onCancel,
}: {
  value: FormState;
  onChange: (v: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  busy: boolean;
  onCancel?: () => void;
}) {
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label>Type</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={value.accountType}
          onChange={(e) =>
            onChange({ ...value, accountType: e.target.value as PaymentAccountType })
          }
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {PAYMENT_ACCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Label</Label>
        <Input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="Main JazzCash"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Account title (optional)</Label>
        <Input
          value={value.accountTitle}
          onChange={(e) => onChange({ ...value, accountTitle: e.target.value })}
          placeholder="Name on account"
        />
      </div>
      <div className="space-y-2">
        <Label>Account / wallet number</Label>
        <Input
          value={value.accountNumber}
          onChange={(e) => onChange({ ...value, accountNumber: e.target.value })}
          placeholder="03XXXXXXXXX or IBAN"
          required
        />
      </div>
      {value.accountType === "BANK" && (
        <div className="space-y-2 sm:col-span-2">
          <Label>Bank name</Label>
          <Input
            value={value.bankName}
            onChange={(e) => onChange({ ...value, bankName: e.target.value })}
            placeholder="e.g. HBL, Meezan"
          />
        </div>
      )}
      <div className="space-y-2 sm:col-span-2">
        <Label>Extra note (optional)</Label>
        <Textarea
          value={value.extraNote}
          onChange={(e) => onChange({ ...value, extraNote: e.target.value })}
          rows={2}
          placeholder="Include booking name in the payment note"
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
