// NOTE: Textbelt rejects texts containing URLs on unverified keys ("ability to
// send URLs via text is limited to verified accounts"). Keep every message
// link-free — no https://, no bare domains like "srtcuts.hair" — or the send
// fails silently. To restore links, whitelist the key at textbelt.com/whitelist.

export const SMS = {
  otp: (code: string) =>
    `Your SRT Cuts verification code is: ${code}. Expires in 10 minutes.`,

  bookingCreatedCustomer: (name: string, service: string, date: string, time: string) =>
    `Hey ${name}! Your SRT Cuts booking for a ${service} on ${date} at ${time} is pending confirmation. We'll let you know soon. — SRT`,

  bookingCreatedAdmin: (name: string, phone: string, service: string, date: string, time: string) =>
    `New booking request!\n${name} (${phone}) wants ${service} on ${date} at ${time}.\nOpen your admin panel to respond.`,

  // The street address is kept off the public site and only shared here,
  // once a booking is confirmed.
  bookingAccepted: (name: string, service: string, date: string, time: string, address?: string) =>
    `You're confirmed! Your SRT Cuts ${service} is set for ${date} at ${time}.${address ? ` Address: ${address}.` : ""} See you then! — SRT`,

  bookingDenied: (name: string, service: string, date: string, time: string) =>
    `Hi ${name}, we can't accommodate your ${service} on ${date} at ${time}. Please rebook another time — sorry for the inconvenience! — SRT`,

  // Admin moved an existing booking to a new slot. No re-confirm needed — the
  // shop initiated it, so the new time is already set.
  bookingMovedCustomer: (name: string, service: string, date: string, time: string, address?: string) =>
    `Hi ${name}, your SRT Cuts ${service} has been moved to ${date} at ${time}.${address ? ` Address: ${address}.` : ""} See you then! — SRT`,

  bookingCancelledAdmin: (name: string, phone: string, service: string, date: string, time: string) =>
    `Booking cancelled.\n${name} (${phone}) cancelled their ${service} on ${date} at ${time}.\nOpen your admin panel to review.`,

  // 30-minute heads-up, sent by the reminder cron to confirmed bookings only.
  reminderCustomer: (name: string, service: string, time: string, address?: string) =>
    `Hi ${name}, reminder: your SRT Cuts ${service} is coming up at ${time} — about 30 minutes from now.${address ? ` Address: ${address}.` : ""} See you soon! — SRT`,

  reminderAdmin: (name: string, phone: string, service: string, time: string) =>
    `Up next in about 30 min: ${name} (${phone}) — ${service} at ${time}.`,

  bookingRescheduledAdmin: (
    name: string,
    phone: string,
    service: string,
    oldDate: string,
    oldTime: string,
    newDate: string,
    newTime: string
  ) =>
    `Booking moved.\n${name} (${phone}): ${service} was ${oldDate} at ${oldTime} → now ${newDate} at ${newTime}. Needs re-confirm.\nOpen your admin panel to respond.`,
};
