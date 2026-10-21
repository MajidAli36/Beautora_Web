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
    <section className="m-section border-t border-[var(--m-line)] bg-[var(--m-paper)]">
      <FaqJsonLd path={path} faqs={faqs} />
      <div className="m-container max-w-3xl">
        <p className="m-eyebrow">FAQ</p>
        <h2 className="mt-3 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[var(--m-ink)]">
          {title}
        </h2>
        <dl className="mt-6 divide-y divide-[var(--m-line)] border-y border-[var(--m-line)] sm:mt-8">
          {faqs.map((faq) => (
            <div key={faq.question} className="py-4 sm:py-5">
              <dt className="text-sm font-semibold text-[var(--m-ink)] sm:text-base">
                {faq.question}
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-[var(--m-muted)]">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
