"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  createWhatsAppTemplate,
  deleteWhatsAppTemplate,
  setDefaultWhatsAppTemplate,
  updateWhatsAppTemplate,
  type WhatsAppSalonContext,
  type WhatsAppTemplate,
} from "@/lib/actions/whatsapp-templates";
import type { WhatsAppCustomer } from "@/lib/actions/whatsapp";
import { buildWhatsAppSendUrl } from "@/lib/whatsapp/links";
import {
  renderWhatsAppTemplate,
  TEMPLATE_PLACEHOLDERS,
} from "@/lib/whatsapp/templates";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CustomerPicker } from "@/components/features/customers/customer-picker";

function customerName(customer: WhatsAppCustomer) {
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ");
}

export function SendWhatsAppForm({
  customers,
  templates: initialTemplates,
  salon,
}: {
  customers: WhatsAppCustomer[];
  templates: WhatsAppTemplate[];
  salon: WhatsAppSalonContext;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const defaultId =
    initialTemplates.find((t) => t.is_default)?.id ?? initialTemplates[0]?.id ?? "";
  const [templateId, setTemplateId] = useState(defaultId);
  const [messageOverride, setMessageOverride] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTemplates(initialTemplates);
    if (!initialTemplates.some((t) => t.id === templateId)) {
      setTemplateId(
        initialTemplates.find((t) => t.is_default)?.id ?? initialTemplates[0]?.id ?? ""
      );
    }
  }, [initialTemplates, templateId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customerId, customers]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? templates[0],
    [templateId, templates]
  );
  const [templateQ, setTemplateQ] = useState("");
  const filteredTemplates = useMemo(() => {
    const term = templateQ.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.body.toLowerCase().includes(term) ||
        (t.is_default ? "default" : "").includes(term)
    );
  }, [templates, templateQ]);

  const renderedMessage = useMemo(() => {
    if (!selectedTemplate) return "";
    return renderWhatsAppTemplate(selectedTemplate.body, {
      firstName: selectedCustomer?.first_name,
      fullName: selectedCustomer ? customerName(selectedCustomer) : null,
      salonName: salon.name,
      phone: salon.phone,
      address: salon.address,
    });
  }, [selectedTemplate, selectedCustomer, salon]);

  const message = messageOverride ?? renderedMessage;

  useEffect(() => {
    setMessageOverride(null);
  }, [templateId, customerId]);

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(template: WhatsAppTemplate) {
    setEditing(template);
    setEditorOpen(true);
  }

  async function handleSetDefault(id: string) {
    const result = await setDefaultWhatsAppTemplate(id);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Default template updated");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this template?")) return;
    const result = await deleteWhatsAppTemplate(id);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Template deleted");
    router.refresh();
  }

  function openWhatsApp() {
    const url = selectedCustomer
      ? buildWhatsAppSendUrl(selectedCustomer.phone, message)
      : null;
    if (!url) {
      notify.error("Select a customer with a valid phone number.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (customers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No customers with phone numbers found. Add a customer phone number first.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Message template</Label>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add template
          </Button>
        </div>

        <Input
          type="search"
          placeholder="Search templates…"
          value={templateQ}
          onChange={(e) => setTemplateQ(e.target.value)}
          className="max-w-sm"
          aria-label="Search WhatsApp templates"
        />
        <div className="space-y-2">
          {!filteredTemplates.length ? (
            <p className="text-sm text-muted-foreground">No templates match your search.</p>
          ) : null}
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors",
                template.id === templateId
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background"
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setTemplateId(template.id)}
              >
                <span className="block text-sm font-medium text-foreground">
                  {template.name}
                  {template.is_default && (
                    <span className="ml-2 text-[11px] font-medium text-amber-700">
                      Default
                    </span>
                  )}
                </span>
                <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {template.body.replace(/\s+/g, " ").slice(0, 90)}
                  {template.body.length > 90 ? "…" : ""}
                </span>
              </button>
              <div className="flex items-center gap-1">
                {!template.is_default && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title="Make default"
                    onClick={() => handleSetDefault(template.id)}
                  >
                    <Star className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  title="Edit"
                  onClick={() => openEdit(template)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  title="Delete"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wa_customer">Customer</Label>
        <CustomerPicker
          id="wa_customer"
          customers={customers}
          value={customerId}
          onValueChange={setCustomerId}
          required
          placeholder="Search customer name or phone…"
          limit={20}
        />
      </div>

      <div className="rounded-lg bg-muted/40 p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Customer:</span>{" "}
          <strong>{selectedCustomer ? customerName(selectedCustomer) : "—"}</strong>
        </p>
        <p className="mt-1">
          <span className="text-muted-foreground">Phone:</span>{" "}
          <strong>{selectedCustomer?.phone ?? "—"}</strong>
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="wa_message">Message</Label>
          {messageOverride !== null && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setMessageOverride(null)}
            >
              Reset to template
            </button>
          )}
        </div>
        <Textarea
          id="wa_message"
          value={message}
          onChange={(e) => setMessageOverride(e.target.value)}
          rows={12}
          className="min-h-48 font-sans text-sm leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">
          Edit before sending if needed. Placeholders are already filled for this customer.
        </p>
      </div>

      <Button type="button" onClick={openWhatsApp}>
        Send WhatsApp
      </Button>
      <p className="text-xs text-muted-foreground">
        WhatsApp will open with this message filled in. Click Send there to deliver it.
      </p>

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editing}
        saving={saving}
        onSave={async (values) => {
          setSaving(true);
          const result = editing
            ? await updateWhatsAppTemplate({
                id: editing.id,
                name: values.name,
                body: values.body,
                makeDefault: values.makeDefault,
              })
            : await createWhatsAppTemplate({
                name: values.name,
                body: values.body,
                makeDefault: values.makeDefault,
              });
          setSaving(false);
          if (result.error) {
            notify.error(result.error);
            return;
          }
          notify.success(editing ? "Template updated" : "Template created");
          setEditorOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WhatsAppTemplate | null;
  saving: boolean;
  onSave: (values: {
    name: string;
    body: string;
    makeDefault: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setBody(template?.body ?? defaultNewBody());
    setMakeDefault(template?.is_default ?? false);
  }, [open, template]);

  function insertPlaceholder(token: string) {
    setBody((current) => `${current}${current.endsWith("\n") || !current ? "" : " "}${token}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "Add template"}</DialogTitle>
          <DialogDescription>
            Use placeholders so each customer gets a personal message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl_name">Template name</Label>
            <Input
              id="tpl_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thank you, Appointment reminder"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl_body">Message</Label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PLACEHOLDERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => insertPlaceholder(item.key)}
                  className="rounded-md border bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                  title={item.label}
                >
                  {item.key}
                </button>
              ))}
            </div>
            <Textarea
              id="tpl_body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="min-h-52 font-mono text-xs leading-relaxed"
              maxLength={4000}
            />
            <p className="text-xs text-muted-foreground">{body.length}/4000</p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="size-4 accent-primary"
            />
            Set as default template
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => onSave({ name, body, makeDefault })}
          >
            {saving ? "Saving…" : template ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultNewBody() {
  return `Assalam o Alaikum {{first_name}},

Thank you for choosing *{{salon_name}}*. We hope to see you again soon.

Warm regards,
Team {{salon_name}}`;
}
