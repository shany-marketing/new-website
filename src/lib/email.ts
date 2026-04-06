import nodemailer from "nodemailer";

let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transport;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const from = `UpStar <${process.env.GMAIL_USER || "omri@up5star.com"}>`;
  await getTransport().sendMail({ from, to, subject, html });
}
