import twilio from "twilio";

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio account SID or auth token is missing.");
  }

  return twilio(accountSid, authToken);
}

export function formatSmsPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `+1${digits}` : phone;
}

export async function sendSMS(to: string, body: string) {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error("Twilio phone number is missing.");

  const formatted = formatSmsPhone(to);
  if (formatted === formatSmsPhone(from)) {
    throw new Error("Twilio cannot send an SMS from your Twilio number to that same number.");
  }

  return getClient().messages.create({
    to: formatted,
    from,
    body,
  });
}

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
};
