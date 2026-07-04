"use client";

import {
  formatPrice,
  parseDollarAmount,
  clampDiscount,
  effectivePrice,
  type ServiceConfig,
} from "@/lib/services";
import { useAdmin } from "../data";
import { Field, TextArea, ImageField, Repeater, SaveBar, EditorPanel, Hint } from "../forms";

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function ContentView() {
  const { content, setContent, saveContent, saving, saveMessage } = useAdmin();

  return (
    <div className="space-y-6">
      <EditorPanel title="Services & prices" hint="Full price only — customers pay it via Venmo or in store.">
        <Repeater
          items={content.serviceConfigs}
          empty={{ name: "Fade", amount: 3000, duration: "45 min", desc: "", detail: "" }}
          addLabel="Add service"
          onChange={(serviceConfigs) => setContent({ ...content, serviceConfigs })}
          render={(item, update) => <ServiceEditor service={item} update={update} />}
        />
      </EditorPanel>

      <EditorPanel title="Homepage images" hint="Paste direct image URLs (uploaded links, Supabase Storage, or public image files).">
        <ImageField label="Hero image" value={content.heroImageUrl} onChange={(heroImageUrl) => setContent({ ...content, heroImageUrl })} />
        <ImageField label="Barber photo" value={content.barberPhotoUrl} onChange={(barberPhotoUrl) => setContent({ ...content, barberPhotoUrl })} />
        <ImageField label="About photo" value={content.aboutImageUrl} onChange={(aboutImageUrl) => setContent({ ...content, aboutImageUrl })} />
      </EditorPanel>

      <EditorPanel title="Homepage essentials">
        <Field label="Barber name" value={content.barberName} onChange={(barberName) => setContent({ ...content, barberName })} />
        <TextArea label="Barber bio" value={content.barberBio} onChange={(barberBio) => setContent({ ...content, barberBio })} />
        <Field
          label="Specialties (comma separated)"
          value={content.specialties.join(", ")}
          onChange={(v) => setContent({ ...content, specialties: splitList(v) })}
        />
      </EditorPanel>

      <EditorPanel title="Gallery">
        <Repeater
          items={content.gallery}
          empty={{ title: "", imageUrl: "", caption: "" }}
          addLabel="Add photo"
          onChange={(gallery) => setContent({ ...content, gallery })}
          render={(item, update) => (
            <>
              <Field label="Title" value={item.title} onChange={(title) => update({ ...item, title })} />
              <ImageField label="Image" value={item.imageUrl} onChange={(imageUrl) => update({ ...item, imageUrl })} />
              <TextArea label="Caption" value={item.caption} onChange={(caption) => update({ ...item, caption })} rows={2} />
            </>
          )}
        />
      </EditorPanel>

      <EditorPanel title="Reviews, location & socials">
        <Repeater
          items={content.testimonials}
          empty={{ quote: "", name: "" }}
          addLabel="Add review"
          onChange={(testimonials) => setContent({ ...content, testimonials })}
          render={(item, update) => (
            <>
              <TextArea label="Quote" value={item.quote} onChange={(quote) => update({ ...item, quote })} rows={2} />
              <Field label="Name" value={item.name} onChange={(name) => update({ ...item, name })} />
            </>
          )}
        />
        <Field label="Address / service area" value={content.address} onChange={(address) => setContent({ ...content, address })} />
        <Field label="Map URL" value={content.mapUrl} onChange={(mapUrl) => setContent({ ...content, mapUrl })} />
        <TextArea label="Parking note" value={content.parkingNote} onChange={(parkingNote) => setContent({ ...content, parkingNote })} rows={2} />
        <Field label="Instagram URL" value={content.instagramUrl} onChange={(instagramUrl) => setContent({ ...content, instagramUrl })} />
        <Field label="TikTok URL" value={content.tiktokUrl} onChange={(tiktokUrl) => setContent({ ...content, tiktokUrl })} />
        <Field label="Venmo link" value={content.venmoUrl} onChange={(venmoUrl) => setContent({ ...content, venmoUrl })} />
      </EditorPanel>

      <EditorPanel title="Offers">
        <TextArea label="Loyalty offer" value={content.loyaltyOffer} onChange={(loyaltyOffer) => setContent({ ...content, loyaltyOffer })} rows={2} />
        <TextArea label="Referral offer" value={content.referralOffer} onChange={(referralOffer) => setContent({ ...content, referralOffer })} rows={2} />
      </EditorPanel>

      <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
    </div>
  );
}

function ServiceEditor({ service, update }: { service: ServiceConfig; update: (s: ServiceConfig) => void }) {
  const pct = clampDiscount(service.discountPercent);
  return (
    <>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 140px" }}>
        <Field label="Service name" value={service.name} onChange={(name) => update({ ...service, name: name as ServiceConfig["name"] })} />
        <Field label="Price" value={formatPrice(service.amount)} onChange={(value) => update({ ...service, amount: parseDollarAmount(value) })} />
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 140px" }}>
        <Field label="Duration" value={service.duration} onChange={(duration) => update({ ...service, duration })} />
        <Field
          label="Discount % (0–90)"
          type="number"
          value={pct ? String(pct) : ""}
          onChange={(value) => update({ ...service, discountPercent: clampDiscount(Number(value.replace(/[^0-9]/g, ""))) })}
        />
      </div>
      {pct > 0 && (
        <Hint>
          <b style={{ color: "var(--a-accent-quiet)" }}>{pct}% off</b> — customers pay{" "}
          <b>{formatPrice(effectivePrice(service))}</b>{" "}
          <span style={{ textDecoration: "line-through", color: "var(--a-text-3)" }}>{formatPrice(service.amount)}</span>
        </Hint>
      )}
      <TextArea label="Short description" value={service.desc} onChange={(desc) => update({ ...service, desc })} rows={2} />
      <TextArea label="Detail" value={service.detail} onChange={(detail) => update({ ...service, detail })} rows={2} />
    </>
  );
}
