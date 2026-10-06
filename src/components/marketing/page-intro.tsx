/** The H1 and one-line intro at the top of a standalone marketing page. */
export function PageIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-16 text-center">
      <h1 className="text-h1 text-(--color-text-primary)">{title}</h1>
      <p className="mt-4 text-body-lg text-(--color-text-secondary)">{description}</p>
    </div>
  );
}
