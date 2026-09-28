import { Landmark, ExternalLink, Info } from "lucide-react";
import { SCHEMES } from "@/server/services";
import { Card, CardBody, Badge } from "@/components/ui";
import { PageHeader } from "@/components/layout";

export default function SchemesPage() {
  return (
    <div>
      <PageHeader
        kicker="Government Schemes"
        title="Schemes for farmers"
        sub="Curated summaries with official portals. KrishiSense does not process applications — apply only via the official sites."
        right={<Badge tone="sky">informational</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {SCHEMES.map((s, i) => (
          <Card key={s.name} className={`animate-rise-${Math.min(i, 3)}`}>
            <CardBody>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-skysoft text-sky">
                  <Landmark size={16} />
                </span>
                <div>
                  <p className="font-display text-[16px] font-bold">{s.name}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-leaf">{s.tagline}</p>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-inksoft">{s.description}</p>
              <dl className="mt-3 space-y-2 text-[13px]">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-inkfaint">Eligibility</dt>
                  <dd className="leading-relaxed">{s.eligibility}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-inkfaint">Benefits</dt>
                  <dd className="leading-relaxed">{s.benefits}</dd>
                </div>
              </dl>
              <a
                href={s.portal}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-leaf hover:underline"
              >
                Official portal <ExternalLink size={12} />
              </a>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex gap-2 rounded-xl border border-sky/30 bg-skysoft px-4 py-3 text-[12px] leading-relaxed text-sky">
        <Info size={15} className="mt-0.5 shrink-0" />
        <p>Details are indicative summaries for awareness. Always verify eligibility and deadlines on the official portal or with your district agriculture office.</p>
      </div>
    </div>
  );
}
