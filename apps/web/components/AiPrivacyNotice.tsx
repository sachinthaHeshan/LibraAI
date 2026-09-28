/** Settings card explaining how the AI assistant handles data. Keep in sync with docs/responsible-ai.md. */
export function AiPrivacyNotice({ isMember }: { isMember: boolean }) {
  return (
    <section aria-labelledby="ai-privacy-heading" className="card px-5 py-5 sm:px-6">
      <h2 className="mb-3 text-base font-bold text-ink" id="ai-privacy-heading">
        AI assistant and your data
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-ink">
        <li>
          Chat replies are written by an AI model using only this library&apos;s catalog and your own
          account. They can be wrong, so check important details.
        </li>
        <li>
          Emails, phone numbers, and card numbers in your messages are masked before they reach the
          AI. The assistant is never given members&apos; contact details.
        </li>
        <li>
          Requests to delete records in bulk, change permissions, export personal data, or see other
          libraries are declined before the AI runs.
        </li>
        <li>
          Each AI request is logged for this library&apos;s owners with a fingerprint of the message,
          not the message itself.
        </li>
        <li>Your chat history is kept in this browser. Clearing site data removes it.</li>
        {isMember ? (
          <li>
            &quot;Recommended for you&quot; uses only your reading preferences and loan history, never
            personal traits like age or gender.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
