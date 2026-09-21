"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Link2, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  defaultHtml?: string;
  className?: string;
  placeholder?: string;
};

export function MarketplaceRichTextEditor({
  name,
  defaultHtml = "",
  className,
  placeholder = "Describe your product…",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const sync = useCallback(() => {
    if (!ref.current || !hiddenRef.current) return;
    const html = ref.current.innerHTML.trim();
    hiddenRef.current.value = html === "<br>" ? "" : html;
  }, []);

  useEffect(() => {
    if (ref.current && defaultHtml) {
      ref.current.innerHTML = defaultHtml;
      sync();
    }
  }, [defaultHtml, sync]);

  function cmd(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  function addLink() {
    const url = window.prompt("Link URL");
    if (!url) return;
    cmd("createLink", url);
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-background", className)}>
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => cmd("bold")} aria-label="Bold">
          <Bold className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => cmd("italic")} aria-label="Italic">
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => cmd("underline")}
          aria-label="Underline"
        >
          <Underline className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => cmd("insertUnorderedList")}
          aria-label="Bullet list"
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => cmd("insertOrderedList")}
          aria-label="Numbered list"
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={addLink} aria-label="Link">
          <Link2 className="size-4" />
        </Button>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        className="min-h-[160px] px-4 py-3 text-sm leading-relaxed outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
        onInput={sync}
        onBlur={sync}
        suppressContentEditableWarning
      />
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultHtml} />
    </div>
  );
}
