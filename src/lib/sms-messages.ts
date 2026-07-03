export const SMS = {
  otp: (code: string) =>
    `Your SRT Cuts verification code is: ${code}. Expires in 10 minutes.`,

  bookingCreatedCustomer: (name: string, service: string, date: string, time: string) =>
    `Hey ${name}! Your SRT Cuts booking for a ${service} on ${date} at ${time} is pending confirmation. We'll let you know soon. — SRT`,

  bookingCreatedAdmin: (name: string, phone: string, service: string, date: string, time: string) =>
    `New booking request!\n${name} (${phone}) wants ${service} on ${date} at ${time}.\nManage: ${process.env.NEXT_PUBLIC_SITE_URL}/admin`,

  bookingAccepted: (name: string, service: string, date: string, time: string) =>
    `You're confirmed! Your SRT Cuts ${service} is set for ${date} at ${time}. See you then! — SRT`,

  bookingDenied: (name: string, service: string, date: string, time: string) =>
    `Hi ${name}, we can't accommodate your ${service} on ${date} at ${time}. Please rebook at ${process.env.NEXT_PUBLIC_SITE_URL}. Sorry for the inconvenience! — SRT`,

  bookingCancelledAdmin: (name: string, phone: string, service: string, date: string, time: string) =>
    `Booking cancelled.\n${name} (${phone}) cancelled their ${service} on ${date} at ${time}.\nManage: ${process.env.NEXT_PUBLIC_SITE_URL}/admin`,

  bookingRescheduledAdmin: (
    name: string,
    phone: string,
    service: string,
    oldDate: string,
    oldTime: string,
    newDate: string,
    newTime: string
  ) =>
    `Booking moved.\n${name} (${phone}): ${service} was ${oldDate} at ${oldTime} → now ${newDate} at ${newTime}. Needs re-confirm.\nManage: ${process.env.NEXT_PUBLIC_SITE_URL}/admin`,
};
