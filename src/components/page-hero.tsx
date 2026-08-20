/** Dark banner used at the top of the interior pages. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="relative overflow-hidden bg-ink-black py-16 text-center text-white sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 300px at 50% -20%, rgba(253,185,19,0.18) 0%, transparent 65%)",
        }}
      />
      <div className="shell relative">
        <span className="eyebrow-dark">{eyebrow}</span>
        <h1 className="mx-auto mt-5 max-w-3xl text-[34px] font-bold leading-[1.1] sm:text-[46px]">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
