import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { getWhatsAppCustomers } from "@/lib/actions/whatsapp";
import { getWhatsAppTemplates } from "@/lib/actions/whatsapp-templates";
import { canUseWhatsApp } from "@/lib/auth/permissions";
import { SendWhatsAppForm } from "@/components/features/whatsapp/send-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function WhatsAppPage() {
  const canAccess = await canUseWhatsApp();
  if (!canAccess) redirect("/dashboard");

  const [customers, { templates, salon }] = await Promise.all([
    getWhatsAppCustomers(),
    getWhatsAppTemplates(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Pick a template, choose a customer, and open WhatsApp with the message ready."
      />

      <Card>
        <CardHeader>
          <CardTitle>Send to customer</CardTitle>
          <CardDescription>
            Add and edit your own templates. Placeholders like {"{{first_name}}"} fill in
            automatically for each guest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SendWhatsAppForm
            customers={customers}
            templates={templates}
            salon={salon}
          />
        </CardContent>
      </Card>
    </div>
  );
}
