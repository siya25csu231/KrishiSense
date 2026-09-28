"use client";

import { useState } from "react";
import { UserCircle2, Check } from "lucide-react";
import { profileApi, authApi, ApiError } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, Field, TextInput, Select, Badge, ErrorState } from "@/components/ui";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
const SOILS = ["Loamy", "Clay", "Clay loam", "Sandy", "Sandy loam", "Silt", "Black (Regur)", "Red", "Laterite", "Alluvial"];

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useState(() => {
    (async () => {
      try {
        const res = await authApi.me();
        setUser(res.user);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not load profile.");
      }
    })();
  });

  const save = async () => {
    setError(null);
    setSaved(false);
    try {
      const res = await profileApi.update({
        ...user,
        farmSizeAcres: user.farmSizeAcres ? Number(user.farmSizeAcres) : null,
      });
      setUser(res.user);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
    }
  };

  if (error && !user) return <ErrorState message={error} />;
  if (!user) return null;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUser((u: any) => ({ ...u, [k]: e.target.value }));
    setSaved(false);
  };

  return (
    <div>
      <PageHeader
        kicker="Profile"
        title="Your profile & preferences"
        sub="Location and farm details personalize every advisory across the platform."
        right={<Badge tone="green">{user.email}</Badge>}
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="animate-rise">
          <CardHeader title="Personal" icon={<UserCircle2 size={16} />} />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Full name"><TextInput value={user.name ?? ""} onChange={set("name")} /></Field>
              </div>
              <Field label="Preferred language">
                <Select value={user.language ?? "en"} onChange={set("language")}>
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </Select>
              </Field>
              <Field label="State">
                <Select value={user.state ?? ""} onChange={set("state")}>
                  <option value="">—</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="District"><TextInput value={user.district ?? ""} onChange={set("district")} /></Field>
              <Field label="Village / City"><TextInput value={user.village ?? ""} onChange={set("village")} /></Field>
            </div>
          </CardBody>
        </Card>

        <Card className="animate-rise-1">
          <CardHeader title="Farm" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Farm size (acres)">
                <TextInput type="number" step="0.1" min="0.1" value={user.farmSizeAcres ?? ""} onChange={(e) => { setUser((u: any) => ({ ...u, farmSizeAcres: e.target.value })); setSaved(false); }} />
              </Field>
              <Field label="Soil type">
                <Select value={user.soilType ?? ""} onChange={set("soilType")}>
                  <option value="">—</option>
                  {SOILS.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Preferred crops" hint="Comma separated, e.g. Wheat, Mustard">
                  <TextInput value={user.preferredCrops ?? ""} onChange={set("preferredCrops")} />
                </Field>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} size="lg">Save changes</Button>
        {saved && <span className="flex items-center gap-1 text-sm font-bold text-leaf"><Check size={15} /> Saved</span>}
      </div>
    </div>
  );
}
