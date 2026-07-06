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

  bookingAccepted: (name: string, service: string, date: string, time: string) =>
    `You're confirmed! Your SRT Cuts ${service} is set for ${date} at ${time}. See you then! — SRT`,

  bookingDenied: (name: string, service: string, date: string, time: string) =>
    `Hi ${name}, we can't accommodate your ${service} on ${date} at ${time}. Please rebook another time — sorry for the inconvenience! — SRT`,

  // Admin moved an existing booking to a new slot. No re-confirm needed — the
  // shop initiated it, so the new time is already set.
  bookingMovedCustomer: (name: string, service: string, date: string, time: string) =>
    `Hi ${name}, your SRT Cuts ${service} has been moved to ${date} at ${time}. See you then! — SRT`,

  bookingCancelledAdmin: (name: string, phone: string, service: string, date: string, time: string) =>
    `Booking cancelled.\n${name} (${phone}) cancelled their ${service} on ${date} at ${time}.\nOpen your admin panel to review.`,

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
