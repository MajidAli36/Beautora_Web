import { FaqJsonLd } from "@/components/seo/json-ld";

export function FaqSection({
  path,
  faqs,
  title = "Frequently asked questions",
}: {
  path: string;
  faqs: readonly { question: string; answer: string }[];
  title?: string;
}) {
  if (!faqs.length) return null;

  return (
    <section className="border-t border-[var(--m-line)] bg-[var(--m-mist)] py-16 sm:py-20">
      <FaqJsonLd path={path} faqs={faqs} />
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)]">
          {title}
        </h2>
        <dl className="mt-8 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="text-base font-semibold text-[var(--m-ink)]">{faq.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
