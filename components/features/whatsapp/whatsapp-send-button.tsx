"use client";

import { buildWhatsAppSendUrl } from "@/lib/whatsapp/links";
import { buildCustomerThanksMessage } from "@/lib/whatsapp/thanks-message";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

type WhatsAppSendButtonProps = {
  phone: string;
  customerName?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
};

export function WhatsAppSendButton({
  phone,
  customerName,
  variant = "outline",
  size = "sm",
}: WhatsAppSendButtonProps) {
  function openChat() {
    const body = buildCustomerThanksMessage({ fullName: customerName });
    const url = buildWhatsAppSendUrl(phone, body);

    if (!url) {
      notify.error("Invalid phone number for WhatsApp.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={openChat}>
      <MessageCircle className="mr-1.5 size-4" />
      Send WhatsApp
    </Button>
  );
}
